import { describe, expect, it } from 'vitest';
import { executerControles } from '../../moteur.js';
import { premierJourOuvert, qualifierDate, regleCCK11, regleCCK11M } from '../dates-piece.js';
import type { ObjetDatePiece } from '../dates-piece.js';

const base: ObjetDatePiece = {
  datePiece: '2026-03-15',
  dateLecture: '2026-11-06',
  exercice: { id: 'EX-2026', debut: '2026-01-01', fin: '2026-12-31' },
  verrou: { periodesVerrouillees: [], exerciceCloture: false },
};
const avec = (p: Partial<ObjetDatePiece>): ObjetDatePiece => ({ ...base, ...p });
const clos = { periodesVerrouillees: ['2026-03'], exerciceCloture: false };

describe('CC-K11 date de la pièce', () => {
  it('CT-11', () => {
    const o = avec({ verrou: clos });
    expect(qualifierDate(o)).toBe('periode_close');
    expect(premierJourOuvert(o)).toBe('2026-01-01');
    expect(regleCCK11.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: '2026-01-01' });
    expect(regleCCK11M.evaluer(o)).toEqual({ resultat: 'OK' });
    expect(regleCCK11.id).toBe('CC-K11');
    expect(regleCCK11.version).toBe(1);
    expect(regleCCK11.gravite).toBe('B');
    expect(regleCCK11.bloque).toEqual(['validation', 'cloture']);
    expect(regleCCK11.declencheurs).toEqual(['arrivee', 'continu', 'a_la_demande']);
    const jan = avec({ verrou: { periodesVerrouillees: ['2026-01', '2026-03'], exerciceCloture: false } });
    expect(premierJourOuvert(jan)).toBe('2026-02-01');
  });

  it('CT-12', () => {
    const o = avec({ datePiece: '2026-12-15' });
    expect(qualifierDate(o)).toBe('future');
    expect(regleCCK11M.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: 'future' });
    expect(regleCCK11.evaluer(o)).toEqual({ resultat: 'OK' });
    expect(regleCCK11M.id).toBe('CC-K11M');
    expect(regleCCK11M.gravite).toBe('M');
    expect(regleCCK11M.bloque).toEqual([]);
    expect(regleCCK11M.declencheurs).toEqual(['arrivee', 'continu', 'a_la_demande']);
    const traces = executerControles([regleCCK11M], [{ type: 'piece', id: 'P1', donnee: o }], 'arrivee', 'h');
    expect(traces[0]?.resultat).toBe('ALERTE');
  });

  it('veille-de-l-exercice-hors-exercice', () => {
    const o = avec({ datePiece: '2025-12-31' });
    expect(qualifierDate(o)).toBe('hors_exercice');
    expect(regleCCK11M.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: 'hors_exercice' });
    expect(qualifierDate(avec({ datePiece: '2027-01-01', dateLecture: '2027-06-01' }))).toBe('hors_exercice');
  });

  it('dernier-jour-de-l-exercice-ok', () => {
    const o = avec({ datePiece: '2026-12-31', dateLecture: '2026-12-31' });
    expect(qualifierDate(o)).toBe('ok');
    expect(qualifierDate(avec({ datePiece: '2026-01-01' }))).toBe('ok');
    expect(regleCCK11M.evaluer(o)).toEqual({ resultat: 'OK' });
    expect(regleCCK11.evaluer(o)).toEqual({ resultat: 'OK' });
  });

  it('lendemain-de-la-lecture-future', () => {
    expect(qualifierDate(avec({ datePiece: '2026-11-07' }))).toBe('future');
    expect(qualifierDate(avec({ datePiece: '2026-11-06' }))).toBe('ok');
  });

  it('apres-arrete', () => {
    const o = avec({ datePiece: '2026-06-02', dateArrete: '2026-06-01' });
    expect(qualifierDate(o)).toBe('apres_arrete');
    expect(regleCCK11M.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: 'apres_arrete' });
    expect(qualifierDate(avec({ datePiece: '2026-06-01', dateArrete: '2026-06-01' }))).toBe('ok');
  });

  it('avant-immatriculation', () => {
    const o = avec({ datePiece: '2026-02-09', dateImmatriculation: '2026-02-10' });
    expect(qualifierDate(o)).toBe('avant_immatriculation');
    expect(regleCCK11M.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: 'avant_immatriculation' });
    expect(qualifierDate(avec({ datePiece: '2026-02-10', dateImmatriculation: '2026-02-10' }))).toBe('ok');
  });

  it('date-invalide-impossible', () => {
    for (const mauvaise of ['2026-02-30', '', '15/03/2026']) {
      const o = avec({ datePiece: mauvaise });
      expect(() => qualifierDate(o)).toThrow('entree_invalide');
      const traces = executerControles([regleCCK11, regleCCK11M], [{ type: 'piece', id: 'P1', donnee: o }], 'arrivee', 'h');
      expect(traces.map((t) => t.resultat)).toEqual(['IMPOSSIBLE', 'IMPOSSIBLE']);
    }
    expect(() => qualifierDate(avec({ dateLecture: '2026-13-01' }))).toThrow('entree_invalide');
    expect(() => qualifierDate(avec({ dateArrete: 'x' }))).toThrow('entree_invalide');
    expect(() => qualifierDate(avec({ dateImmatriculation: '2026-02-30' }))).toThrow('entree_invalide');
  });

  it('aucune-periode-ouverte-premier-jour-null', () => {
    const o = avec({ verrou: { periodesVerrouillees: [], exerciceCloture: true } });
    expect(premierJourOuvert(o)).toBeNull();
    expect(qualifierDate(o)).toBe('periode_close');
    expect(regleCCK11.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: 'aucune_periode_ouverte' });
    // Hors exercice : le verrou de l'exercice ne s'applique pas.
    expect(qualifierDate({ ...o, datePiece: '2025-12-31' })).toBe('hors_exercice');
  });
});
