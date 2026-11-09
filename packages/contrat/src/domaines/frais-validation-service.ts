import type { FraisFictif, JeuFrais } from '../../../donnees-fictives/src/frais.js';
import { centimes, type Centimes } from '../../../noyau/src/argent/index.js';
import { demanderValidation } from '../../../noyau/src/ecritures/etats.js';
import type { Ecriture } from '../../../noyau/src/ecritures/modele.js';
import { calculerAnnee } from '../../../noyau/src/frais/ik-annee.js';
import { lireBaremeIk, lireMajoration } from '../../../noyau/src/frais/bareme-ik.js';
import { dateEcriture, type PeriodeFrais } from '../../../noyau/src/frais/date-ecriture.js';
import { proposerEcritureDepense } from '../../../noyau/src/frais/ecriture-depense.js';
import { proposerEcritureTrajet } from '../../../noyau/src/frais/ecriture-ik.js';
import { manquants } from '../../../noyau/src/frais/justificatifs.js';
import { preparerRemboursement, type Personne } from '../../../noyau/src/frais/remboursement.js';
import { passer } from '../../../noyau/src/frais/statuts.js';
import { kmRetenus } from '../../../noyau/src/frais/trajet.js';
import { traiterTvaFrais } from '../../../noyau/src/frais/tva-frais.js';
import { ErreurFrais, type ComptesFrais, type Frais, type Trajet, type Vehicule } from '../../../noyau/src/frais/types.js';
import type { z } from 'zod';
import type { CorpsRemboursement, CorpsValidation, EcritureProposee, RemboursementPrepare, ValidationFrais } from './frais-validation.js';
import { conflitBanque } from './frais-actions-service.js';
export type CodeValidation = 'FRAIS_INCONNU' | 'ENTREE_INVALIDE' | 'CLE_REUTILISEE' | 'FRAIS_PAYE_SOCIETE' | 'JUSTIFICATIF_MANQUANT' | 'BAREME_A_VERIFIER' | 'REMBOURSEMENT_SUPERIEUR' | 'RECAPITULATIF_A_CONFIRMER';
export class ErreurValidation extends Error {
  override name = 'ErreurValidation';
  constructor(readonly code: CodeValidation, readonly totalCentimes?: number) { super(code); }
}
/** Réglages lus dans la configuration du serveur (jamais écrits dans le contrat). */
export interface ConfigValidation {
  comptes: ComptesFrais;
  journal: string;
  periodes: readonly PeriodeFrais[];
  seuilLotNombre: number;
  seuilLotMontantCentimes: number;
  delaiAnnulationMs: number;
  maintenant: () => number;
}
const CLE_BAREME = 'bareme_ik_voiture';
const CLE_MAJORATION = 'bareme_ik_majoration_electrique';
const ANNEE = 4;
const refuser = (code: CodeValidation, total?: number): never => { throw new ErreurValidation(code, total); };
const noyau = (f: FraisFictif): Frais => ({ ...f, montantTtc: centimes(f.montantTtc), tva: centimes(f.tva), partPersoTtc: centimes(f.partPersoTtc) }) as unknown as Frais;
const CODES_NOYAU: Readonly<Record<string, CodeValidation>> = { frais_paye_societe: 'FRAIS_PAYE_SOCIETE', justificatif_manquant: 'JUSTIFICATIF_MANQUANT', motif_obligatoire: 'JUSTIFICATIF_MANQUANT', bareme_a_verifier: 'BAREME_A_VERIFIER', remboursement_superieur: 'REMBOURSEMENT_SUPERIEUR' };
/** Service en mémoire sur le jeu partagé : propose les écritures, valide un lot, prépare un remboursement. Aucun virement. */
export function creerServiceFraisValidation(jeu: JeuFrais, config: ConfigValidation) {
  const rejeux = new Map<string, { empreinte: string; reponse: unknown }>();
  const remboursements: RemboursementPrepare[] = [];
  const garde = <T>(calcul: () => T): T => {
    try { return calcul(); } catch (e) { throw e instanceof ErreurFrais ? new ErreurValidation(CODES_NOYAU[e.code] ?? 'ENTREE_INVALIDE') : e; }
  };
  const unefois = <T>(cle: string, empreinte: string, calcul: () => T): T => {
    const vu = rejeux.get(cle);
    if (vu !== undefined) return vu.empreinte === empreinte ? (vu.reponse as T) : refuser('CLE_REUTILISEE');
    const reponse = garde(calcul);
    return rejeux.set(cle, { empreinte, reponse }), reponse;
  };
  const parametre = (cle: string, date: string) => jeu.parametres.find((p) => p.cle === cle && p.effet_debut <= date && (p.effet_fin === null || date < p.effet_fin));
  /** Montant du trajet : barème de l'année, cumul des trajets précédents ; barème non validé = refus. */
  const montantTrajet = (f: FraisFictif): Centimes => {
    const [bareme, majoration] = [parametre(CLE_BAREME, f.dateDepense), parametre(CLE_MAJORATION, f.dateDepense)];
    if (bareme?.statut !== 'valide' || majoration?.statut !== 'valide') return refuser('BAREME_A_VERIFIER');
    const annee = f.dateDepense.slice(0, ANNEE);
    const lignes = jeu.trajets.flatMap((t) => {
      const fr = jeu.frais.find((x) => x.id === t.fraisId);
      const v = jeu.vehicules.find((x) => x.id === t.vehiculeId);
      return fr === undefined || v === undefined || fr.dateDepense.slice(0, ANNEE) !== annee || fr.statut === 'refuse' ? [] : [{ fraisId: t.fraisId, personneId: fr.personneId, vehiculeId: t.vehiculeId, date: fr.dateDepense, kmRetenusDixiemes: kmRetenus(t), electrique: v.energie === 'electrique', puissanceCv: v.puissanceCv }];
    });
    const montant = calculerAnnee(lignes, { statut: bareme.statut, bareme: lireBaremeIk(bareme.valeur), majorationPourcent: lireMajoration(majoration.valeur) }).montants.get(f.id);
    return montant ?? refuser('BAREME_A_VERIFIER');
  };
  /** Construit l'écriture proposée d'un frais sans rien écrire. Ordre : inconnu, banque, justificatif, barème. */
  const construire = (id: string): { frais: FraisFictif; ecriture: Ecriture; montant: Centimes } => {
    const f = jeu.frais.find((x) => x.id === id) ?? refuser('FRAIS_INCONNU');
    if (conflitBanque(jeu, id) !== undefined || f.payeur === 'societe') refuser('FRAIS_PAYE_SOCIETE');
    if (f.statut !== 'propose' && f.statut !== 'a_completer') refuser('ENTREE_INVALIDE');
    const t: Trajet | undefined = jeu.trajets.find((x) => x.fraisId === id);
    const v: Vehicule | undefined = t === undefined ? undefined : (jeu.vehicules.find((x) => x.id === t.vehiculeId) as Vehicule | undefined);
    if (manquants(noyau(f), { ...(t === undefined ? {} : { trajet: t }), ...(v === undefined ? {} : { vehicule: v }) }).length > 0) refuser('JUSTIFICATIF_MANQUANT');
    const date = dateEcriture(f.dateDepense, config.periodes).date;
    const entete = { id: 'ECR-' + id, journal: config.journal, date };
    if (f.nature === 'trajet') {
      const montant = montantTrajet(f);
      const ecriture = proposerEcritureTrajet(montant, config.comptes, { ...entete, libelle: f.libelle });
      return ecriture === null ? refuser('ENTREE_INVALIDE') : { frais: f, ecriture, montant };
    }
    const tva = traiterTvaFrais({ nature: f.categorieDepense ?? '', tvaLue: centimes(f.tva), ticketAuNomDeLaPersonne: false, justificatifPerdu: f.justificatifPerdu, estIk: false }, undefined);
    return { frais: f, ecriture: proposerEcritureDepense(noyau(f), tva, config.comptes, entete), montant: centimes(f.montantTtc - f.partPersoTtc) };
  };
  const vue = (e: Ecriture, fraisId: string): EcritureProposee => ({ id: e.id, fraisId, date: e.date, statut: 'propose',
    lignes: e.lignes.map((l) => ({ compte: l.compte, libelle: l.libelle, debitCentimes: l.debit, creditCentimes: l.credit })) });
  return {
    proposer: (id: string, cle: string): EcritureProposee => unefois(`proposer|${cle}`, id, () => vue(construire(id).ecriture, id)),
    /** `personne` vient de `X-Personne` (obligatoire). Tout est contrôlé avant la première écriture. */
    valider(corps: z.infer<typeof CorpsValidation>, personne: string, cle: string): z.infer<typeof ValidationFrais>[] {
      return unefois(`valider|${personne}|${cle}`, JSON.stringify(corps), () => {
        const lot = corps.ids.map(construire);
        if (lot.some((x) => x.frais.statut !== 'propose')) refuser('ENTREE_INVALIDE');
        const total = lot.reduce((s, x) => s + x.montant, 0);
        if ((lot.length > config.seuilLotNombre || total > config.seuilLotMontantCentimes) && corps.confirmeRecapitulatif !== true) refuser('RECAPITULATIF_A_CONFIRMER', total);
        const maintenant = config.maintenant();
        return lot.map(({ frais, ecriture }) => {
          const demande = demanderValidation(ecriture, maintenant, config.delaiAnnulationMs);
          const suivant = passer(noyau(frais), 'valide', { parPersonne: personne });
          jeu.frais[jeu.frais.indexOf(frais)] = Object.assign({}, frais, { statut: 'valide', version: suivant.version, ecritureId: ecriture.id }) as FraisFictif;
          return { fraisId: frais.id, ecritureId: demande.ecritureId, annulableAvant: demande.echeance };
        });
      });
    },
    /** Prépare seulement : aucun ordre de paiement, statut `propose`. */
    preparer(corps: z.infer<typeof CorpsRemboursement>, cle: string): RemboursementPrepare {
      return unefois(`preparer|${cle}`, JSON.stringify(corps), () => {
        const p = jeu.personnes.find((x) => x.id === corps.personneId) ?? refuser('ENTREE_INVALIDE');
        const personne: Personne = { id: p.id, qualite: p.role === 'associee' ? 'associe' : 'dirigeant_non_associe' };
        const r = preparerRemboursement(personne, jeu.frais.map(noyau), corps.fraisIds, corps.montantCentimes === undefined ? undefined : centimes(corps.montantCentimes));
        const id = 'REM-' + String(remboursements.length + 1).padStart(3, '0');
        for (const fid of r.fraisIds) Object.assign(jeu.frais.find((x) => x.id === fid) as object, { remboursementId: id });
        const prepare: RemboursementPrepare = { id, personneId: p.id, fraisIds: r.fraisIds, montantCentimes: r.montant, statut: 'propose' };
        return remboursements.push(prepare), prepare;
      });
    },
  };
}
export type ServiceFraisValidation = ReturnType<typeof creerServiceFraisValidation>;
