import { describe, expect, it } from 'vitest';
import type { ParametresLecture } from '../controles-structure.js';
import { lireFecTiers } from '../lecture-tiers.js';
import type { ChampFec, ColonneFec } from '../lignes.js';

const CRLF = String.fromCharCode(13, 10);
const LF = String.fromCharCode(10);
const champs: ChampFec[] = ['journalCode', 'ecritureNum', 'ecritureDate', 'dateLet', 'ecritureLib', 'debit', 'credit'];
const colonnes: ColonneFec[] = champs.map((champ) => ({ champ, entete: champ }));
const base: ParametresLecture = {
  colonnes,
  options: { separateur: '|', finDeLigne: CRLF, longueurMaxLibelle: 100 },
  finDeLigne: CRLF,
  marqueOrdreAcceptee: false,
  obligatoires: ['journalCode', 'ecritureNum', 'ecritureDate', 'ecritureLib'],
};
const corps = (sep: string, fin: string, libelle = 'Achat fictif'): string =>
  [champs.join(sep), ['AC', 'AC-1', '20260115', '', libelle, '10,00', '0,00'].join(sep)].join(fin) + fin;
const octets = (t: string): Uint8Array => new TextEncoder().encode(t);

/** Latin-9 : é = 0xE9, € = 0xA4, le reste ASCII. */
function latin9(t: string): Uint8Array {
  const table: Record<string, number> = { 'é': 0xe9, '€': 0xa4 };
  return Uint8Array.from(Array.from(t), (c) => table[c] ?? c.charCodeAt(0));
}

describe('lecture FEC tiers : détection du format', () => {
  it('tabulation-et-barre-verticale', () => {
    const tab = lireFecTiers(octets(corps('\t', CRLF)), base);
    expect(tab.ok).toBe(true);
    if (tab.ok) {
      expect(tab.format.separateur).toBe('\t');
      expect(tab.ecarts).toEqual([]);
      expect(tab.lignes).toHaveLength(1);
    }
    const barre = lireFecTiers(octets(corps('|', LF)), base);
    expect(barre.ok).toBe(true);
    if (barre.ok) {
      expect(barre.format.separateur).toBe('|');
      expect(barre.format.finDeLigne).toBe(LF);
      expect(barre.ecarts).toEqual([]);
    }
    // une fin de ligne mixte n'est pas devinée : un seul style est retenu, l'écart est rendu
    const mixte = lireFecTiers(octets(corps('|', CRLF).replace(CRLF, LF)), base);
    expect(mixte.ok && mixte.ecarts.length > 0).toBe(true);
  });

  it('bom-utf8-accepte', () => {
    const avec = new Uint8Array([0xef, 0xbb, 0xbf, ...octets(corps('|', CRLF, 'Café'))]);
    const r = lireFecTiers(avec, base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.format.marqueOrdre).toBe(true);
      expect(r.format.encodage).toBe('utf-8');
      expect(r.ecarts).toEqual([]);
      expect(r.lignes[0]?.valeurs.ecritureLib).toBe('Café');
    }
    // marque d'ordre suivie d'un corps en Latin-9 : la marque est retirée avant le décodage
    const mixteBom = new Uint8Array([0xef, 0xbb, 0xbf, ...latin9(corps('|', CRLF, 'Café'))]);
    const rm = lireFecTiers(mixteBom, base);
    expect(rm.ok && rm.format.encodage).toBe('latin-9');
    expect(rm.ok && rm.format.marqueOrdre).toBe(true);
    const sans = lireFecTiers(octets(corps('|', CRLF)), base);
    expect(sans.ok && sans.format.marqueOrdre).toBe(false);
  });

  it('latin9-accepte', () => {
    const r = lireFecTiers(latin9(corps('|', CRLF, 'Café 5€')), base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.format.encodage).toBe('latin-9');
      expect(r.lignes[0]?.valeurs.ecritureLib).toBe('Café 5€');
      expect(r.ecarts).toEqual([]);
    }
    const utf8 = lireFecTiers(octets(corps('|', CRLF, 'Café 5€')), base);
    expect(utf8.ok && utf8.format.encodage).toBe('utf-8');
  });

  it('format-inconnu-refus-clair', () => {
    const inconnus = [
      octets(champs.join(';') + CRLF + 'AC;AC-1;20260115;;x;1,00;0,00' + CRLF), // point-virgule
      octets(''),
      octets(champs.slice(0, 3).join('|') + CRLF),
      Uint8Array.from([0, 1, 2, 0xff, 0xfe, 0, 0]), // binaire
      octets(champs.join('|').replace('debit', 'Debit') + CRLF), // en-tête étranger
    ];
    // un octet nul dans un fichier au reste valide : refus, pas de lecture partielle
    inconnus.push(octets(corps('|', CRLF, 'Achat' + String.fromCharCode(0) + 'fictif')));
    for (const contenu of inconnus) {
      expect(lireFecTiers(contenu, base)).toEqual({ ok: false, code: 'format_fec_inconnu' });
    }
  });

  it('normalise-puis-controles-existants', () => {
    const mauvais = corps('\t', LF).replace('20260115', '20260230');
    const r = lireFecTiers(latin9(mauvais), base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ecarts.map((e) => e.regleId)).toEqual(['FEC-S03']);
    // le contrôle strict de l'export refuse toujours la marque d'ordre
    const avecMarque = new Uint8Array([0xef, 0xbb, 0xbf, ...octets(corps('|', CRLF))]);
    const r2 = lireFecTiers(avecMarque, { ...base, marqueOrdreAcceptee: false });
    expect(r2.ok && r2.ecarts).toEqual([]);
  });
});
