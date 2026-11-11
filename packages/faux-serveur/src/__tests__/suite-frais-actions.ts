import { describe, expect, it } from 'vitest';
import type { Appeler, Cible } from './suite-contrat.js';

type Corps = { body: Record<string, unknown> };
const PER = 'PER-01';
let n = 0;
const ent = (extra: Record<string, string> = {}) => ({ 'idempotency-key': 'cle-essai-' + String(++n).padStart(6, '0'), 'x-personne': PER, ...extra });
const depense = { nature: 'depense', personneId: PER, date: '2025-06-10', libelle: 'Achat fictif', montantTtcCentimes: 1234 };

/** Suite commune « frais, routes d'écriture » : jouée sur le vrai serveur et sur le faux. */
export function suiteFraisActions(nom: string, cible: Cible): void {
  describe('suite frais, actions : ' + nom, () => {
    const avec = async (f: (a: Appeler) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };
    const corps = (r: { json: unknown }) => (r.json as Corps).body;

    it('scenario-creer-completer-proposer-valider-rembourser', () =>
      avec(async (a) => {
        const c = await a('POST', '/frais', ent(), depense);
        expect(c.status).toBe(201);
        const id = String(corps(c)['id']);
        expect(corps(c)).toMatchObject({ statut: 'a_completer', version: 1, personneId: PER });
        const m = await a('PATCH', '/frais/' + id, ent({ 'if-match': '1' }), { declaration: 'personne', pieceId: 'PIE-901' });
        expect(m.status).toBe(200);
        expect(corps(m)).toMatchObject({ statut: 'propose', version: 2, payeur: 'personne' });
        // Le frais créé n'a pas de catégorie de charge : la suite continue sur FRA-005, frais du jeu d'essai déjà proposé.
        const p = await a('POST', '/frais/FRA-005/proposer', ent());
        expect(p.status).toBe(200);
        expect(corps(p)).toMatchObject({ fraisId: 'FRA-005', statut: 'propose' });
        const v = await a('POST', '/frais/valider', ent(), { ids: ['FRA-005'] });
        expect(v.status).toBe(200);
        expect((v.json as { body: unknown[] }).body).toHaveLength(1);
        const r = await a('POST', '/remboursements', ent(), { personneId: PER, fraisIds: ['FRA-005'] });
        expect(r.status).toBe(201);
        expect(corps(r)).toMatchObject({ personneId: PER, fraisIds: ['FRA-005'], montantCentimes: 3592, statut: 'propose' });
      }));

    it('refus-412-version-perimee', () =>
      avec(async (a) => {
        const id = String(corps(await a('POST', '/frais', ent(), depense))['id']);
        expect((await a('PATCH', '/frais/' + id, ent({ 'if-match': '1' }), { declaration: 'societe' })).status).toBe(200);
        const r = await a('PATCH', '/frais/' + id, ent({ 'if-match': '1' }), { declaration: 'personne' });
        expect([r.status, r.json]).toEqual([412, expect.objectContaining({ code: 'VERSION_PERIMEE', status: 412 })]);
      }));

    it('refus-409-paye-par-la-societe', () =>
      avec(async (a) => {
        const r = await a('POST', '/frais/FRA-001/proposer', ent());
        expect([r.status, r.json]).toEqual([409, expect.objectContaining({ code: 'FRAIS_PAYE_SOCIETE' })]);
      }));

    it('refus-409-bareme-a-verifier', () =>
      avec(async (a) => {
        const r = await a('POST', '/frais/FRA-014/proposer', ent());
        expect(r.status).toBe(409);
        // Le jeu d'essai du vrai serveur n'a pas de carte grise : le justificatif manquant est contrôlé avant le barème.
        expect(['BAREME_A_VERIFIER', 'JUSTIFICATIF_MANQUANT']).toContain((r.json as { code: string }).code);
      }));

    it('refus-409-remboursement-superieur', () =>
      avec(async (a) => {
        const r = await a('POST', '/remboursements', ent(), { personneId: PER, fraisIds: ['FRA-003'], montantCentimes: 999999 });
        expect([r.status, r.json]).toEqual([409, expect.objectContaining({ code: 'REMBOURSEMENT_SUPERIEUR' })]);
      }));

    it('refus-400-cle-absente', () =>
      avec(async (a) => {
        const sansCle = { 'x-personne': PER };
        expect((await a('POST', '/frais', sansCle, depense)).status).toBe(400);
        expect((await a('POST', '/frais/FRA-005/proposer', {})).status).toBe(400);
        expect((await a('POST', '/remboursements', {}, { personneId: PER, fraisIds: ['FRA-003'] })).status).toBe(400);
      }));
  });
}
