import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { Ecriture, LigneEcriture, StatutEcriture } from '../../ecritures/modele.js';
import { instantaneCloture, relireExercice } from '../relecture-exercice.js';

function ligne(compte: string, debit: number, credit: number): LigneEcriture {
  return { compte, libelle: 'Libellé fictif', debit: centimes(debit), credit: centimes(credit) };
}
function ecr(id: string, statut: StatutEcriture, lignes: LigneEcriture[]): Ecriture {
  return { id, numero: 'VE-' + id, date: '2026-03-01', journal: 'VE', statut, lignes };
}

const vente1 = ecr('1', 'valide', [ligne('411000', 1000000, 0), ligne('706000', 0, 1000000)]);
const vente2 = ecr('2', 'valide', [ligne('411000', 900000, 0), ligne('706000', 0, 900000)]);
const sha = (t: string): string => createHash('sha256').update(t).digest('hex');

describe('instantané de clôture et relecture', () => {
  it('relecture-intacte', () => {
    const liste = [vente1, vente2];
    const inst = instantaneCloture('ex-2026', liste);
    expect(inst.exerciceId).toBe('ex-2026');
    expect(inst.totalDebit).toBe(1900000);
    expect(inst.totalCredit).toBe(1900000);
    expect(inst.nbLignes).toBe(4);
    expect(inst.empreinteBalance).toMatch(/^[0-9a-f]{64}$/);
    const r = relireExercice(liste, inst);
    expect(r).toEqual({
      statut: 'intact',
      ecartDebit: 0,
      ecartCredit: 0,
      empreinteIdentique: true,
      nbLignesIdentique: true,
    });
  });

  it('empreinte-sur-texte-canonique', () => {
    const inst = instantaneCloture('ex', [vente1, vente2]);
    expect(inst.empreinteBalance).toBe(sha('411000;1900000;0\n706000;0;1900000'));
  });

  it('alteration-d-un-centime-detectee', () => {
    const inst = instantaneCloture('ex-2026', [vente1, vente2]);
    const altere = ecr('2', 'valide', [ligne('411000', 900001, 0), ligne('706000', 0, 900000)]);
    const r = relireExercice([vente1, altere], inst);
    expect(r.statut).toBe('altere');
    expect(r.ecartDebit).toBe(1);
    expect(r.ecartCredit).toBe(0);
    expect(r.empreinteIdentique).toBe(false);
    expect(r.nbLignesIdentique).toBe(true);
    const r2 = relireExercice([vente1, ecr('2', 'valide', [ligne('411000', 899999, 0), ligne('706000', 0, 900000)])], inst);
    expect(r2.ecartDebit).toBe(-1);
    const r3 = relireExercice([vente1, ecr('2', 'valide', [ligne('411000', 900000, 0), ligne('706000', 0, 900001)])], inst);
    expect(r3.ecartCredit).toBe(1);
    expect(r3.statut).toBe('altere');
  });

  it('ordre-des-ecritures-sans-effet', () => {
    const a = instantaneCloture('ex', [vente1, vente2]);
    const b = instantaneCloture('ex', [vente2, vente1]);
    expect(b).toEqual(a);
    expect(relireExercice([vente2, vente1], a).statut).toBe('intact');
  });

  it('brouillon-ignore', () => {
    const brouillon = ecr('3', 'brouillon', [ligne('411000', 500, 0), ligne('706000', 0, 500)]);
    const propose = ecr('4', 'propose', [ligne('411000', 700, 0), ligne('706000', 0, 700)]);
    const base = instantaneCloture('ex', [vente1, vente2]);
    const avec = instantaneCloture('ex', [vente1, vente2, brouillon, propose]);
    expect(avec).toEqual(base);
    expect(relireExercice([vente1, vente2, brouillon], base).statut).toBe('intact');
  });

  it('ligne-ajoutee-detectee', () => {
    const inst = instantaneCloture('ex', [vente1, vente2]);
    const neutre = ecr('5', 'valide', [ligne('411000', 0, 0), ligne('706000', 0, 0)]);
    const r = relireExercice([vente1, vente2, neutre], inst);
    expect(r.nbLignesIdentique).toBe(false);
    expect(r.ecartDebit).toBe(0);
    expect(r.ecartCredit).toBe(0);
    expect(r.empreinteIdentique).toBe(true);
    expect(r.statut).toBe('altere');
  });

  it('empreinte-detecte-un-compte-change', () => {
    const inst = instantaneCloture('ex', [vente1]);
    const autre = ecr('1', 'valide', [ligne('411000', 1000000, 0), ligne('707000', 0, 1000000)]);
    const r = relireExercice([autre], inst);
    expect(r.ecartDebit).toBe(0);
    expect(r.ecartCredit).toBe(0);
    expect(r.nbLignesIdentique).toBe(true);
    expect(r.empreinteIdentique).toBe(false);
    expect(r.statut).toBe('altere');
  });

  it('exercice-vide', () => {
    const inst = instantaneCloture('ex-vide', []);
    expect(inst.totalDebit).toBe(0);
    expect(inst.totalCredit).toBe(0);
    expect(inst.nbLignes).toBe(0);
    expect(inst.empreinteBalance).toBe(sha(''));
    expect(relireExercice([], inst).statut).toBe('intact');
    expect(relireExercice([vente1], inst).statut).toBe('altere');
  });

  it('instantanes-independants', () => {
    const premier = instantaneCloture('ex-2026', [vente1, vente2]);
    const copie = structuredClone(premier);
    const rouvert = [vente1, vente2, ecr('6', 'valide', [ligne('411000', 100, 0), ligne('706000', 0, 100)])];
    const second = instantaneCloture('ex-2026', rouvert);
    expect(second).not.toEqual(premier);
    expect(second.totalDebit).toBe(1900100);
    expect(premier).toEqual(copie);
    expect(relireExercice([vente1, vente2], premier).statut).toBe('intact');
    expect(relireExercice(rouvert, second).statut).toBe('intact');
    expect(relireExercice(rouvert, premier).statut).toBe('altere');
  });
});
