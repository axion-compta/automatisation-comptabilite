// Routes d'écriture du bloc banque (V3-BAN-038, V3-PRI-002, V3-CTL-040, V3-TDB-005) : gestionnaires purs rendant { statut, corps }. Aucun envoi, aucun paiement.
import { ErreurDoublonsSources, confirmerDoublon, type LigneSource } from '../../../../packages/noyau/src/banque/doublons-sources.js';
import { verifierNouveauLien } from '../../../../packages/noyau/src/banque/rapprochement/sommes.js';
import { ErreurValidation, preparerValidation, validerLot } from '../../../../packages/noyau/src/banque/rapprochement/validation.js';
import { ErreurReponses, repondre, type DemandeSuivie } from '../../../../packages/noyau/src/banque/sans-piece/reponses.js';
import type { EtatRapprochement, Lien } from '../../../../packages/noyau/src/banque/types.js';
import { ErreurDepot, type Contexte, type DepotBanque } from './depot.js';
import { avecIdempotence, reponse, versHttp, type RegistreIdempotence, type ReponseHttp } from './reponses-http.js';

export type PiecesCandidates = { lire(societeId: string, pieceId: string): Promise<{ id: string; montant: number } | null> };
export type DependancesEcritures = {
  depot: DepotBanque; idempotence: RegistreIdempotence; pieces: PiecesCandidates;
  parametres: { motifsPermis: readonly string[]; compteAssocie: string };
};
const FORBIDDEN = 403, CONFLIT = 409, INVALIDE = 422;
export const TABLE_REFUS: Readonly<Record<string, 403 | 409 | 422>> = {
  ia_interdite: FORBIDDEN, systeme_interdit: FORBIDDEN, reponse_reservee_a_une_personne: FORBIDDEN,
  lien_non_validable: CONFLIT, confirmation_differente: CONFLIT, rien_a_valider: CONFLIT, deja_repondue: CONFLIT, etat_incompatible: CONFLIT, ligne_deja_ignoree: CONFLIT, lien_non_defaisable: CONFLIT,
  hors_limites: INVALIDE, horodatage_invalide: INVALIDE, reponse_inconnue: INVALIDE, motif_invalide: INVALIDE, compte_associe_invalide: INVALIDE, montant_invalide: INVALIDE, acteur_invalide: INVALIDE,
  tolerance_invalide: INVALIDE, ids_identiques: INVALIDE, ligne_inconnue: INVALIDE, decision_incomplete: INVALIDE, pas_en_attente: INVALIDE, pas_completee: INVALIDE,
};
/** Un code inconnu du noyau est relancé : jamais un 200. */
export function refusVersHttp(e: unknown): ReponseHttp {
  if (e instanceof ErreurValidation || e instanceof ErreurReponses || e instanceof ErreurDoublonsSources) {
    if (!Object.hasOwn(TABLE_REFUS, e.code)) throw e;
    return reponse(TABLE_REFUS[e.code]!, e.code);
  }
  return versHttp(e);
}
const interdit = (ctx: Contexte): ReponseHttp | null => (ctx.acteur.type === 'personne' ? null : reponse(403, ctx.acteur.type === 'ia' ? 'ia_interdite' : 'systeme_interdit'));
const executer = (deps: DependancesEcritures, ctx: Contexte, cle: string, corps: unknown, f: () => Promise<ReponseHttp>): Promise<ReponseHttp> =>
  avecIdempotence(deps.idempotence, ctx.societeId, cle, corps, () => f().catch(refusVersHttp));
const rangees = async (deps: DependancesEcritures, ctx: Contexte, table: 'lien_rapprochement' | 'ligne_bancaire') => deps.depot.lister(ctx, table);
const texte = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

export const validerLiens = (deps: DependancesEcritures, ctx: Contexte, e: { cle: string; ids?: readonly string[]; surs?: true; confirmationNb?: number }): Promise<ReponseHttp> =>
  executer(deps, ctx, e.cle, e, async () => {
    const refus = interdit(ctx);
    if (refus) return refus;
    const liens = (await rangees(deps, ctx, 'lien_rapprochement')) as unknown as Lien[];
    const etats = Object.fromEntries((await rangees(deps, ctx, 'ligne_bancaire')).map((l) => [l.id, l['etatRapprochement']])) as Record<string, EtatRapprochement>;
    const prep = preparerValidation(liens, etats, e.surs ? { surs: true } : { ids: e.ids ?? [] });
    if (e.confirmationNb === undefined) return { statut: 200, corps: prep };
    const { liens: valides } = validerLot(liens, prep.ids, ctx.acteur, { mode: 'assiste', horodatage: ctx.horodatage, confirmationNb: e.confirmationNb });
    for (const v of valides) if ((await deps.depot.lire(ctx, 'lien_rapprochement', v.id)).version !== v.version - 1) throw new ErreurDepot('version_perimee');
    for (const v of valides) await deps.depot.modifier(ctx, 'lien_rapprochement', v.id, v.version - 1, { etat: 'valide', validePar: v.validePar, valideLe: v.valideLe });
    return { statut: 200, corps: { valides: prep.ids } };
  });

