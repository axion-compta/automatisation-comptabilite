import { describe, expect, it } from 'vitest';
import { ErreurDoublonsSources } from '../../../../../packages/noyau/src/banque/doublons-sources.js';
import { ErreurValidation } from '../../../../../packages/noyau/src/banque/rapprochement/validation.js';
import { ErreurReponses } from '../../../../../packages/noyau/src/banque/sans-piece/reponses.js';
import type { Contexte } from '../depot.js';
import { creerDepotMemoire, nouvelIdOrdonne } from '../depot-memoire.js';
import { TABLE_REFUS, creerLienManuel, deciderDoublon, defaireLien, refusVersHttp, repondreDemande, validerLiens, type DependancesEcritures } from '../ecritures.js';
import { creerRegistreMemoire } from '../reponses-http.js';

const ctx = (societeId: string, type: 'personne' | 'ia' | 'systeme' = 'personne'): Contexte => ({ societeId, acteur: { type, id: 'acteur-fictif' }, module: 'banque', canal: 'api', horodatage: '2026-11-01T10:00:00.000Z' });
const A = ctx('S-A');
const [IA, SYS] = [ctx('S-A', 'ia'), ctx('S-A', 'systeme')];
const REPONSES = ['je_les_depose', 'ou_les_trouver', 'pas_de_facture', 'c_est_personnel'];
let n = 0;
const cle = () => `cle-fictive-${String(++n).padStart(4, '0')}`;
async function pret() {
  const depot = creerDepotMemoire({ nouvelId: nouvelIdOrdonne() });
  const pieces = new Map([['P1', { id: 'P1', montant: 5000 }]]);
  const deps: DependancesEcritures = { depot, idempotence: creerRegistreMemoire(), pieces: { lire: async (_s, id) => pieces.get(id) ?? null }, parametres: { motifsPermis: ['perdue'], compteAssocie: 'C-PERSO' } };
  const ligne = (montant = 10000, etatRapprochement = 'A_RAPPROCHER') => depot.ajouter(A, 'ligne_bancaire', { montant, etatRapprochement, etatTechnique: 'completee', compteId: 'C1' });
  const lien = (ligneId: string, etat = 'propose', montantAffecte = 1000) => depot.ajouter(A, 'lien_rapprochement', { ligneId, montantAffecte, etat, proposePar: 'regle' });
  const demande = (etat = 'ouverte') => depot.ajouter(A, 'demande_utilisateur', { cle: 'k', ligneIds: ['L'], impact: 1000, nombre: 1, type: 'frais', codeQuestion: 'factures_manquantes', reponsesPretes: REPONSES, etat });
  const etats = async () => (await depot.lister(A, 'lien_rapprochement')).map((l) => [l.id, l['etat'], l.version]);
  const manuel = (e: Partial<{ ligneId: string; pieceId: string; montantAffecte: number }> & { ligneId: string }, c = A) => creerLienManuel(deps, c, { cle: cle(), montantAffecte: 1000, ...e });
  return { depot, deps, ligne, lien, demande, etats, manuel };
}
const code = (r: { corps: unknown }) => (r.corps as { code: string }).code;

