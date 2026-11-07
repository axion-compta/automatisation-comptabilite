import { describe, expect, it } from 'vitest';
import { leverGel, poserGel } from '../gel.js';
import { ErreurAbonnement, type FinContrat } from '../types.js';

const H1 = '2026-03-01T10:00:00Z';
const H2 = '2026-03-02T11:30:00.250Z';
const MAX = 20;
const SANS_GEL = { actif: false, motif: null, posePar: null, poseLe: null };

function fin(console = false): FinContrat {
  return {
    dateFin: '2026-06-30', remisLe: null, manifesteEmpreinte: null, accuseLe: null, accusePar: null,
    gelModule: { ...SANS_GEL }, gelConsole: console,
  };
}
const opt = (o: Record<string, unknown> = {}) => ({
  motif: 'litige en cours', par: 'client' as const, auteur: 'Camille Test', horodatage: H1, longueurMaxMotif: MAX, ...o,
});
function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurAbonnement ? e.code : 'autre';
  }
  return undefined;
}
const pose = () => poserGel(fin(), opt()).fin;

describe('gel de fin de contrat', () => {
  it('poser-puis-lever-deux-evenements', () => {
    const p = poserGel(fin(), opt({ motif: '  controle fiscal  ' }));
    expect(p.evenement.type).toBe('fin_contrat.gel_pose');
    expect(p.evenement.horodatage).toBe(H1);
    expect(p.evenement.donnees['motif']).toBe('controle fiscal');
    expect(p.fin.gelModule).toEqual({ actif: true, motif: 'controle fiscal', posePar: 'Camille Test', poseLe: H1 });
    const l = leverGel(p.fin, opt({ par: 'axion', auteur: 'Alix Test', horodatage: H2, motif: ' fin du litige ' }));
    expect(l.evenement.type).toBe('fin_contrat.gel_leve');
    expect(l.evenement.horodatage).toBe(H2);
    expect(l.evenement.donnees['motif']).toBe('fin du litige');
    expect(l.evenement.donnees['par']).toBe('axion');
    expect(l.fin.gelModule).toEqual(SANS_GEL);
  });

  it('motif-blanc-refuse', () => {
    for (const m of ['', '   ', '\t']) {
      expect(code(() => poserGel(fin(), opt({ motif: m })))).toBe('motif_manquant');
      expect(code(() => leverGel(pose(), opt({ motif: m })))).toBe('motif_manquant');
    }
    expect(code(() => poserGel(fin(), opt({ motif: undefined })))).toBe('motif_manquant');
  });

  it('motif-trop-long-refuse', () => {
    expect(code(() => poserGel(fin(), opt({ motif: 'x'.repeat(MAX) })))).toBeUndefined();
    expect(code(() => poserGel(fin(), opt({ motif: 'x'.repeat(MAX + 1) })))).toBe('parametre_invalide');
    expect(code(() => poserGel(fin(), opt({ motif: ' ' + 'x'.repeat(MAX) + ' ' })))).toBeUndefined();
    expect(code(() => leverGel(pose(), opt({ motif: 'x'.repeat(MAX + 1) })))).toBe('parametre_invalide');
    for (const n of [0, -1, 1.5, NaN, Infinity, -Infinity, '5', undefined]) {
      expect(code(() => poserGel(fin(), opt({ longueurMaxMotif: n })))).toBe('parametre_invalide');
    }
  });

  it('double-gel-refuse', () => {
    expect(code(() => poserGel(pose(), opt()))).toBe('gel_deja_actif');
  });

  it('lever-sans-gel-refuse', () => {
    expect(code(() => leverGel(fin(), opt()))).toBe('gel_inactif');
  });

  it('gel-console-jamais-modifie', () => {
    const p = poserGel(fin(true), opt());
    expect(p.fin.gelConsole).toBe(true);
    expect(leverGel(p.fin, opt()).fin.gelConsole).toBe(true);
    expect(poserGel(fin(false), opt()).fin.gelConsole).toBe(false);
  });

  it('entree-non-modifiee', () => {
    const f = fin(true);
    const copie = structuredClone(f);
    poserGel(f, opt());
    expect(f).toEqual(copie);
    const p = pose();
    const copieP = structuredClone(p);
    leverGel(p, opt());
    expect(p).toEqual(copieP);
    expect(Object.isFrozen(poserGel(f, opt()).fin)).toBe(false);
    expect(poserGel(f, opt()).fin).not.toBe(f);
    expect(poserGel(f, opt()).fin.gelModule).not.toBe(f.gelModule);
  });

  it('controles-communs', () => {
    expect(code(() => poserGel(fin(), opt({ par: 'autre' })))).toBe('parametre_invalide');
    expect(code(() => leverGel(pose(), opt({ par: 'autre' })))).toBe('parametre_invalide');
    for (const a of ['', '  ', undefined]) expect(code(() => poserGel(fin(), opt({ auteur: a })))).toBe('auteur_manquant');
    expect(code(() => leverGel(pose(), opt({ auteur: ' ' })))).toBe('auteur_manquant');
    expect(code(() => poserGel(fin(), opt({ horodatage: '2026-03-01' })))).toBe('horodatage_invalide');
  });
});
