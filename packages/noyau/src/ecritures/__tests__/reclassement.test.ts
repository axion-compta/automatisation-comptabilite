import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { verifierEcriture, type Ecriture } from '../modele.js';
import { apercuReclassement, appliquer, ErreurReclassement } from '../reclassement.js';

const c = centimes;
const ecr = (id: string, date: string, statut: Ecriture['statut'], compte = '606', extra: Partial<Ecriture> = {}): Ecriture => ({
  id, journal: 'AC', date, statut,
  lignes: [
    { compte, libelle: 'Achat fictif ' + id, debit: c(5000), credit: c(0) },
    { compte: '401', libelle: 'Achat fictif ' + id, debit: c(0), credit: c(5000) },
  ],
  ...extra,
});
const base: readonly Ecriture[] = [
  ecr('e1', '2027-03-10', 'brouillon'),
  ecr('e2', '2027-03-11', 'valide'),
  ecr('e3', '2027-03-12', 'valide', '626'),
  ecr('e4', '2027-01-15', 'valide'),
  ecr('e5', '2027-03-13', 'valide', '606', { contrePassee: true }),
  ecr('e6', '2027-03-14', 'propose'),
];
const verrous = [{ debut: '2027-01-01', fin: '2027-01-31' }];
const filtre = { compteSource: '606' };
const code = (fn: () => unknown): string => {
  try { fn(); } catch (e) { if (e instanceof ErreurReclassement) return e.code; throw e; }
  return 'aucune';
};

describe('correction en masse guidée', () => {
  it('apercu-nombre-annonce', () => {
    const a = apercuReclassement(base, filtre, '625', verrous);
    expect(a.nombre).toBe(2); // e1 et e2 seulement
    expect(a.elements.map((x) => x.ecritureId)).toEqual(['e1', 'e2']);
    expect(a.verrouillees).toBe(1); // e4
    expect(a.ignorees).toBe(2); // e5 déjà contre-passée, e6 proposée
    expect(apercuReclassement(base, { compteSource: '999' }, '625', verrous).nombre).toBe(0);
    expect(apercuReclassement(base, { ...filtre, dateDebut: '2027-03-11' }, '625', verrous).nombre).toBe(1);
    expect(apercuReclassement(base, { ...filtre, dateFin: '2027-03-10' }, '625', verrous).nombre).toBe(1);
    expect(apercuReclassement(base, { ...filtre, dateDebut: '2027-03-10', dateFin: '2027-03-11' }, '625', verrous).nombre).toBe(2);
    expect(code(() => apercuReclassement(base, filtre, '606', verrous))).toBe('cible_identique');
    expect(code(() => apercuReclassement(base, filtre, '', verrous))).toBe('compte_invalide');
    expect(code(() => apercuReclassement(base, { compteSource: ' ' }, '625', verrous))).toBe('compte_invalide');
    expect(code(() => apercuReclassement(base, { ...filtre, dateDebut: '2027-02-30' }, '625', verrous))).toBe('date_invalide');
  });

  it('avant-apres-par-ecriture', () => {
    const a = apercuReclassement(base, filtre, '625', verrous);
    const e1 = a.elements[0];
    expect(e1?.avant.map((l) => l.compte)).toEqual(['606', '401']);
    expect(e1?.apres.map((l) => l.compte)).toEqual(['625', '401']);
    expect(e1?.apres.map((l) => [l.debit, l.credit])).toEqual([[5000, 0], [0, 5000]]); // montants intacts
    // Plusieurs lignes du compte source : toutes reclassées, les autres non.
    const deux: Ecriture = { ...ecr('e7', '2027-03-15', 'brouillon'), lignes: [...ecr('x', '2027-03-15', 'brouillon').lignes.slice(0, 1), { compte: '606', libelle: 'b', debit: c(100), credit: c(0) }, { compte: '401', libelle: 'b', debit: c(0), credit: c(5100) }] };
    expect(apercuReclassement([deux], filtre, '625', []).elements[0]?.apres.map((l) => l.compte)).toEqual(['625', '625', '401']);
  });

  it('validees-par-contre-passation', () => {
    const originale = base[1] as Ecriture;
    const copie = structuredClone(originale);
    const a = apercuReclassement([originale], filtre, '625', verrous);
    const r = appliquer(a, { nombre: 1, date: '2027-04-01', motif: 'Reclassement guidé' });
    expect(originale).toEqual(copie); // jamais modifiée en place
    expect(r.brouillons).toHaveLength(2);
    const [cp, nouvelle] = r.brouillons as [Ecriture, Ecriture];
    expect(cp.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([['606', 0, 5000], ['401', 5000, 0]]);
    expect(nouvelle.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([['625', 5000, 0], ['401', 0, 5000]]);
    for (const e of r.brouillons) { expect(e.statut).toBe('brouillon'); expect(e.lienOriginale).toBe('e2'); expect(e.date).toBe('2027-04-01'); verifierEcriture(e); }
    expect(new Set([cp.id, nouvelle.id, 'e2']).size).toBe(3);
    expect(r.marquees.map((e) => [e.id, e.contrePassee])).toEqual([['e2', true]]);
  });

  it('brouillons-modifies-directement', () => {
    const a = apercuReclassement([base[0] as Ecriture], filtre, '625', verrous);
    const r = appliquer(a, { nombre: 1, date: '2027-04-01', motif: 'Reclassement guidé' });
    expect(r.brouillons).toHaveLength(1);
    expect(r.brouillons[0]).toMatchObject({ id: 'e1', statut: 'brouillon', date: '2027-03-10' });
    expect(r.brouillons[0]?.lignes.map((l) => l.compte)).toEqual(['625', '401']);
    expect(r.marquees).toEqual([]);
    // Confirmation absente ou différente du nombre annoncé : refus.
    const deux = apercuReclassement(base, filtre, '625', verrous);
    for (const n of [1, 0, 3, Number.NaN]) expect(code(() => appliquer(deux, { nombre: n, date: '2027-04-01', motif: 'm' }))).toBe('confirmation_differente');
    expect(code(() => appliquer(apercuReclassement(base, { compteSource: '999' }, '625', verrous), { nombre: 0, date: '2027-04-01', motif: 'm' }))).toBe('rien_a_appliquer');
    expect(code(() => appliquer(deux, { nombre: 2, date: '2027-04-01', motif: ' ' }))).toBe('motif_obligatoire');
    expect(code(() => appliquer(deux, { nombre: 2, date: '2027-13-01', motif: 'm' }))).toBe('date_invalide');
  });

  it('periode-verrouillee-exclue', () => {
    const a = apercuReclassement(base, filtre, '625', verrous);
    expect(a.elements.some((x) => x.ecritureId === 'e4')).toBe(false);
    expect(a.verrouillees).toBe(1);
    const r = appliquer(a, { nombre: 2, date: '2027-04-01', motif: 'm' });
    expect(r.brouillons.some((e) => e.id.includes('e4') || e.lienOriginale === 'e4')).toBe(false);
    // Bornes incluses du verrou.
    const bornes = [ecr('d', '2027-01-01', 'valide'), ecr('f', '2027-01-31', 'valide'), ecr('h', '2027-02-01', 'valide'), ecr('g', '2026-12-31', 'valide')];
    const b = apercuReclassement(bornes, filtre, '625', verrous);
    expect(b.verrouillees).toBe(2);
    expect(b.elements.map((x) => x.ecritureId)).toEqual(['h', 'g']);
    expect(apercuReclassement(bornes, filtre, '625', []).verrouillees).toBe(0);
  });
});
