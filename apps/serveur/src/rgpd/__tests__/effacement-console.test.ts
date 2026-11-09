import { describe, expect, it } from 'vitest';
import type { RegleConservation } from '../../../../../packages/noyau/src/conservation/regles.js';
import { resumePurge, proposerPurge } from '../../../../../packages/noyau/src/rgpd/purge-proposee.js';
import { ErreurRgpd } from '../../../../../packages/noyau/src/rgpd/types.js';
import {
  envoyerEffacements, gelActif, proposerPurgeQuotidienne, rejouerAvantRemise, suivreEffacements,
  type DemandeConsole, type EtatSuivi, type PortConsoleEffacement, type SuiviEffacements,
} from '../effacement-console.js';

const SOC = '123456782';
const AUJ = '2027-03-01';
const CLES = ['decisionId', 'objetId', 'societeId', 'sorte'];

function faussConsole(opts: { panneA?: number; etats?: Record<string, 'en_attente' | 'fait' | 'refuse'> } = {}) {
  const recues: DemandeConsole[] = [];
  const port: PortConsoleEffacement = {
    demander: async (d) => {
      if (opts.panneA !== undefined && recues.length + 1 === opts.panneA) throw new Error('panne');
      recues.push(d);
      return { ref: `ref-${recues.length}` };
    },
    etat: async (ref) => opts.etats?.[ref] ?? 'en_attente',
  };
  return { port, recues };
}
function faussSuivi() {
  const notes = new Map<string, { ref: string; etat: EtatSuivi }>();
  return {
    notes,
    deja: async (id: string) => notes.get(id)?.ref,
    noter: async (id: string, ref: string, etat: EtatSuivi) => { notes.set(id, { ref, etat }); },
  };
}
const items = (...ids: string[]) => ids.map((n) => ({ objetId: `obj-${n}`, decisionId: `dec-${n}` }));
const base = (c: ReturnType<typeof faussConsole>, s: SuiviEffacements = faussSuivi()) => ({ societeId: SOC, gels: [], aujourdhui: AUJ, console: c.port, suivi: s });

