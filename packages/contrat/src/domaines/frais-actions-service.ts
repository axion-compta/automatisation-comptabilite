import { genererFrais, type FraisFictif, type JeuFrais, type VehiculeFrais } from '../../../donnees-fictives/src/frais.js';
import { centimes } from '../../../noyau/src/argent/index.js';
import { refuserDoublon, verifierInvariants } from '../../../noyau/src/frais/invariants.js';
import { determinerPayeur, type ResultatPayeur } from '../../../noyau/src/frais/payeur.js';
import { manquants } from '../../../noyau/src/frais/justificatifs.js';
import { passer, peutPasser, TRANSITIONS } from '../../../noyau/src/frais/statuts.js';
import { admissibilite, lireKmDixiemes } from '../../../noyau/src/frais/trajet.js';
import { ErreurFrais, type Frais, type StatutFrais, type Trajet, type Vehicule } from '../../../noyau/src/frais/types.js';
import type { CompletementFrais, NouveauFrais } from './frais-actions.js';
import type { FraisDetail } from './frais.js';
import { creerServiceFrais } from './frais-service.js';

export type CodeActions = 'FRAIS_INCONNU' | 'VERSION_PERIMEE' | 'FRAIS_VALIDE' | 'DOUBLON_PIECE' | 'VEHICULE_SOCIETE' | 'PERSONNE_DIFFERENTE' | 'CLE_REUTILISEE' | 'ENTREE_INVALIDE';

export class ErreurActions extends Error {
  override name = 'ErreurActions';
  constructor(readonly code: CodeActions) {
    super(code);
  }
}

/** Réglage d'essai fictif, à lire dans les paramètres datés du serveur réel. */
export const FENETRE_ESSAI = { jours: 3 } as const;
/** Relevé bancaire fictif importé dans le jeu d'essai (à lire du serveur réel). */
export const RELEVE_ESSAI = true;
const CLE_BAREME = 'bareme_ik_voiture';
const fige = (s: string): boolean => s === 'valide' || (TRANSITIONS.valide as readonly string[]).includes(s);

