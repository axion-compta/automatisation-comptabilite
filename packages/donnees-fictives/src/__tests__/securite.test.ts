import { describe, expect, it } from 'vitest';
import { JEU_SECURITE as J } from '../securite.js';

const unique = (l: readonly string[]) => new Set(l).size === l.length;
const profond = (v: unknown): boolean =>
  typeof v !== 'object' || v === null || (Object.isFrozen(v) && Object.values(v).every(profond));

describe('jeu fictif de sécurité', () => {
  it('ids-uniques', () => {
    for (const l of [J.clients, J.societes, J.personnes]) expect(unique(l.map((x) => x.id))).toBe(true);
    expect(J.personnes.map((p) => p.id)).toEqual(['adms-a', 'dir-a', 'lec-a', 'exp-a', 'inv-a', 'axion-1']);
  });

  it('trois-societes-deux-clients', () => {
    expect(J.clients).toHaveLength(2);
    expect(J.societes.map((s) => [s.id, s.clientId, s.nom])).toEqual([
      ['soc-a', 'client-x', 'Société A'], ['soc-b', 'client-x', 'Société B'], ['soc-c', 'client-y', 'Société C'],
    ]);
  });

  it('six-personnes-six-roles', () => {
    expect(J.personnes).toHaveLength(6);
    expect(new Set(J.personnes.map((p) => p.role)).size).toBe(6);
    const p = (id: string) => J.personnes.find((x) => x.id === id)!.permissions;
    expect(p('adms-a')).toHaveLength(11);
    expect(p('dir-a')).toHaveLength(7);
    for (const interdite of ['compta-lever-bloquant', 'compta-cloturer', 'compta-parametrer', 'compta-equipe']) expect(p('dir-a')).not.toContain(interdite);
    expect(p('lec-a')).toEqual(['compta-lire']);
    expect(p('exp-a')).toEqual(['compta-lire', 'compta-exporter', 'compta-commenter']);
    expect(p('inv-a')).toEqual(p('exp-a'));
    expect(p('axion-1')).toEqual(['compta-lire']);
    expect(J.accesExperts).toEqual([{ personneId: 'inv-a', societeId: 'soc-a', exercice: '2026', journaux: ['ACH'], comptesBancaires: [], echeance: '2026-12-31' }]);
    expect(J.modes).toEqual([{ id: 'saisie_seule', retire: ['cloturer', 'valider'], raison: 'mode_saisie_seule' }]);
  });

  it('emails-exemple-fr', () => {
    for (const p of J.personnes) expect(p.email).toMatch(/^[a-z0-9-]+@exemple\.fr$/);
  });

  it('aucune-personne-sans-societe-sauf-axion', () => {
    const ids = J.societes.map((s) => s.id);
    for (const p of J.personnes) {
      if (p.role === 'personnel_axion') expect(p.societes).toEqual([]);
      else {
        expect(p.societes.length).toBeGreaterThan(0);
        for (const s of p.societes) expect(ids).toContain(s);
      }
    }
  });

  it('jeu-fige', () => {
    expect(profond(J)).toBe(true);
    expect(Object.isFrozen(J.personnes[0]!.permissions)).toBe(true);
    expect(() => (J.societes as unknown as unknown[]).push(1)).toThrow();
  });
});
