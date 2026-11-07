import { describe, expect, it } from 'vitest';
import { empreinteSha256 } from '../../documents/empreinte.js';
import { ErreurImportFec, lireNomFichierFec, verifierAvantImport } from '../import.js';
import type { OptionsFec } from '../format.js';
import type { ChampFec, ColonneFec } from '../lignes.js';

const CRLF = String.fromCharCode(13, 10);
const options: OptionsFec = { separateur: '|', finDeLigne: CRLF, longueurMaxLibelle: 100 };
const champs: ChampFec[] = ['journalCode', 'ecritureNum', 'ecritureDate', 'ecritureLib', 'debit', 'credit'];
const colonnes: ColonneFec[] = champs.map((champ) => ({ champ, entete: champ }));
const lecture = {
  colonnes,
  options,
  finDeLigne: CRLF,
  marqueOrdreAcceptee: false,
  obligatoires: ['journalCode', 'ecritureNum', 'ecritureDate', 'ecritureLib'] as ChampFec[],
};
const SOCIETE = '123456782';
const AUTRE = '987654324';
const NOM = `${SOCIETE}FEC20261231.txt`;
const exercice = { debut: '2026-01-01', fin: '2026-12-31' };
const entete = champs.join('|');
const debit = 'VE|1|20260115|Vente fictive|10,00|0,00';
const credit = 'VE|1|20260115|Vente fictive|0,00|10,00';

const octets = (...lignes: string[]): Uint8Array => new TextEncoder().encode(lignes.join(CRLF) + CRLF);
const propre = octets(entete, debit, credit);
const verifier = (nomFichier: string, contenu: Uint8Array, deja: readonly string[] = []) =>
  verifierAvantImport({ nomFichier, octets: contenu, sirenSociete: SOCIETE, exercice, empreintesDejaImportees: deja, lecture });
const codes = (r: ReturnType<typeof verifier>): string[] => (r.ok ? [] : r.codes);

describe('vérification avant import du FEC', () => {
  it('fichier-propre-accepte', () => {
    const r = verifier(NOM, propre);
    expect(r).toEqual({ ok: true, empreinte: empreinteSha256(propre), lignes: 2 });
    expect(verifier(`${SOCIETE}FEC20261231.TXT`, propre).ok).toBe(true);
    expect(verifier(`${SOCIETE}FEC20260101.txt`, propre).ok).toBe(true); // bornes comprises
    expect(verifier(NOM, propre, ['0'.repeat(64)]).ok).toBe(true);
    expect(lireNomFichierFec(NOM)).toEqual({ siren: SOCIETE, dateCloture: '2026-12-31', travail: false });
    expect(lireNomFichierFec(`${SOCIETE}FEC20261231_TRAVAIL.Txt`)).toEqual({ siren: SOCIETE, dateCloture: '2026-12-31', travail: true });
  });
  it('autre-entreprise-refuse', () => {
    expect(codes(verifier(`${AUTRE}FEC20261231.txt`, propre))).toEqual(['autre_entreprise']);
  });
  it('doublon-par-empreinte', () => {
    const r = verifier(NOM, propre, ['1'.repeat(64), empreinteSha256(propre)]);
    expect(codes(r)).toEqual(['doublon']);
    const autre = octets(entete, debit.replace('10,00', '11,00'), credit.replace('10,00', '11,00'));
    expect(verifier(NOM, autre, [empreinteSha256(propre)]).ok).toBe(true);
  });
  it('nom-invalide-refuse', () => {
    const mauvais = [
      `12345678FEC20261231.txt`,
      `1234567821FEC20261231.txt`,
      `${SOCIETE}FEC20260230.txt`,
      `${SOCIETE}FEC20261231`,
      `${SOCIETE}FEC20261231.csv`,
      `${SOCIETE}fec20261231.txt`,
      `${SOCIETE}FEC2026123.txt`,
      `${SOCIETE}FEC20261231_travail.txt`,
      `${SOCIETE}FEC20261231_TRAVAIL_TRAVAIL.txt`,
      `x${SOCIETE}FEC20261231.txt`,
      `${SOCIETE}FEC20261231.txt `,
      `${SOCIETE}FEC20261331.txt`,
      '',
    ];
    for (const nom of mauvais) {
      expect(() => lireNomFichierFec(nom), nom).toThrow(ErreurImportFec);
      expect(codes(verifier(nom, propre)), nom).toEqual(['nom_invalide']);
    }
    try {
      lireNomFichierFec('x');
    } catch (e) {
      expect(e).toBeInstanceOf(ErreurImportFec);
      expect((e as ErreurImportFec).code).toBe('nom_invalide');
    }
  });
  it('fichier-de-travail-refuse', () => {
    expect(codes(verifier(`${SOCIETE}FEC20261231_TRAVAIL.txt`, propre))).toEqual(['fichier_de_travail']);
  });
  it('desequilibre-liste-ecarts', () => {
    const r = verifier(NOM, octets(entete, debit, credit.replace('0,00|10,00', '0,00|9,99')));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.codes).toEqual(['equilibre']);
    expect(r.ecarts.map((e) => e.regleId)).toEqual(['FEC-E01', 'FEC-E02']);
    expect(r.ecarts[0]?.ecartCentimes).toBe(1);
  });
  it('plusieurs-codes-tries', () => {
    const tordu = octets(entete, debit.replace('20260115', '20250115'), credit.replace('20260115', '20250115').replace('10,00', '9,00'));
    const r = verifierAvantImport({
      nomFichier: `${AUTRE}FEC20271231_TRAVAIL.txt`,
      octets: tordu,
      sirenSociete: SOCIETE,
      exercice,
      empreintesDejaImportees: [empreinteSha256(tordu)],
      lecture,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.codes).toEqual(['autre_entreprise', 'cloture_hors_exercice', 'dates', 'doublon', 'equilibre', 'fichier_de_travail']);
    expect(r.ecarts.some((e) => e.regleId === 'FEC-E03')).toBe(true);
    expect(codes(verifier(`${SOCIETE}FEC20270101.txt`, propre))).toEqual(['cloture_hors_exercice']);
    expect(codes(verifier(`${SOCIETE}FEC20251231.txt`, propre))).toEqual(['cloture_hors_exercice']);
    // octets vides, entête fausse, ligne à colonne manquante : structure, sans doublon de code
    expect(codes(verifier(NOM, new Uint8Array()))).toEqual(['structure']);
    const r2 = verifier(NOM, octets('a|b', 'VE|1|20260115|Vente fictive|10,00'));
    expect(codes(r2)).toEqual(['structure']);
    if (!r2.ok) expect(r2.ecarts.map((e) => e.regleId)).toEqual(['FEC-S01', 'FEC-S02']);
    expect(codes(verifier('?', new Uint8Array()))).toEqual(['nom_invalide', 'structure']);
  });
});
