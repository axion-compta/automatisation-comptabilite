import { describe, it, expect } from 'vitest';
import { defineAutomation, validerManifeste, VERSION_CONTRAT } from '../contrat.mjs';
import base0 from '../module-vide.mjs';
import { executer } from '../faux-hote.mjs';

const T = 'compta.journal_essai';
const jeuEssai = base0.jeuEssai.map((c) => ({ ...c }));
const manifeste = (s = {}) => ({
  code: 'essai-0-5-0',
  version: '1',
  permissions: [],
  actif: false,
  jeuEssai,
  migrer: () => [`CREATE TABLE IF NOT EXISTS ${T} (id integer)`, 'CREATE TABLE compta.autre (id integer)'],
  ...s,
});
const ajoutSeul = () => defineAutomation(manifeste({ tablesAjoutSeul: [T] }));

describe('contrat C4 0.5.0 (hypothese)', () => {
  it('module-version-0-reste-valide', () => {
    expect(VERSION_CONTRAT).toBe('0.5.0');
    expect(validerManifeste(manifeste())).toEqual([]);
    expect(validerManifeste(manifeste({ contrat: '0.5.0' }))).toEqual([]);
    expect(validerManifeste(base0)).toEqual([]);
  });

  it('actions-automatiques-vides-par-defaut', () => {
    const m = defineAutomation(manifeste());
    expect(m.actionsAutomatiquesAutorisees).toEqual([]);
    expect(m.tablesAjoutSeul).toEqual([]);
    expect(Object.isFrozen(m.actionsAutomatiquesAutorisees)).toBe(true);
    expect(Object.isFrozen(m.tablesAjoutSeul)).toBe(true);
    const n = defineAutomation(manifeste({ actionsAutomatiquesAutorisees: ['relance-fictive'] }));
    expect(n.actionsAutomatiquesAutorisees).toEqual(['relance-fictive']);
  });

  it('actions-automatiques-doublon-refuse', () => {
    const e = validerManifeste(manifeste({ actionsAutomatiquesAutorisees: ['a', 'a'] }));
    expect(e).toContain('actions automatiques mal formees');
    expect(() => defineAutomation(manifeste({ actionsAutomatiquesAutorisees: ['a', 'a'] }))).toThrow(/mal formees/);
  });

  it('actions-automatiques-non-texte-refuse', () => {
    for (const v of ['a', [1], [''], ['  '], [null], {}, null]) {
      expect(validerManifeste(manifeste({ actionsAutomatiquesAutorisees: v }))).toContain(
        'actions automatiques mal formees',
      );
    }
  });

  it('version-contrat-inconnue-refusee', () => {
    expect(validerManifeste(manifeste({ contrat: '9.9.9' }))).toContain('version de contrat inconnue');
    expect(validerManifeste(manifeste({ contrat: 5 }))).toContain('version de contrat inconnue');
  });

  it('table-ajout-seul-non-creee-refusee', () => {
    const e = validerManifeste(manifeste({ tablesAjoutSeul: ['compta.absente'] }));
    expect(e).toContain('table ajout seul non creee : compta.absente');
    for (const v of [['journal'], ['Compta.Table'], [T, T], 'x', [3]]) {
      expect(validerManifeste(manifeste({ tablesAjoutSeul: v }))).toContain('tables ajout seul mal formees');
    }
    expect(validerManifeste(manifeste({ tablesAjoutSeul: [T, 'compta.autre'] }))).toEqual([]);
  });

  it('update-sur-table-ajout-seul-refuse', () => {
    const m = ajoutSeul();
    for (const ins of [
      `UPDATE ${T} SET id = 1`,
      `  uPdAtE\n\t${T.toUpperCase()}   set id=2`,
      `/* note */ update ${T} set id = 3 -- fin`,
      `UPDATE ONLY ${T} SET id = 4`,
    ]) {
      expect(() => executer(m, ins)).toThrow(/Instruction refusee \(ajout seul\)/);
    }
  });

  it('delete-sur-table-ajout-seul-refuse', () => {
    const m = ajoutSeul();
    expect(() => executer(m, `DELETE   FROM ${T} WHERE id = 1`)).toThrow(/ajout seul/);
    expect(() => executer(m, `truncate table ${T}`)).toThrow(/ajout seul/);
    expect(() => executer(m, `TRUNCATE ${T}`)).toThrow(/ajout seul/);
  });

  it('insert-sur-table-ajout-seul-permis', () => {
    expect(executer(ajoutSeul(), `INSERT INTO ${T} (id) VALUES (1)`)).toBe('ok');
  });

  it('update-sur-autre-table-permis', () => {
    const m = ajoutSeul();
    expect(executer(m, 'UPDATE compta.autre SET id = 1')).toBe('ok');
    expect(executer(m, `DELETE FROM ${T}_bis WHERE id = 1`)).toBe('ok');
    expect(executer(base0, `UPDATE ${T} SET id = 1`)).toBe('ok');
  });
});
