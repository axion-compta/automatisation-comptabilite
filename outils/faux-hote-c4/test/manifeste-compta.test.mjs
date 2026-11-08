import { describe, it, expect } from 'vitest';
import { defineAutomation, MAX_PERMISSIONS } from '../contrat.mjs';
import { creerBase, migrer, rejouer, verifierJeu } from '../faux-hote.mjs';
import { PERMISSIONS } from '../../../packages/noyau/src/securite/types.ts';
import {
  CODE_MODULE,
  JEU_ESSAI_COMPTA,
  MANIFESTE_COMPTA,
  migrerCompta,
} from '../../../apps/serveur/src/module-c4/manifeste.ts';

describe('manifeste C4 de la compta', () => {
  it('manifeste-compta-accepte', () => {
    const m = defineAutomation(MANIFESTE_COMPTA);
    expect(m.code).toBe(CODE_MODULE);
    expect(m.contrat).toBe('0.5.0');
    expect(m.actif).toBe(false);
  });

  it('permissions-toutes-compta', () => {
    const p = MANIFESTE_COMPTA.permissions;
    expect(p.every((x) => x.startsWith('compta-'))).toBe(true);
    expect(new Set(p).size).toBe(p.length);
    expect(p.length).toBeLessThanOrEqual(MAX_PERMISSIONS);
    expect([...p]).toEqual([...PERMISSIONS]);
  });

  it('jeu-20-cas-panne-et-email-piege', () => {
    const jeu = JEU_ESSAI_COMPTA;
    expect(jeu).toHaveLength(20);
    expect(jeu.map((c) => c.id)).toEqual(jeu.map((_, i) => `compta-${String(i + 1).padStart(2, '0')}`));
    expect(jeu.filter((c) => c.type === 'normal')).toHaveLength(18);
    expect(jeu.filter((c) => c.type === 'panne')).toHaveLength(1);
    const pieges = jeu.filter((c) => c.type === 'email-piege');
    expect(pieges).toHaveLength(1);
    expect(pieges[0].entree.expediteur).toBe('piege@exemple.fr');
    expect(verifierJeu(MANIFESTE_COMPTA)).toBe(true);
  });

  it('interrupteur-ferme-aucune-action', () => {
    const r = rejouer(defineAutomation(MANIFESTE_COMPTA));
    expect(r.actions).toBe(0);
    expect(r.resultats).toEqual([]);
  });

  it('migrer-deux-fois-sans-changement', () => {
    expect(migrerCompta()).toEqual(['CREATE SCHEMA IF NOT EXISTS a_compta']);
    const base = creerBase();
    expect(migrer(MANIFESTE_COMPTA, base).appliquees).toBe(1);
    expect(migrer(MANIFESTE_COMPTA, base).appliquees).toBe(0);
    expect(base.appliquees).toEqual(['CREATE SCHEMA IF NOT EXISTS a_compta']);
  });

  it('actions-automatiques-vides', () => {
    expect(MANIFESTE_COMPTA.actionsAutomatiquesAutorisees).toEqual([]);
    expect(MANIFESTE_COMPTA.tablesAjoutSeul).toEqual([]);
    expect(defineAutomation(MANIFESTE_COMPTA).actionsAutomatiquesAutorisees).toEqual([]);
  });

  it('donnees-fictives', () => {
    const texte = JSON.stringify(JEU_ESSAI_COMPTA);
    const mails = texte.match(/[\w.+-]+@[\w.-]+/g) ?? [];
    expect(mails.length).toBeGreaterThan(0);
    expect(mails.every((e) => e.endsWith('@exemple.fr'))).toBe(true);
    const sirens = JEU_ESSAI_COMPTA.map((c) => c.entree.siren).filter((s) => s !== undefined);
    expect(sirens.length).toBeGreaterThan(0);
    expect(sirens.every((s) => ['123456782', '987654324'].includes(s))).toBe(true);
    expect(JEU_ESSAI_COMPTA.filter((c) => c.type === 'normal').every((c) => c.entree.reference.startsWith('FICT-'))).toBe(true);
  });

  it('manifeste-ouvert-refuse', () => {
    expect(() => defineAutomation({ ...MANIFESTE_COMPTA, actif: true })).toThrow(/interrupteur actif/);
  });
});
