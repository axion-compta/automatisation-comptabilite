import { describe, it, expect } from 'vitest';
import { evaluer, mediane, centile, noterChamps } from '../evaluateur.mjs';

const horloge = () => '2026-11-11';
const cas = (id, montant = 1250) => ({ id, entree: { libelle: `Facture fictive ${id}`, client: 'alice@exemple.fr' }, attendu: { montant, compte: '606100', date: '2026-10-31' } });
// faux modèle : renvoie l'attendu du cas, modifié par `change`, au coût donné
const port = (modele, version, couts, change = (c) => c) => {
  let i = 0;
  return { modele, version, repondre: async (c) => ({ champs: change({ ...c.attendu }), cout: couts[i++ % couts.length] }) };
};

describe('evaluateur', () => {
  it('notation-exacte-au-centime', () => {
    const attendu = { montant: 1250, compte: '606100', date: '2026-10-31' };
    expect(noterChamps(attendu, { ...attendu })).toEqual({ exacts: 3, total: 3 });
    expect(noterChamps(attendu, { ...attendu, montant: 1251 }).exacts).toBe(2);
    expect(noterChamps(attendu, { ...attendu, montant: 1249 }).exacts).toBe(2);
    expect(noterChamps(attendu, { ...attendu, montant: 12.5 }).exacts).toBe(2);
    expect(noterChamps(attendu, { ...attendu, montant: '1250' }).exacts).toBe(2);
    expect(noterChamps(attendu, { ...attendu, montant: NaN }).exacts).toBe(2);
    expect(noterChamps(attendu, { ...attendu, compte: '606101' }).exacts).toBe(2);
    expect(noterChamps(attendu, { ...attendu, date: '2026-10-30' }).exacts).toBe(2);
    expect(noterChamps(attendu, { montant: 1250 })).toEqual({ exacts: 1, total: 3 });
    expect(noterChamps(attendu, null)).toEqual({ exacts: 0, total: 3 });
  });

  it('rapport-par-modele', async () => {
    const jeu = [cas('a'), cas('b'), cas('c')];
    const rapports = await evaluer({
      jeu,
      ports: [port('modele-a', 'v1', [10]), port('modele-b', 'v2', [20], (c) => ({ ...c, montant: 1 }))],
      horloge,
    });
    expect(rapports.map((r) => [r.modele, r.version])).toEqual([['modele-a', 'v1'], ['modele-b', 'v2']]);
    expect(rapports[0]).toMatchObject({ cas: 3, casExacts: 3, champsExacts: 9, champsTotal: 9, mesureLe: '2026-11-11' });
    expect(rapports[1]).toMatchObject({ cas: 3, casExacts: 0, champsExacts: 6, champsTotal: 9 });
    expect(JSON.stringify(rapports)).not.toMatch(/cible/);
  });

  it('mediane-et-centile', async () => {
    expect(mediane([30, 10, 20])).toBe(20);
    expect(mediane([10, 20, 30, 41])).toBe(25);
    expect(mediane([7])).toBe(7);
    const couts = Array.from({ length: 10 }, (_, i) => (i + 1) * 100);
    expect(centile(couts, 90)).toBe(900);
    expect(centile([...couts].reverse(), 90)).toBe(900);
    expect(centile([5], 90)).toBe(5);
    const [r] = await evaluer({ jeu: couts.map((_, i) => cas(`k${i}`)), ports: [port('m', 'v', couts)], horloge });
    expect(r).toMatchObject({ coutMedian: 550, coutCentile90: 900 });
    expect(Number.isInteger(r.coutMedian)).toBe(true);
    const coutInvalide = (v) => evaluer({ jeu: [cas('z')], ports: [port('m', 'v', [v])], horloge });
    for (const v of [NaN, Infinity, -1, 1.5, '3', undefined]) await expect(coutInvalide(v)).rejects.toThrow('cout_invalide');
  });

  it('jeu-vide', async () => {
    await expect(evaluer({ jeu: [], ports: [port('m', 'v', [1])], horloge })).rejects.toThrow('jeu_vide');
    await expect(evaluer({ jeu: null, ports: [port('m', 'v', [1])], horloge })).rejects.toThrow('jeu_vide');
    await expect(evaluer({ jeu: [cas('a')], ports: [], horloge })).rejects.toThrow('ports_absents');
    await expect(evaluer({ jeu: [cas('a'), cas('a')], ports: [port('m', 'v', [1])], horloge })).rejects.toThrow('jeu_invalide');
    expect(() => mediane([])).toThrow('jeu_vide');
  });

  it('aucune-donnee-reelle', async () => {
    const iban = ['FR', '76', '0'.repeat(12), 'ABCDEFGHIJK'].join('');
    const refus = (entree) => evaluer({ jeu: [{ ...cas('r'), entree }], ports: [port('m', 'v', [1])], horloge });
    await expect(refus({ client: ['jean', 'exemple.com'].join('@') })).rejects.toThrow('donnee_reelle');
    await expect(refus({ note: `virement ${iban}` })).rejects.toThrow('donnee_reelle');
    await expect(refus({ imbrique: { contact: ['x', 'autre.fr'].join('@') } })).rejects.toThrow('donnee_reelle');
    const groupes = iban.match(/.{1,4}/g).join(' ');
    await expect(refus({ note: `virement ${groupes}` })).rejects.toThrow('donnee_reelle');
    await expect(refus({ note: iban.toLowerCase() })).rejects.toThrow('donnee_reelle');
    await expect(evaluer({ jeu: [{ ...cas('s'), attendu: { montant: 1, contact: ['x', 'autre.fr'].join('@') } }], ports: [port('m', 'v', [1])], horloge })).rejects.toThrow('donnee_reelle');
    await expect(refus({ client: 'alice@exemple.fr' })).resolves.toHaveLength(1);
  });
});
