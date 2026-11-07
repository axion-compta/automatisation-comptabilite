import { describe, expect, it } from 'vitest';
import type { GraviteAlerte } from '../../interface/types.js';
import { cleDedoublonnage, ErreurAlerte, evaluer, type Alerte, type Constat } from '../moteur.js';

const T = '2026-10-01T08:00:00Z';
const compteur = () => {
  let n = 0;
  return () => `a${++n}`;
};
const constat = (gravite: GraviteAlerte = 'a_faire', objetId = 'o1', regle = 'R1'): Constat => ({ regle, objetType: 'piece', objetId, periode: '2026-09', gravite });
const alerte = (p: Partial<Alerte> = {}): Alerte => ({
  id: 'x1',
  regle: 'R1',
  objetType: 'piece',
  objetId: 'o1',
  periode: '2026-09',
  cle: 'R1|piece|o1|2026-09',
  gravite: 'a_faire',
  etat: 'ouverte',
  version: 1,
  ...p,
});

describe('moteur d alertes', () => {
  it('nouveau-constat-ouvre', () => {
    const r = evaluer([], [{ ...constat('urgent'), echeanceLe: '2026-10-15' }], ['R1'], T, compteur());
    expect(r.alertes).toEqual([{ ...alerte({ id: 'a1', gravite: 'urgent' }), echeanceLe: '2026-10-15' }]);
    expect(r.journal).toEqual([{ alerteId: 'a1', aEtat: 'ouverte', aGravite: 'urgent', cause: 'evaluation', acteurType: 'systeme', le: T }]);
    const sansPeriode = evaluer([], [{ regle: 'R1', objetType: 'piece', objetId: 'o1', gravite: 'info' }], ['R1'], T, compteur());
    expect(sansPeriode.alertes[0]).toEqual({ id: 'a1', regle: 'R1', objetType: 'piece', objetId: 'o1', cle: 'R1|piece|o1', gravite: 'info', etat: 'ouverte', version: 1 });
  });

  it('meme-cle-pas-de-doublon', () => {
    for (const etat of ['ouverte', 'reportee'] as const) {
      const r = evaluer([alerte({ etat })], [constat()], ['R1'], T, compteur());
      expect(r.alertes).toEqual([alerte({ etat })]);
      expect(r.journal).toEqual([]);
    }
  });

  it('deux-constats-meme-cle-une-alerte', () => {
    const a = evaluer([], [constat('info'), constat('bloquant')], ['R1'], T, compteur());
    const b = evaluer([], [constat('bloquant'), constat('info')], ['R1'], T, compteur());
    expect(a.alertes).toHaveLength(1);
    expect(a.alertes[0]?.gravite).toBe('bloquant');
    expect(b.alertes).toEqual(a.alertes);
    expect(evaluer([], [constat('urgent'), constat('urgent')], ['R1'], T, compteur()).alertes).toHaveLength(1);
  });

  it('ignoree-non-recreee', () => {
    for (const g of ['a_faire', 'info'] as const) {
      const ign = alerte({ etat: 'ignoree' });
      const r = evaluer([ign], [constat(g)], ['R1'], T, compteur());
      expect(r.alertes).toEqual([ign]);
      expect(r.journal).toEqual([]);
    }
  });

  it('ignoree-rouverte-si-plus-grave', () => {
    const r = evaluer([alerte({ etat: 'ignoree' })], [constat('urgent')], ['R1'], T, compteur());
    expect(r.alertes).toEqual([alerte({ etat: 'ouverte', gravite: 'urgent', version: 2 })]);
    expect(r.journal).toEqual([
      { alerteId: 'x1', deEtat: 'ignoree', aEtat: 'ouverte', deGravite: 'a_faire', aGravite: 'urgent', cause: 'evaluation', acteurType: 'systeme', le: T },
    ]);
  });

  it('condition-disparue-resolue-auto-journal', () => {
    for (const etat of ['ouverte', 'reportee'] as const) {
      const r = evaluer([alerte({ etat })], [], ['R1'], T, compteur());
      expect(r.alertes).toEqual([alerte({ etat: 'resolue_auto', version: 2 })]);
      expect(r.journal).toEqual([
        { alerteId: 'x1', deEtat: etat, aEtat: 'resolue_auto', deGravite: 'a_faire', aGravite: 'a_faire', cause: 'fermeture_auto', acteurType: 'systeme', le: T },
      ]);
    }
    // Autre objet constaté : l'alerte de o1 disparaît quand même.
    expect(evaluer([alerte()], [constat('a_faire', 'o2')], ['R1'], T, compteur()).alertes.map((a) => a.etat)).toEqual(['resolue_auto', 'ouverte']);
    // Ignorée, résolue : pas de nouvelle fermeture.
    for (const etat of ['ignoree', 'resolue', 'resolue_auto'] as const) {
      expect(evaluer([alerte({ etat })], [], ['R1'], T, compteur()).journal).toEqual([]);
    }
  });

  it('regle-non-evaluee-intacte', () => {
    const autre = alerte({ regle: 'R2', cle: 'R2|piece|o1|2026-09' });
    const r = evaluer([autre], [], ['R1'], T, compteur());
    expect(r.alertes).toEqual([autre]);
    expect(r.journal).toEqual([]);
    expect(evaluer([autre], [], [], T, compteur()).alertes).toEqual([autre]);
  });

  it('gravite-change-version-et-journal', () => {
    for (const g of ['bloquant', 'info'] as const) {
      const r = evaluer([alerte({ etat: 'reportee' })], [constat(g)], ['R1'], T, compteur());
      expect(r.alertes).toEqual([alerte({ etat: 'reportee', gravite: g, version: 2 })]);
      expect(r.journal).toEqual([
        { alerteId: 'x1', deEtat: 'reportee', aEtat: 'reportee', deGravite: 'a_faire', aGravite: g, cause: 'evaluation', acteurType: 'systeme', le: T },
      ]);
    }
  });

  it('evaluer-deux-fois-meme-resultat', () => {
    const existantes = [alerte({ id: 'x2', cle: 'R1|piece|o9|2026-09', objetId: 'o9' })];
    const entree = JSON.stringify(existantes);
    const constats = [constat('urgent'), constat('info', 'o2')];
    const un = evaluer(existantes, constats, ['R1'], T, compteur());
    expect(JSON.stringify(existantes)).toBe(entree);
    const deux = evaluer(un.alertes, constats, ['R1'], T, compteur());
    expect(deux.alertes).toEqual(un.alertes);
    expect(deux.journal).toEqual([]);
    expect(un.alertes.map((a) => a.etat)).toEqual(['resolue_auto', 'ouverte', 'ouverte']);
  });

  it('cle-invalide-refusee', () => {
    expect(cleDedoublonnage('R1', 'piece', 'o1')).toBe('R1|piece|o1');
    expect(cleDedoublonnage('R1', 'piece', 'o1', '2026-09')).toBe('R1|piece|o1|2026-09');
    const mauvais: [string, string, string, string?][] = [
      ['', 'piece', 'o1'],
      ['R1', '', 'o1'],
      ['R1', 'piece', ''],
      ['R1', 'piece', 'o1', ''],
      ['R|1', 'piece', 'o1'],
      ['R1', 'pi|ece', 'o1'],
      ['R1', 'piece', 'o|1'],
      ['R1', 'piece', 'o1', '2026|09'],
    ];
    for (const m of mauvais) expect(() => cleDedoublonnage(...m)).toThrow(ErreurAlerte);
    expect(() => evaluer([], [constat('info', '')], ['R1'], T, compteur())).toThrow(ErreurAlerte);
  });
});