describe('effacement par la console', () => {
  it('envoi-champs-limites', async () => {
    const c = faussConsole();
    const r = await envoyerEffacements({ ...base(c), aEffacer: items('1', '2') });
    expect(r).toEqual({ envoyes: 2 });
    expect(c.recues).toHaveLength(2);
    for (const d of c.recues) {
      expect(Object.keys(d).sort()).toEqual(CLES);
      expect(d.sorte).toBe('effacement');
      expect(d.societeId).toBe(SOC);
    }
  });

  it('envoi-idempotent', async () => {
    const c = faussConsole();
    const b = base(c);
    await envoyerEffacements({ ...b, aEffacer: items('1', '2') });
    const r = await envoyerEffacements({ ...b, aEffacer: items('1', '2', '3') });
    expect(r).toEqual({ envoyes: 1 });
    expect(c.recues.map((d) => d.decisionId)).toEqual(['dec-1', 'dec-2', 'dec-3']);
  });

  it('gel-rien-envoye', async () => {
    const gels = [
      [{ pose_le: '2027-01-01' }],
      [{ pose_le: '2027-01-01', leve_le: '2027-03-02' }],
    ];
    for (const g of gels) {
      const c = faussConsole();
      const s = faussSuivi();
      const lecture = { deja: async () => { throw new Error('suivi lu pendant le gel'); }, noter: s.noter };
      const r = await envoyerEffacements({ ...base(c, lecture), gels: g, aEffacer: items('1') });
      expect(r).toEqual({ envoyes: 0, raison: 'gel_actif' });
      expect(c.recues).toHaveLength(0);
      expect(gelActif(g, AUJ)).toBe(true);
    }
    const c = faussConsole();
    const levee = [{ pose_le: '2027-01-01', leve_le: '2027-02-28' }];
    expect(gelActif(levee, AUJ)).toBe(false);
    expect(await envoyerEffacements({ ...base(c), gels: levee, aEffacer: items('1') })).toEqual({ envoyes: 1 });
  });

  it('entrees-invalides-avant-envoi', async () => {
    const cas: { liste: { objetId: string; decisionId: string }[]; code: string }[] = [
      { liste: [...items('1'), { objetId: '', decisionId: 'dec-9' }], code: 'objet_inconnu' },
      { liste: [...items('1'), { objetId: 'obj-9', decisionId: '' }], code: 'objet_inconnu' },
      { liste: [...items('1'), { objetId: 'obj-9', decisionId: 'dec-1' }], code: 'doublon' },
    ];
    for (const { liste, code } of cas) {
      const c = faussConsole();
      const p = envoyerEffacements({ ...base(c), aEffacer: liste });
      await expect(p).rejects.toBeInstanceOf(ErreurRgpd);
      await expect(p).rejects.toMatchObject({ code });
      expect(c.recues).toHaveLength(0);
    }
  });

  it('panne-console-arrete-et-remonte', async () => {
    const c = faussConsole({ panneA: 2 });
    const s = faussSuivi();
    await expect(envoyerEffacements({ ...base(c, s), aEffacer: items('1', '2', '3') })).rejects.toThrow('panne');
    expect(c.recues.map((d) => d.decisionId)).toEqual(['dec-1']);
    expect([...s.notes.keys()]).toEqual(['dec-1']);
    expect(s.notes.get('dec-1')).toEqual({ ref: 'ref-1', etat: 'envoye' });
  });

  it('suivi-des-etats', async () => {
    const c = faussConsole({ etats: { 'ref-1': 'fait', 'ref-2': 'refuse', 'ref-3': 'en_attente' } });
    const s = faussSuivi();
    await envoyerEffacements({ ...base(c, s), aEffacer: items('1', '2', '3') });
    const refs = [
      { ref: 'ref-1', decisionId: 'dec-1' }, { ref: 'ref-2', decisionId: 'dec-2' }, { ref: 'ref-3', decisionId: 'dec-3' },
    ];
    expect(await suivreEffacements(refs, c.port, s)).toEqual({ en_attente: 1, fait: 1, refuse: 1 });
    expect(s.notes.get('dec-1')?.etat).toBe('fait');
    expect(s.notes.get('dec-2')?.etat).toBe('refuse');
    expect(s.notes.get('dec-3')?.etat).toBe('envoye');
    expect(await suivreEffacements([], c.port, s)).toEqual({ en_attente: 0, fait: 0, refuse: 0 });
  });

  it('purge-seulement-proposees', async () => {
    const regle = (o: Partial<RegleConservation> = {}): RegleConservation => ({
      pays: 'AA', categorie: 'conversations', dureeAnnees: 1, pointDepart: 'date_document', statut: 'valide', source: 'test', ...o,
    });
    const ligne = (id: string, depart: string, categorie: 'conversations' | 'signalements' = 'conversations') => ({
      id, categorie, pays: ['AA'], dates: { date_document: depart },
    });
    const regles = [regle(), regle({ categorie: 'signalements', statut: 'non_verifie' })];
    const lignes = [ligne('c1', '2026-01-10'), ligne('s1', '2026-01-10', 'signalements'), ligne('c2', AUJ)];
    const attendu = proposerPurge(lignes, regles, { gels: [], aujourdhui: AUJ });
    const c = faussConsole();
    const r = await proposerPurgeQuotidienne({ ...base(c), lignes, regles });
    expect(r).toEqual(resumePurge(attendu));
    expect(r.proposees).toBeGreaterThan(0);
    expect(c.recues.map((d) => d.objetId)).toEqual(attendu.proposees);
    expect(c.recues.every((d) => d.sorte === 'purge' && d.decisionId === `purge-${AUJ}-${d.objetId}`)).toBe(true);
    expect(c.recues.map((d) => d.objetId)).not.toContain('s1');
    expect(c.recues.map((d) => d.objetId)).not.toContain('c2');
    const g = faussConsole();
    const rg = await proposerPurgeQuotidienne({ ...base(g), lignes, regles, gels: [{ pose_le: '2027-01-01' }] });
    expect(rg.proposees).toBe(0);
    expect(g.recues).toHaveLength(0);
  });

  const effs = [
    { objet: 'obj-1', faitLe: '2027-02-28T23:59:59Z', decisionId: 'dec-1' },
    { objet: 'obj-2', faitLe: '2027-03-01T10:00:00.900Z', decisionId: 'dec-2' },
    { objet: 'obj-3', faitLe: '2027-03-01T11:00:00Z', decisionId: 'dec-3' },
  ];
  const DUMP = '2027-03-01T10:00:00Z';
  const NOW = '2027-03-01T12:00:00Z';

  it('rejeu-apres-dump', async () => {
    const c = faussConsole();
    const r = await rejouerAvantRemise({
      societeId: SOC, effacements: effs, dumpPrisLe: DUMP, visibles: [], console: c.port, maintenant: NOW,
    });
    expect(c.recues.map((d) => d.objetId)).toEqual(['obj-2', 'obj-3']);
    expect(c.recues.every((d) => d.sorte === 'rejeu' && Object.keys(d).sort().join() === CLES.join())).toBe(true);
    expect(r.permise).toBe(true);
    expect(r.evenement.type).toBe('personne.effacements_rejoues');
    expect(r.evenement.donnees).toEqual({ nombre: c.recues.length });
  });

  it('remise-refusee-si-rejeu-incomplet', async () => {
    const panne = faussConsole({ panneA: 2 });
    const r1 = await rejouerAvantRemise({
      societeId: SOC, effacements: effs, dumpPrisLe: DUMP, visibles: [], console: panne.port, maintenant: NOW,
    });
    expect(r1.permise).toBe(false);
    expect(r1.manquants).toEqual(['obj-3']);
    const c = faussConsole();
    const r2 = await rejouerAvantRemise({
      societeId: SOC, effacements: effs, dumpPrisLe: DUMP, visibles: ['obj-3'], console: c.port, maintenant: NOW,
    });
    expect(r2.permise).toBe(false);
    expect(r2.encoreVisibles).toEqual(['obj-3']);
  });
});
