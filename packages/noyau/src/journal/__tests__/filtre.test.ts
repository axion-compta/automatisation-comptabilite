import { describe, expect, it } from 'vitest';
import { verifierSansSecret } from '../filtre.js';

const jeton = ['eyJ', 'hbGciOi', '.', 'cGF5bG9hZA', '.', 'c2lnbmF0dXJl'].join('');
const iban = ['FR', '00', '1234', '5678', '9012', '3456', '789'].join(' ');

function imbriquer(niveaux: number): unknown {
  let v: unknown = 'x';
  for (let i = 0; i < niveaux; i += 1) v = { a: v };
  return v;
}

describe('verifierSansSecret', () => {
  it('objet-propre-vide', () => {
    expect(verifierSansSecret({ apres: { libelle: 'Société A', lignes: [], n: Number.NaN, m: Infinity, v: '', z: null } })).toEqual([]);
    expect(verifierSansSecret({})).toEqual([]);
    expect(verifierSansSecret('texte')).toEqual([]);
    expect(verifierSansSecret(null)).toEqual([]);
  });

  it('mot-de-passe-trouve', () => {
    expect(verifierSansSecret({ apres: { reglage: { jeton: 'x' } } })).toEqual(['apres.reglage.jeton']);
    const cles = ['mot_de_passe', 'password', 'jeton', 'token', 'secret', 'cle_api', 'api_key', 'authorization', 'contenu_piece', 'code_secours'];
    for (const cle of cles) expect(verifierSansSecret({ [cle]: '' })).toEqual([cle]);
  });

  it('cle-en-majuscules-et-tiret-trouvee', () => {
    expect(verifierSansSecret({ 'Mot-De-Passe': 'x' })).toEqual(['Mot-De-Passe']);
    expect(verifierSansSecret({ 'JETON': 1 })).toEqual(['JETON']);
    expect(verifierSansSecret({ 'Clé_Sécrèt': 1, 'Jétôn': 2 })).toEqual(['Jétôn']);
    expect(verifierSansSecret({ 'Api-Key': 1 })).toEqual(['Api-Key']);
  });

  it('jeton-signe-trouve-en-valeur', () => {
    expect(verifierSansSecret({ note: jeton })).toEqual(['note']);
    expect(verifierSansSecret({ note: 'eyJ.abc' })).toEqual([]);
    expect(verifierSansSecret({ note: jeton.replace('eyJ', 'abc') })).toEqual([]);
    expect(verifierSansSecret({ note: `${jeton} suite` })).toEqual([]);
    expect(verifierSansSecret({ note: `a ${jeton}` })).toEqual([]);
  });

  it('iban-en-clair-trouve', () => {
    expect(verifierSansSecret({ avant: { lignes: [{}, {}, { libelle: iban }] } })).toEqual(['avant.lignes[2].libelle']);
    expect(verifierSansSecret({ a: iban.replace(/ /g, '') })).toEqual(['a']);
    expect(verifierSansSecret({ a: 'FR00 1234' })).toEqual([]);
    expect(verifierSansSecret({ a: `XX${iban}` })).toEqual([]);
    expect(verifierSansSecret({ a: iban.replace('00', 'A0') })).toEqual([]);
    expect(verifierSansSecret({ a: iban.replace('00', '0A') })).toEqual([]);
    expect(verifierSansSecret({ a: iban.slice(1) })).toEqual([]);
    expect(verifierSansSecret({ a: `${iban}${'1'.repeat(30)}` })).toEqual([]);
  });

  it('iban-masque-permis', () => {
    expect(verifierSansSecret({ iban: 'FR00 **** **** 3456' })).toEqual([]);
  });

  it('cle-code-ordinaire-permise', () => {
    expect(verifierSansSecret({ code: 'role_lecture', codes: ['a'], motif: 'ok' })).toEqual([]);
  });

  it('tableau-imbrique-chemin-exact', () => {
    const v = { a: [[{ b: 'ok' }, { token: 1 }], [{ c: iban }]] };
    expect(verifierSansSecret(v)).toEqual(['a[0][1].token', 'a[1][0].c']);
    expect(verifierSansSecret([iban])).toEqual(['[0]']);
    expect(verifierSansSecret(iban)).toEqual(['']);
  });

  it('profondeur-excessive-signalee', () => {
    expect(verifierSansSecret(imbriquer(32))).toEqual([]);
    expect(verifierSansSecret(imbriquer(33))).toEqual(['profondeur']);
    const boucle: Record<string, unknown> = {};
    boucle['a'] = boucle;
    expect(verifierSansSecret(boucle)).toEqual(['profondeur']);
  });
});