describe('routes d’écriture du bloc banque', () => {
  it('t05-7-nombre-annonce-puis-confirme', async () => {
    const p = await pret();
    const [l, a, b] = [await p.ligne(), await p.lien('x'), await p.lien('x')];
    const avant = await p.etats();
    expect(await validerLiens(p.deps, A, { cle: cle(), ids: [a.id, b.id] })).toEqual({ statut: 200, corps: { nbObjetsTouches: 2, ids: [a.id, b.id] } });
    expect(await p.etats()).toEqual(avant);
    expect(await validerLiens(p.deps, A, { cle: cle(), ids: [a.id, b.id], confirmationNb: 2 })).toEqual({ statut: 200, corps: { valides: [a.id, b.id] } });
    expect((await p.etats()).map((x) => x[1])).toEqual(['valide', 'valide']);
    const sure = await p.ligne(1000, 'RAPPROCHEE');
    const c = await p.lien(sure.id);
    expect((await validerLiens(p.deps, A, { cle: cle(), surs: true })).corps).toEqual({ nbObjetsTouches: 1, ids: [c.id] });
    expect(l.id).toBeTruthy();
  });
  it('confirmation-differente-409-rien-ecrit', async () => {
    const p = await pret();
    const a = await p.lien('x');
    const avant = await p.etats();
    for (const nb of [Number.NaN, 1.5, 2, 0]) {
      const r = await validerLiens(p.deps, A, { cle: cle(), ids: [a.id], confirmationNb: nb });
      expect([r.statut, code(r)]).toEqual([409, 'confirmation_differente']);
    }
    expect(await validerLiens(p.deps, A, { cle: cle(), ids: [] })).toEqual({ statut: 409, corps: { code: 'rien_a_valider' } });
    expect((await validerLiens(p.deps, A, { cle: cle(), ids: [a.id, a.id] })).corps).toEqual({ nbObjetsTouches: 1, ids: [a.id] });
    expect(await validerLiens(p.deps, SYS, { cle: cle(), ids: [a.id], confirmationNb: 1 })).toEqual({ statut: 403, corps: { code: 'systeme_interdit' } });
    expect((await validerLiens(p.deps, IA, { cle: cle(), ids: [a.id], confirmationNb: 1 })).statut).toBe(403);
    expect(await p.etats()).toEqual(avant);
  });
  it('validation-tout-ou-rien', async () => {
    const p = await pret();
    const [a, b, c] = [await p.lien('x'), await p.lien('x', 'valide'), await p.lien('x')];
    const avant = await p.etats();
    for (const ids of [[a.id, b.id], [a.id, 'inconnu', c.id]]) {
      const r = await validerLiens(p.deps, A, { cle: cle(), ids, confirmationNb: ids.length });
      expect([r.statut, code(r)]).toEqual([409, 'lien_non_validable']);
    }
    expect(await p.etats()).toEqual(avant);
  });
  it('t06-7-lien-manuel-depasse-422', async () => {
    const p = await pret();
    const l = await p.ligne();
    expect((await p.manuel({ ligneId: l.id, pieceId: 'P1', montantAffecte: 6000 }))).toEqual({ statut: 422, corps: { code: 'depasse_piece', maximum: 5000 } });
    expect((await p.manuel({ ligneId: l.id, montantAffecte: 20000 }))).toEqual({ statut: 422, corps: { code: 'depasse_ligne', maximum: 10000 } });
    for (const m of [0, -5, Number.POSITIVE_INFINITY, Number.NaN, 1.5]) expect(await p.manuel({ ligneId: l.id, montantAffecte: m })).toEqual({ statut: 422, corps: { code: 'montant_invalide' } });
    expect(await p.manuel({ ligneId: l.id, pieceId: 'P9' })).toEqual({ statut: 422, corps: { code: 'piece_inconnue' } });
    expect(await p.etats()).toEqual([]);
  });
  it('lien-manuel-par-une-personne', async () => {
    const p = await pret();
    const l = await p.ligne();
    expect((await p.manuel({ ligneId: l.id, pieceId: 'P1' })).statut).toBe(200);
    expect(await p.depot.lister(A, 'lien_rapprochement')).toMatchObject([{ etat: 'valide', proposePar: 'personne', pieceId: 'P1', montantAffecte: 1000 }]);
    expect([(await p.manuel({ ligneId: l.id }, IA)).statut, (await p.manuel({ ligneId: l.id }, SYS)).statut]).toEqual([403, 403]);
    expect(await p.depot.lister(A, 'lien_rapprochement')).toHaveLength(1);
  });
  it('lien-manuel-apres-defaire-accepte', async () => {
    const p = await pret();
    const l = await p.ligne();
    const id = ((await p.manuel({ ligneId: l.id, montantAffecte: 10000 })).corps as { id: string }).id;
    expect(code(await p.manuel({ ligneId: l.id }))).toBe('depasse_ligne');
    expect((await defaireLien(p.deps, A, id, { cle: cle(), motif: 'erreur de saisie' })).statut).toBe(200);
    expect((await p.manuel({ ligneId: l.id, montantAffecte: 10000 })).statut).toBe(200);
  });
  it('defaire-ajoute-sans-modifier-le-lien-valide', async () => {
    const p = await pret();
    const lien = await p.lien('L1', 'valide');
    expect((await defaireLien(p.deps, A, lien.id, { cle: cle(), motif: ' ' })).statut).toBe(422);
    expect([(await defaireLien(p.deps, IA, lien.id, { cle: cle(), motif: 'x' })).statut, (await defaireLien(p.deps, SYS, lien.id, { cle: cle(), motif: 'x' })).statut]).toEqual([403, 403]);
    expect((await defaireLien(p.deps, A, lien.id, { cle: cle(), motif: 'erreur' })).statut).toBe(200);
    expect(await p.depot.lire(A, 'lien_rapprochement', lien.id)).toEqual(lien);
    expect(await p.depot.lister(A, 'lien_rapprochement')).toHaveLength(2);
    expect((await p.depot.lister(A, 'lien_rapprochement', { etat: 'defait' }))[0]).toMatchObject({ defaitLienId: lien.id, motif: 'erreur' });
  });
  it('defaire-deux-fois-409', async () => {
    const p = await pret();
    const [lien, propose] = [await p.lien('L1', 'valide'), await p.lien('L1')];
    expect((await defaireLien(p.deps, A, lien.id, { cle: cle(), motif: 'm' })).statut).toBe(200);
    expect(await defaireLien(p.deps, A, lien.id, { cle: cle(), motif: 'm' })).toEqual({ statut: 409, corps: { code: 'lien_non_defaisable' } });
    expect((await defaireLien(p.deps, A, propose.id, { cle: cle(), motif: 'm' })).statut).toBe(409);
    expect(await p.depot.lister(A, 'lien_rapprochement', { etat: 'defait' })).toHaveLength(1);
  });
  it('t12-4-ia-ne-repond-pas-pas-de-facture', async () => {
    const p = await pret();
    const d = await p.demande();
    for (const [type, motif] of [['pas_de_facture', 'perdue'], ['c_est_personnel', undefined]] as const) {
      const r = await repondreDemande(p.deps, IA, d.id, { cle: cle(), type, ...(motif ? { motif } : {}) });
      expect(r).toEqual({ statut: 403, corps: { code: 'reponse_reservee_a_une_personne' } });
    }
    expect(await p.depot.lire(A, 'demande_utilisateur', d.id)).toEqual(d);
    const ok = await repondreDemande(p.deps, A, d.id, { cle: cle(), type: 'pas_de_facture', motif: 'perdue' });
    expect(ok.corps).toMatchObject({ demande: { etat: 'repondue', reponse: 'pas_de_facture' }, effets: [{ type: 'decision_sans_justificatif' }] });
    expect((await repondreDemande(p.deps, SYS, d.id, { cle: cle(), type: 'je_les_depose' })).statut).toBe(403);
  });
  it('repondre-deja-repondue-409', async () => {
    const p = await pret();
    const d = await p.demande('repondue');
    expect(await repondreDemande(p.deps, A, d.id, { cle: cle(), type: 'je_les_depose' })).toEqual({ statut: 409, corps: { code: 'deja_repondue' } });
  });
  it('doublon-confirme-ligne-ignoree-jamais-supprimee', async () => {
    const p = await pret();
    const [x, y, z, w] = [await p.ligne(), await p.ligne(), await p.ligne(), await p.ligne()];
    const s1 = await p.depot.ajouter(A, 'doublon_suspect', { conserveeId: x.id, doublonId: y.id, etat: 'ouvert' });
    const s2 = await p.depot.ajouter(A, 'doublon_suspect', { conserveeId: z.id, doublonId: w.id, etat: 'ouvert' });
    expect((await deciderDoublon(p.deps, IA, s1.id, { cle: cle(), decision: 'confirmer', motif: 'm' })).statut).toBe(403);
    expect(code(await deciderDoublon(p.deps, A, s1.id, { cle: cle(), decision: 'confirmer', motif: '' }))).toBe('decision_incomplete');
    expect((await deciderDoublon(p.deps, A, s1.id, { cle: cle(), decision: 'confirmer', motif: 'même opération' })).statut).toBe(200);
    expect(await p.depot.lister(A, 'ligne_bancaire')).toHaveLength(4);
    expect(await p.depot.lire(A, 'ligne_bancaire', y.id)).toMatchObject({ etatRapprochement: 'IGNOREE', doublonDe: x.id });
    expect((await p.depot.lire(A, 'doublon_suspect', s1.id))['etat']).toBe('confirme');
    expect((await deciderDoublon(p.deps, A, s1.id, { cle: cle(), decision: 'rejeter', motif: 'm' })).statut).toBe(409);
    expect((await deciderDoublon(p.deps, A, s2.id, { cle: cle(), decision: 'rejeter', motif: 'deux achats' })).statut).toBe(200);
    expect(await p.depot.lire(A, 'ligne_bancaire', w.id)).toMatchObject({ etatRapprochement: 'A_RAPPROCHER' });
    expect((await p.depot.lire(A, 'doublon_suspect', s2.id))['etat']).toBe('rejete');
  });
  it('autre-societe-403-et-journal', async () => {
    const p = await pret();
    const lien = await p.lien('L1', 'valide');
    const B = ctx('S-B');
    expect(await defaireLien(p.deps, B, lien.id, { cle: cle(), motif: 'm' })).toEqual({ statut: 403, corps: { code: 'acces_refuse' } });
    expect((await p.depot.journal(B)).map((j) => j.evenement)).toContain('banque.acces_refuse');
    expect(await p.depot.lister(A, 'lien_rapprochement')).toHaveLength(1);
  });
  describe('chaque-refus-a-un-code-http', () => {
    const fabriques = [ErreurValidation, ErreurReponses, ErreurDoublonsSources] as unknown as (new (c: string) => Error)[];
    it.each(Object.entries(TABLE_REFUS).flatMap(([c, s]) => fabriques.map((F) => [c, s, F] as const)))('%s → %i', (c, s, F) => {
      const r = refusVersHttp(new F(c));
      expect([r.statut, code(r)]).toEqual([s, c]);
      expect(r.statut).not.toBe(200);
    });
    it('code inconnu ou erreur étrangère relancés', () => {
      expect(() => refusVersHttp(new ErreurValidation('inconnu' as never))).toThrow();
      expect(() => refusVersHttp(new Error('x'))).toThrow();
    });
  });
});
