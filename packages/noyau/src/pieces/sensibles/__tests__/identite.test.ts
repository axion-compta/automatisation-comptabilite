import { describe, expect, it } from 'vitest';
import { ErreurPiece } from '../../types.js';
import { chiffreControleMrz, contientMrz, deciderSensibilite, motsTrouves } from '../identite.js';
import { MOTIFS_SENSIBLES } from '../motifs.js';

// Calcul indépendant du code testé ; toutes les MRZ sont inventées et construites à l'exécution.
const ctrl = (s: string): number => [...s].reduce((t, c, i) => t + (c === '<' ? 0 : parseInt(c, 36)) * [7, 3, 1][i % 3]!, 0) % 10;
const NUM = 'XY1234567';
const td3 = (num = NUM, c = ctrl(NUM)): string =>
  `P<UTODUPONT<<CLARA<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n${(num + c + 'UTO7408122F3001019').padEnd(44, '<')}`;
const td1 = (num = NUM, c = ctrl(NUM)): string => `I<UTO${num}${c}`.padEnd(30, '<') + '\nDUPONT<<CLARA';
const aucun = { detectionsChiffrees: [] };

describe('identite', () => {
  it('mrz-td3-fictive-detectee', () => {
    expect(td3()).toContain('\n');
    expect(contientMrz(td3())).toBe(true);
    expect(contientMrz(`Page 1\r\n${td3().replace('\n', '\r\n')}`)).toBe(true);
    expect(contientMrz(td3().replace(/\n(.*)/, (_, l: string) => '\n' + l.slice(0, 10) + ' ' + l.slice(10)))).toBe(true);
    const td2 = (NUM + ctrl(NUM) + 'UTO7408122F3001019').padEnd(36, '<');
    expect(td2).toHaveLength(36);
    expect(contientMrz(td2)).toBe(true);
    expect(deciderSensibilite({ texte: td3(), ...aucun })).toMatchObject({ sensible: true, motifs: ['piece_identite'], appelIaPermis: false });
  });
  it('mrz-cle-fausse-ignoree', () => {
    for (let c = 0; c < 10; c++) if (c !== ctrl(NUM)) expect(contientMrz(td3(NUM, c))).toBe(false);
    expect(contientMrz(td3(NUM, ctrl(NUM)).slice(0, -1))).toBe(false);
    expect(contientMrz(td3(NUM, ctrl(NUM)) + '<')).toBe(false);
    expect(contientMrz('<'.repeat(44))).toBe(false);
    expect(contientMrz('a'.repeat(44))).toBe(false);
    expect(deciderSensibilite({ texte: td3(NUM, (ctrl(NUM) + 1) % 10), ...aucun }).sensible).toBe(false);
    expect(chiffreControleMrz('<<<')).toBe(0);
    expect(() => chiffreControleMrz('a')).toThrow(ErreurPiece);
    expect(chiffreControleMrz('A1<Z')).toBe(ctrl('A1<Z'));
  });
  it('mrz-td1-detectee', () => {
    expect(td1().split('\n')[0]).toHaveLength(30);
    expect(contientMrz(td1())).toBe(true);
    expect(contientMrz(td1(NUM, (ctrl(NUM) + 3) % 10))).toBe(false);
    expect(contientMrz(td1().replace('I<UTO', 'I<UT'))).toBe(false);
  });
  it('mot-cle-identite-sans-accent', () => {
    const l = MOTIFS_SENSIBLES.pieceIdentite;
    expect(motsTrouves("Copie de la CARTE Nationale d’Identité", l)).toEqual(["carte nationale d'identite"]);
    expect(motsTrouves('Titre de séjour', l)).toEqual(['titre de sejour']);
    expect(motsTrouves('mon passeport-exemple', l)).toEqual(['passeport']);
    expect(motsTrouves('passeports-exemple', l)).toEqual([]);
    expect(motsTrouves('antipassport', l)).toEqual([]);
    expect(motsTrouves('passport', [])).toEqual([]);
    expect(deciderSensibilite({ texte: 'PASSPORT', ...aucun }).motifs).toEqual(['piece_identite']);
    expect(motsTrouves('a.b', ['a.b', 'axb'])).toEqual(['a.b']);
  });
  it('bulletin-de-paie-sensible', () => {
    const d = deciderSensibilite({ texte: 'Bulletin de paie de mars', ...aucun });
    expect(d).toEqual({ sensible: true, motifs: ['sante_paie'], masquages: [], appelIaPermis: false, versionMotifs: 1 });
    expect(deciderSensibilite({ texte: 'Arrêt de travail', ...aucun }).motifs).toEqual(['sante_paie']);
    expect(deciderSensibilite({ texte: 'payslip', ...aucun }).sensible).toBe(true);
  });
  it('nir-rend-sensible', () => {
    const d = deciderSensibilite({ texte: 'texte', detectionsChiffrees: [{ motif: 'carte_paiement' }, { motif: 'nir' }] });
    expect(d).toMatchObject({ sensible: true, motifs: ['nir'], masquages: ['nir', 'carte_paiement'], appelIaPermis: false });
    expect(deciderSensibilite({ texte: 'texte', detectionsChiffrees: [{ motif: 'iban' }] })).toMatchObject({ sensible: false, masquages: ['iban'] });
  });
  it('facture-ordinaire-non-sensible', () => {
    const d = deciderSensibilite({ texte: 'Facture 2024-001 de la société Exemple, total à payer.', ...aucun });
    expect(d).toEqual({ sensible: false, motifs: [], masquages: [], appelIaPermis: true, versionMotifs: 1 });
  });
  it('mot-de-passe-masquage-sans-sensible', () => {
    const d = deciderSensibilite({ texte: 'Votre Mot de passe est exemple', ...aucun });
    expect(d).toMatchObject({ sensible: false, motifs: [], masquages: ['secret'], appelIaPermis: true });
    expect(deciderSensibilite({ texte: 'code PIN', detectionsChiffrees: [{ motif: 'nir' }] })).toMatchObject({ masquages: ['nir', 'secret'], sensible: true });
  });
  it('texte-vide', () => {
    expect(deciderSensibilite({ texte: '', ...aucun })).toEqual({ sensible: false, motifs: [], masquages: [], appelIaPermis: true, versionMotifs: 1 });
    expect(contientMrz('')).toBe(false);
    expect(motsTrouves('', MOTIFS_SENSIBLES.secrets)).toEqual([]);
  });
});
