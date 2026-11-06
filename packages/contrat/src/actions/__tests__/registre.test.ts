import { describe, expect, it } from 'vitest';
import { peutAgir, registre, roleAutorise } from '../index.js';

const tous = new Set(Object.keys(registre.interrupteurs));
const ecritures = ['proposer', 'valider', 'annuler'];

describe("registre d'actions", () => {
  it('le rôle lecture lit mais ne valide pas', () => {
    expect(peutAgir(registre, 'lecture', 'lire', tous)).toBe(true);
    expect(peutAgir(registre, 'lecture', 'valider', tous)).toBe(false);
  });
  it("l'utilisateur peut valider", () => {
    expect(peutAgir(registre, 'utilisateur', 'valider', tous)).toBe(true);
  });
  it("le comptable n'écrit pas tant que la DEMANDE 5 n'est pas acceptée (ROL-002)", () => {
    for (const id of ecritures) expect(peutAgir(registre, 'comptable', id, tous)).toBe(false);
    expect(peutAgir(registre, 'comptable', 'lister', tous)).toBe(true);
  });
  it("le personnel Axion n'a aucun outil d'écriture", () => {
    for (const id of ecritures) expect(peutAgir(registre, 'personnel_axion', id, tous)).toBe(false);
  });
  it("une action exclue n'est permise à aucun rôle", () => {
    for (const { id } of registre.roles) expect(peutAgir(registre, id, 'exporter', tous)).toBe(false);
  });
  it('rôle, action et outil inconnus sont refusés', () => {
    expect(peutAgir(registre, 'inconnu', 'lire', tous)).toBe(false);
    expect(peutAgir(registre, 'administrateur', 'inconnue', tous)).toBe(false);
    expect(roleAutorise(registre, 'administrateur', 'outil_inconnu')).toBe(false);
  });
  it("interrupteur coupé : refus même pour l'administrateur", () => {
    expect(peutAgir(registre, 'administrateur', 'lire')).toBe(false);
    expect(peutAgir(registre, 'administrateur', 'lire', new Set(['ecriture']))).toBe(false);
    expect(peutAgir(registre, 'administrateur', 'lire', new Set(['lecture']))).toBe(true);
  });
  it('__proto__ et constructor refusés sans exception', () => {
    for (const cle of ['__proto__', 'constructor', 'toString']) {
      expect(roleAutorise(registre, cle, 'outil_lire')).toBe(false);
      expect(peutAgir(registre, cle, 'lire', tous)).toBe(false);
    }
  });
  it('chaque action a un outil ou une exclusion, jamais les deux', () => {
    for (const a of registre.actions) expect(Boolean(a.outil) !== Boolean(a.exclusion)).toBe(true);
  });
});
