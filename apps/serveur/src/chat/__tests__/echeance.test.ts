import { describe, expect, it } from 'vitest';
import type { ParametreLegal } from '../../../../../packages/parametres/src/au-jour.js';
import type { DemandeConsole, PortConsoleEffacement, SuiviEffacements } from '../../rgpd/effacement-console.js';
import { CLE_DUREE_CONVERSATION, CLE_DUREE_PREFERENCE, demanderEffacementsEchus, listerEchus, type ElementChat } from '../echeance.js';

const AUJOURDHUI = '2027-03-01';
const duree = (cle: string, valeur: string, statut: ParametreLegal['statut'] = 'valide'): ParametreLegal => ({
  cle, pays: 'FR', valeur, effet_debut: '2026-01-01', effet_fin: null, statut, source: 'source fictive de test', date_releve: '2026-01-01',
});
const PARAMS = [duree(CLE_DUREE_CONVERSATION, '30'), duree(CLE_DUREE_PREFERENCE, '60')];
const ELEMENTS: ElementChat[] = [
  { id: 'conv-vieille', sorte: 'conversation', societeId: 'soc-1', derniereActivite: '2027-01-15' },
  { id: 'conv-recente', sorte: 'conversation', societeId: 'soc-1', derniereActivite: '2027-02-20' },
  { id: 'pref-vieille', sorte: 'preference', societeId: 'soc-1', derniereActivite: '2026-12-01' },
  { id: 'pref-recente', sorte: 'preference', societeId: 'soc-1', derniereActivite: '2027-02-01' },
];

function faux(): { console: PortConsoleEffacement; suivi: SuiviEffacements; demandes: DemandeConsole[] } {
  const demandes: DemandeConsole[] = [];
  const notes = new Map<string, string>();
  return {
    demandes,
    console: { demander: async (d) => { demandes.push(d); return { ref: `ref-${demandes.length}` }; }, etat: async () => 'en_attente' },
    suivi: { deja: async (id) => notes.get(id), noter: async (id, ref) => { notes.set(id, ref); } },
  };
}

describe('echeance des conversations et préférences', () => {
  it('echues-listees', () => {
    expect(listerEchus(ELEMENTS, PARAMS, AUJOURDHUI).map((e) => e.id)).toEqual(['conv-vieille', 'pref-vieille']);
  });

  it('non-echues-gardees', () => {
    const ids = listerEchus(ELEMENTS, PARAMS, AUJOURDHUI).map((e) => e.id);
    expect(ids).not.toContain('conv-recente');
    expect(ids).not.toContain('pref-recente');
    // la veille de l'échéance : gardée ; le jour de l'échéance : échue
    const un = [{ id: 'c', sorte: 'conversation' as const, societeId: 's', derniereActivite: '2027-01-30' }];
    expect(listerEchus(un, PARAMS, '2027-03-01')).toHaveLength(0);
    expect(listerEchus(un, PARAMS, '2027-03-02')).toHaveLength(1);
  });

  it('gel-bloque-l-effacement', async () => {
    const f = faux();
    const r = await demanderEffacementsEchus({
      elements: ELEMENTS, parametres: PARAMS, gels: [{ pose_le: '2027-02-01' }], aujourdhui: AUJOURDHUI, console: f.console, suivi: f.suivi,
    });
    expect(r).toEqual({ envoyes: 0, raison: 'gel_actif' });
    expect(f.demandes).toHaveLength(0);
  });

  it('duree-absente-rien-n-est-efface', async () => {
    for (const params of [[], [duree(CLE_DUREE_CONVERSATION, ''), duree(CLE_DUREE_PREFERENCE, '')], [duree(CLE_DUREE_CONVERSATION, '30', 'a_verifier')]]) {
      expect(listerEchus(ELEMENTS, params, AUJOURDHUI).filter((e) => e.sorte === 'conversation')).toHaveLength(0);
      const f = faux();
      const r = await demanderEffacementsEchus({
        elements: ELEMENTS.filter((e) => e.sorte === 'conversation'), parametres: params, gels: [], aujourdhui: AUJOURDHUI, console: f.console, suivi: f.suivi,
      });
      expect(r.envoyes).toBe(0);
      expect(f.demandes).toHaveLength(0);
    }
    expect(listerEchus(ELEMENTS)).toEqual([]);
  });

  it('demande-transmise-a-la-console', async () => {
    const f = faux();
    const r = await demanderEffacementsEchus({
      elements: ELEMENTS, parametres: PARAMS, gels: [], aujourdhui: AUJOURDHUI, console: f.console, suivi: f.suivi,
    });
    expect(r.envoyes).toBe(2);
    expect(f.demandes.map((d) => d.objetId)).toEqual(['conv-vieille', 'pref-vieille']);
    expect(f.demandes.every((d) => d.sorte === 'effacement' && d.societeId === 'soc-1')).toBe(true);
    // rejouer ne redemande rien
    const r2 = await demanderEffacementsEchus({
      elements: ELEMENTS, parametres: PARAMS, gels: [], aujourdhui: AUJOURDHUI, console: f.console, suivi: f.suivi,
    });
    expect(r2.envoyes).toBe(0);
    expect(f.demandes).toHaveLength(2);
  });
});