export const creerLienManuel = (deps: DependancesEcritures, ctx: Contexte, e: { cle: string; ligneId: string; pieceId?: string; montantAffecte: number }): Promise<ReponseHttp> =>
  executer(deps, ctx, e.cle, e, async () => {
    const refus = interdit(ctx);
    if (refus) return refus;
    const ligne = await deps.depot.lire(ctx, 'ligne_bancaire', e.ligneId);
    const piece = e.pieceId === undefined ? undefined : await deps.pieces.lire(ctx.societeId, e.pieceId);
    if (piece === null) return reponse(422, 'piece_inconnue');
    const rows = await rangees(deps, ctx, 'lien_rapprochement');
    const defaits = new Set(rows.filter((r) => r['etat'] === 'defait').map((r) => r['defaitLienId']));
    const v = verifierNouveauLien(e, { id: ligne.id, montant: ligne['montant'] as number }, piece, rows.filter((r) => !defaits.has(r.id)) as unknown as Lien[]);
    if (!v.ok) return { statut: 422, corps: { code: v.code, ...('maximum' in v ? { maximum: v.maximum } : {}) } };
    const lien = await deps.depot.ajouter(ctx, 'lien_rapprochement', {
      ligneId: e.ligneId, ...(e.pieceId === undefined ? {} : { pieceId: e.pieceId }), montantAffecte: e.montantAffecte,
      etat: 'valide', proposePar: 'personne', validePar: ctx.acteur.id, valideLe: ctx.horodatage,
    });
    return { statut: 200, corps: { id: lien.id } };
  });

export const defaireLien = (deps: DependancesEcritures, ctx: Contexte, id: string, e: { cle: string; motif: string }): Promise<ReponseHttp> =>
  executer(deps, ctx, e.cle, { id, motif: e.motif }, async () => {
    const refus = interdit(ctx);
    if (refus) return refus;
    const lien = await deps.depot.lire(ctx, 'lien_rapprochement', id);
    if (!texte(e.motif)) return reponse(422, 'motif_invalide');
    const dejaDefait = (await rangees(deps, ctx, 'lien_rapprochement')).some((r) => r['etat'] === 'defait' && r['defaitLienId'] === id);
    if (lien['etat'] !== 'valide' || dejaDefait) return reponse(409, 'lien_non_defaisable');
    const ligne = await deps.depot.ajouter(ctx, 'lien_rapprochement', { etat: 'defait', defaitLienId: id, ligneId: lien['ligneId'], motif: e.motif });
    return { statut: 200, corps: { id: ligne.id } };
  });

export const repondreDemande = (deps: DependancesEcritures, ctx: Contexte, id: string, e: { cle: string; type: 'je_les_depose' | 'ou_les_trouver' | 'pas_de_facture' | 'c_est_personnel'; motif?: string }): Promise<ReponseHttp> =>
  executer(deps, ctx, e.cle, { id, type: e.type, motif: e.motif }, async () => {
    if (ctx.acteur.type === 'systeme') return reponse(403, 'systeme_interdit');
    const rangee = await deps.depot.lire(ctx, 'demande_utilisateur', id);
    const { demande, effets } = repondre(rangee as unknown as DemandeSuivie, { type: e.type, ...(e.motif === undefined ? {} : { motif: e.motif }) }, { ...deps.parametres, acteur: { type: ctx.acteur.type, id: ctx.acteur.id }, horodatage: ctx.horodatage });
    const maj = await deps.depot.modifier(ctx, 'demande_utilisateur', id, rangee.version, { etat: demande.etat, reponse: demande.reponse, ...(demande.motif === undefined ? {} : { motif: demande.motif }) });
    return { statut: 200, corps: { demande: maj, effets } };
  });

export const deciderDoublon = (deps: DependancesEcritures, ctx: Contexte, id: string, e: { cle: string; decision: 'confirmer' | 'rejeter'; motif: string }): Promise<ReponseHttp> =>
  executer(deps, ctx, e.cle, { id, decision: e.decision, motif: e.motif }, async () => {
    const refus = interdit(ctx);
    if (refus) return refus;
    const suspect = await deps.depot.lire(ctx, 'doublon_suspect', id);
    if (suspect['etat'] !== 'ouvert') return reponse(409, 'etat_incompatible');
    if (e.decision !== 'confirmer' && e.decision !== 'rejeter') return reponse(422, 'decision_invalide');
    if (!texte(e.motif)) return reponse(422, 'decision_incomplete');
    if (e.decision === 'confirmer') {
      const [conserveeId, doublonId] = [suspect['conserveeId'] as string, suspect['doublonId'] as string];
      const lignes = (await rangees(deps, ctx, 'ligne_bancaire')) as unknown as LigneSource[];
      const apres = confirmerDoublon(lignes, { conserveeId, doublonId, decidePar: ctx.acteur.id, motif: e.motif }).find((l) => l.id === doublonId)!;
      const ligne = await deps.depot.lire(ctx, 'ligne_bancaire', doublonId);
      await deps.depot.modifier(ctx, 'ligne_bancaire', doublonId, ligne.version, { etatRapprochement: apres.etatRapprochement, doublonDe: conserveeId, decidePar: ctx.acteur.id, motifDoublon: e.motif });
    }
    await deps.depot.modifier(ctx, 'doublon_suspect', id, suspect.version, { etat: e.decision === 'confirmer' ? 'confirme' : 'rejete' });
    return { statut: 200, corps: { id, decision: e.decision } };
  });