const refuser = (code: CodeActions): never => { throw new ErreurActions(code); };
const noyau = (f: FraisFictif): Frais => ({ ...f, montantTtc: centimes(f.montantTtc), tva: centimes(f.tva), partPersoTtc: centimes(f.partPersoTtc) }) as unknown as Frais;
const fictif = (f: Frais): FraisFictif => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as unknown as FraisFictif;
/** Service en mémoire (par instance) : création et complément d'un frais. Toute décision vient du noyau. */
export function creerServiceFraisActions(options: { jeu?: JeuFrais; fenetreJours?: number; releveImporte?: boolean } = {}) {
  const jeu = options.jeu ?? genererFrais();
  const fenetreJours = options.fenetreJours ?? FENETRE_ESSAI.jours;
  const releveImporte = options.releveImporte ?? RELEVE_ESSAI;
  const rejeux = new Map<string, { empreinte: string; reponse: FraisDetail }>();

  const lire = (id: string): FraisDetail => creerServiceFrais(jeu).lire(id) ?? refuser('FRAIS_INCONNU');
  const unefois = (cle: string, empreinte: string, calcul: () => FraisDetail): FraisDetail => {
    const vu = rejeux.get(cle);
    if (vu !== undefined) return vu.empreinte === empreinte ? vu.reponse : refuser('CLE_REUTILISEE');
    const reponse = calcul();
    return rejeux.set(cle, { empreinte, reponse }), reponse;
  };
  const garde = <T>(calcul: () => T): T => {
    try { return calcul(); } catch (e) { throw e instanceof ErreurFrais ? new ErreurActions(e.code === 'doublon_piece' ? 'DOUBLON_PIECE' : 'ENTREE_INVALIDE') : e; }
  };
  const payeur = (f: Frais, declaration: 'personne' | 'societe' | undefined): ResultatPayeur => {
    const prises = new Set(jeu.frais.filter((x) => x.id !== f.id && x.statut !== 'refuse' && x.ligneBanqueId !== undefined).map((x) => x.ligneBanqueId));
    const r = determinerPayeur({
      ticket: { montantTtc: f.montantTtc, date: f.dateDepense },
      ...(declaration === undefined ? {} : { declaration }),
      lignes: jeu.lignesBanque.filter((l) => !prises.has(l.id)).map((l) => ({ id: l.id, date: l.date, montant: centimes(Math.abs(l.montantCentimes)), sens: l.montantCentimes < 0 ? ('debit' as const) : ('credit' as const), libelle: l.libelle, compte: l.carteId })),
      cartesSociete: jeu.cartesSociete.map((c) => c.id),
      releveImporte,
      fenetreJours,
    });
    return r.statut === 'propose' && manquants(f).length > 0 ? { ...r, statut: 'a_completer' } : r;
  };
  const baremeValide = (date: string): boolean =>
    jeu.parametres.some((p) => p.cle === CLE_BAREME && p.statut === 'valide' && p.effet_debut <= date && (p.effet_fin === null || date < p.effet_fin));
  const vehiculePour = (id: string, personne: string, trajet: Trajet): Vehicule => {
    const v: VehiculeFrais & { carteGrisePieceId?: string } = jeu.vehicules.find((x) => x.id === id) ?? refuser('ENTREE_INVALIDE');
    if (v.personneId !== personne) refuser('PERSONNE_DIFFERENTE');
    const vehicule: Vehicule = { id: v.id, personneId: v.personneId, puissanceCv: v.puissanceCv, energie: v.energie, proprietaire: v.proprietaire, categorie: v.categorie, ...(v.carteGrisePieceId === undefined ? {} : { carteGrisePieceId: v.carteGrisePieceId }) };
    const a = admissibilite({ ...trajet, vehiculeId: id }, vehicule);
    if (a.etat === 'refuse') refuser(a.code === 'vehicule_societe' ? 'VEHICULE_SOCIETE' : 'ENTREE_INVALIDE');
    return vehicule;
  };
  const avecPayeur = (f: Frais, r: ResultatPayeur): Frais => ({ ...f, payeur: r.payeur, ...(r.source === undefined ? {} : { sourcePayeur: r.source }), ...(r.ligneBanqueId === undefined ? {} : { ligneBanqueId: r.ligneBanqueId }) });
  return {
    /** `personne` vient de l'en-tête d'essai : on ne déclare que pour soi. */
    creer(corps: NouveauFrais, personne: string, cle: string): FraisDetail {
      if (corps.personneId !== personne) refuser('PERSONNE_DIFFERENTE');
      return unefois(`creer|${personne}|${cle}`, JSON.stringify(corps), () => garde(() => {
        const id = 'FRA-' + String(jeu.frais.length + 1).padStart(3, '0');
        const base: Frais = { id, personneId: personne, nature: corps.nature, dateDepense: corps.date, libelle: '', montantTtc: centimes(0), tva: centimes(0), payeur: 'a_confirmer', statut: 'brouillon', justificatifPerdu: false, partPersoTtc: centimes(0), version: 0 };
        let f: Frais;
        let trajetNouveau: Trajet | undefined;
        if (corps.nature === 'depense') {
          f = { ...base, libelle: corps.libelle, montantTtc: centimes(corps.montantTtcCentimes), ...(corps.pieceId === undefined ? {} : { pieceId: corps.pieceId }) };
          refuserDoublon(jeu.frais.map(noyau), f);
          const r = payeur(f, corps.declaration);
          f = passer(avecPayeur(f, r), r.statut);
        } else {
          const t: Trajet = { fraisId: id, vehiculeId: corps.vehiculeId, depart: corps.depart, arrivee: corps.arrivee, motif: corps.motif, kmSaisisDixiemes: lireKmDixiemes(corps.kmTexte), allerRetour: corps.allerRetour === true };
          const vehicule = vehiculePour(corps.vehiculeId, personne, t);
          const pret = admissibilite(t, vehicule).etat === 'calculable' && baremeValide(corps.date);
          // Indemnité kilométrique d'un véhicule personnel : pas de ticket ni de ligne bancaire, donc hors determinerPayeur.
          const b: Frais = { ...base, libelle: `${corps.depart} - ${corps.arrivee}`, payeur: 'personne' };
          f = passer(b, pret && manquants(b, { trajet: t, vehicule }).length === 0 ? 'propose' : 'a_completer');
          trajetNouveau = t;
        }
        verifierInvariants(f);
        if (trajetNouveau !== undefined) jeu.trajets.push(trajetNouveau);
        jeu.frais.push(fictif(f));
        return lire(id);
      }));
    },

    /** `version` vient de `If-Match`. */
    completer(id: string, corps: CompletementFrais, version: number, personne: string, cle: string): FraisDetail {
      const courant = jeu.frais.find((x) => x.id === id) ?? refuser('FRAIS_INCONNU');
      if (courant.personneId !== personne) refuser('PERSONNE_DIFFERENTE');
      return unefois(`completer|${personne}|${cle}`, JSON.stringify([id, version, corps]), () => garde(() => {
        if (fige(courant.statut)) refuser('FRAIS_VALIDE');
        if (courant.version !== version) refuser('VERSION_PERIMEE');
        let f = noyau(courant);
        const position = jeu.frais.indexOf(courant);
        let vehicule: { t: Trajet; id: string } | undefined;
        if (corps.partPersoTtcCentimes !== undefined) {
          if (corps.partPersoTtcCentimes > f.montantTtc) refuser('ENTREE_INVALIDE');
          f = { ...f, partPersoTtc: centimes(corps.partPersoTtcCentimes) };
        }
        if (corps.pieceId !== undefined) {
          f = { ...f, pieceId: corps.pieceId };
          refuserDoublon(jeu.frais.map(noyau), f);
        }
        if (corps.motifSansJustificatif !== undefined) {
          f = { ...f, motifSansJustificatif: corps.motifSansJustificatif, justificatifPerdu: f.nature === 'depense' && f.pieceId === undefined };
        }
        if (corps.vehiculeId !== undefined) {
          const t = jeu.trajets.find((x) => x.fraisId === id) ?? refuser('ENTREE_INVALIDE');
          vehiculePour(corps.vehiculeId, personne, t);
          vehicule = { t, id: corps.vehiculeId };
        }
        let suivant = { ...f, version: f.version + 1 };
        if (corps.declaration !== undefined && f.nature === 'depense') {
          const r = payeur(f, corps.declaration);
          if (r.statut === f.statut) suivant = { ...avecPayeur(f, r), version: f.version + 1 };
          else if (peutPasser(f.statut, r.statut)) suivant = passer(avecPayeur(f, r), r.statut);
          else if (peutPasser(f.statut, 'a_completer' as StatutFrais)) suivant = passer(f, 'a_completer');
        }
        verifierInvariants(suivant);
        if (vehicule !== undefined) vehicule.t.vehiculeId = vehicule.id;
        jeu.frais[position] = fictif(suivant);
        return lire(id);
      }));
    },
  };
}
export type ServiceFraisActions = ReturnType<typeof creerServiceFraisActions>;
