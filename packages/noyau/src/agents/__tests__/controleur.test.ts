import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import { ErreurChat } from '../../chat/types.js';
import { arbitrer, choisirFournisseurControleur, doitControler } from '../controleur.js';

const SEUIL = centimes(100000);
const REGLAGES = { seuilMontant: SEUIL, echantillonPointsDeBase: 0 };
const base = { id: 'piece-1', montant: centimes(500), nouveauTiers: false, confiance: 'sur' as const };
const avec = (r: Partial<typeof REGLAGES>) => ({ ...REGLAGES, ...r });

describe('controleur et arbitrage', () => {
  it('montant-au-dessus-du-seuil', () => {
    expect(doitControler({ ...base, montant: centimes(100001) }, REGLAGES)).toEqual({ controler: true, motif: 'montant' });
    expect(doitControler({ ...base, montant: SEUIL }, REGLAGES)).toEqual({ controler: false, motif: 'aucun' });
    expect(doitControler({ ...base, montant: centimes(-100001) }, REGLAGES).motif).toBe('montant');
  });

  it('nouveau-tiers', () => {
    expect(doitControler({ ...base, nouveauTiers: true }, REGLAGES)).toEqual({ controler: true, motif: 'nouveau_tiers' });
  });

  it('doute', () => {
    for (const confiance of ['douteux', 'a_verifier'] as const) {
      expect(doitControler({ ...base, confiance }, REGLAGES)).toEqual({ controler: true, motif: 'doute' });
    }
  });

  it('echantillon-deterministe', () => {
    const r = avec({ echantillonPointsDeBase: 5000 });
    for (let i = 0; i < 50; i++) {
      const piece = { ...base, id: `piece-${String(i)}` };
      expect(doitControler(piece, r)).toEqual(doitControler(piece, r));
    }
    const ids = Array.from({ length: 200 }, (_, i) => `x-${String(i)}`);
    const motifs = new Set(ids.map((id) => doitControler({ ...base, id }, r).motif));
    expect(motifs).toEqual(new Set(['echantillon', 'aucun']));
  });

  it('echantillon-proche-du-taux', () => {
    const taux = 2000;
    const marge = 300;
    let dedans = 0;
    for (let i = 0; i < 10000; i++) {
      if (doitControler({ ...base, id: `fictif-${String(i)}` }, avec({ echantillonPointsDeBase: taux })).motif === 'echantillon') dedans++;
    }
    expect(dedans).toBeGreaterThan(taux - marge);
    expect(dedans).toBeLessThan(taux + marge);
  });

  it('taux-zero-et-maximum', () => {
    for (let i = 0; i < 100; i++) {
      const piece = { ...base, id: `t-${String(i)}` };
      expect(doitControler(piece, avec({ echantillonPointsDeBase: 0 })).controler).toBe(false);
      expect(doitControler(piece, avec({ echantillonPointsDeBase: 10000 }))).toEqual({ controler: true, motif: 'echantillon' });
    }
  });

  it('reglages-invalides', () => {
    for (const p of [10001, -1, Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => doitControler(base, avec({ echantillonPointsDeBase: p }))).toThrow(ErreurChat);
    }
    for (const s of [Number.NaN, 1.5, -1, Number.POSITIVE_INFINITY]) {
      expect(() => doitControler(base, avec({ seuilMontant: s as Centimes }))).toThrow(ErreurChat);
    }
    expect(() => doitControler(base, avec({ echantillonPointsDeBase: 1.5 }))).toThrow(
      expect.objectContaining({ code: 'parametre_invalide' }) as Error,
    );
  });

  it('fournisseur-different', () => {
    expect(choisirFournisseurControleur(['fournisseur-a', 'fournisseur-b'], 'fournisseur-a')).toBe('fournisseur-b');
    expect(choisirFournisseurControleur(['fournisseur-a', 'fournisseur-b', 'fournisseur-c'], 'fournisseur-b')).toBe('fournisseur-a');
  });

  it('aucun-autre-fournisseur-null', () => {
    expect(choisirFournisseurControleur([], 'fournisseur-a')).toBeNull();
    expect(choisirFournisseurControleur(['fournisseur-a', 'fournisseur-a'], 'fournisseur-a')).toBeNull();
  });

  it('deux-contre-un-desaccord', () => {
    expect(arbitrer([{ agent: 'a', valeur: '606' }, { agent: 'b', valeur: '606' }, { agent: 'c', valeur: '607' }])).toEqual({ sorte: 'desaccord' });
    expect(arbitrer([{ agent: 'a', valeur: '606' }, { agent: 'b', valeur: '606' }])).toEqual({ sorte: 'accord', valeur: '606' });
    expect(arbitrer([{ agent: 'a', valeur: '606' }, { agent: 'b', valeur: '607' }])).toEqual({ sorte: 'desaccord' });
    expect(arbitrer([{ agent: 'a', valeur: '606' }])).toEqual({ sorte: 'accord', valeur: '606' });
  });
});
