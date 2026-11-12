import { genererCompta, type EcritureCompta, type SocieteCompta } from '../../../donnees-fictives/src/compta.js';
import { genererInterface } from '../../../donnees-fictives/src/interface.js';
import { centimes } from '../../../noyau/src/argent/index.js';
import type { Ecriture } from '../../../noyau/src/ecritures/modele.js';
import type { CodeBloc, Vue } from '../../../noyau/src/interface/types.js';
import { periodeComparaison, periodeDeVue, type ExerciceBorne } from '../../../noyau/src/tableau-de-bord/periodes.js';
import { calculerChiffres, type Chiffres } from '../../../noyau/src/tableau-de-bord/chiffres.js';
import { assemblerTableau, blocTva, type EnveloppeBloc } from '../../../noyau/src/tableau-de-bord/blocs.js';
import { calculerAnneau, type SousIndicateur } from '../../../noyau/src/tableau-de-bord/anneau.js';
import { BLOCS } from './tableau-de-bord.js';
import { creerServiceAlertes } from './alertes-service.js';

export type Profil = 'pleine' | 'vide';
/** Source du nombre « à faire » : par défaut les alertes ouvertes des compteurs du menu (même fonction que `/compteurs`). */
export type OptionsServiceTableau = { nombreAFaire?: () => number };
export type OptionsTableau = { vue?: Vue | undefined; profil?: Profil | undefined };
const eur = (c: number) => ({ centimes: c as number, devise: 'EUR' as const });
const montants = (c: Chiffres) => ({ ca: eur(c.ca), charges: eur(c.charges), resultatProvisoire: eur(c.resultatProvisoire), tresorerie: eur(c.tresorerie), enAttente: { nombre: c.enAttente.nombre, montant: eur(c.enAttente.montant) } });

const versNoyau = (e: EcritureCompta): Ecriture => ({
  id: e.id, journal: e.journal, date: e.date, statut: e.statut === 'validee' ? 'valide' : 'brouillon',
  lignes: e.lignes.map((l) => ({ compte: l.compte, libelle: l.libelle, debit: centimes(l.debitCentimes), credit: centimes(l.creditCentimes) })),
});

/** Service en mémoire pur : tous les calculs viennent du noyau (TB-R1). Le « jour » est celui du jeu fictif. */
export function creerServiceTableauDeBord(options: OptionsServiceTableau = {}) {
  const compta = genererCompta().societes;
  const interfaces = genererInterface().profils;
  const alertes = creerServiceAlertes();
  const nombreAFaire = options.nombreAFaire ?? ((): number => Object.values(alertes.compteurs().body.parEntree).reduce((somme, c) => somme + c.ouvertes, 0));
  const societe = (p: Profil): SocieteCompta => {
    const s = compta.find((x) => x.profil === p);
    if (!s) throw new Error('PROFIL_ABSENT');
    return s;
  };

  function construire(idExercice: string, options: OptionsTableau) {
    const profil = options.profil ?? 'pleine';
    const soc = societe(profil);
    const ex = soc.exercices.find((e) => e.id === idExercice);
    if (!ex) return undefined;
    const ref = interfaces.pleine;
    const jourRef = interfaces[profil].jourDeReference;
    const jour = jourRef < ex.debut ? ex.debut : jourRef > ex.fin ? ex.fin : jourRef;
    const borne = (e: ExerciceBorne): ExerciceBorne => ({ id: e.id, debut: e.debut, fin: e.fin });
    const vue = options.vue ?? 'exercice';
    const periode = periodeDeVue(vue, borne(ex), jour);
    const precedent = soc.exercices.filter((e) => e.fin < ex.debut).sort((a, b) => (a.fin < b.fin ? 1 : -1))[0];
    const comp = periodeComparaison(periode, borne(ex), precedent && borne(precedent));
    const ecritures = soc.ecritures.filter((e) => e.statut === 'validee').map(versNoyau);
    const defs = ref.definitionsDemonstration;
    const chiffres = calculerChiffres(ecritures, periode, defs);
    const vide = ecritures.length === 0;
    const sur = (calcul: () => Record<string, unknown>) => (): Record<string, unknown> | undefined => (vide ? undefined : calcul());
    const calculs: Partial<Record<CodeBloc, () => unknown>> = {
      tresorerie: sur(() => ({ tresorerie: eur(chiffres.tresorerie) })),
      argent_entrant_sortant: sur(() => ({ ca: eur(chiffres.ca), charges: eur(chiffres.charges) })),
      resultat: sur(() => ({ resultatProvisoire: eur(chiffres.resultatProvisoire) })),
      a_faire: sur(() => ({ nombre: nombreAFaire(), enAttente: { nombre: chiffres.enAttente.nombre, montant: eur(chiffres.enAttente.montant) } })),
    };
    const blocs = (assemblerTableau(periode, calculs) as EnveloppeBloc<Record<string, unknown>>[]).map((b) =>
      b.code === 'tva_impots' ? blocTva(periode, 0, () => undefined) : b,
    );
    const regroupement = { pieces: [] as string[], banque: [] as string[], tva: [] as string[] };
    for (const r of ref.regroupement) regroupement[r.arc as keyof typeof regroupement] = r.codes;
    const sous: SousIndicateur[] = vide ? ref.sousIndicateurs.map((s) => ({ code: s.code, absent: true as const })) : ref.sousIndicateurs;
    const anneau = calculerAnneau(sous, regroupement, ref.seuilsDemonstration);
    const comparaison = 'vide' in comp
      ? comp
      : { periode: { debut: comp.debut, fin: comp.fin }, ...(comp.tronquee ? { tronquee: true } : {}), chiffres: montants(calculerChiffres(ecritures, comp, defs)) };
    return { vue, periode, comparaison, chiffres: montants(chiffres), blocs, anneau };
  }

  return {
    /** `undefined` si l'exercice est inconnu. */
    lire: (exercice: string, options: OptionsTableau = {}) => construire(exercice, options),
    /** `undefined` si l'exercice est inconnu ; 'bloc_inconnu' si le code n'existe pas. */
    lireBloc(exercice: string, bloc: string, options: OptionsTableau = {}) {
      if (!(BLOCS as readonly string[]).includes(bloc)) return construire(exercice, options) ? ('bloc_inconnu' as const) : undefined;
      return construire(exercice, options)?.blocs.find((b) => b.code === bloc);
    },
  };
}
