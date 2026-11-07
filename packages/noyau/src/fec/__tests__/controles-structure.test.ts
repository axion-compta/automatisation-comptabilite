import { describe, expect, it } from 'vitest';
import { REGLES_STRUCTURE, lireFichierFec } from '../controles-structure.js';
import type { OptionsFec } from '../format.js';
import type { ChampFec, ColonneFec } from '../lignes.js';

const CRLF = String.fromCharCode(13, 10);
const LF = String.fromCharCode(10);
const options: OptionsFec = { separateur: '|', finDeLigne: CRLF, longueurMaxLibelle: 100 };
const champs: ChampFec[] = ['journalCode', 'ecritureNum', 'ecritureDate', 'dateLet', 'ecritureLib', 'debit', 'credit'];
const colonnes: ColonneFec[] = champs.map((champ) => ({ champ, entete: champ }));
const obligatoires: ChampFec[] = ['journalCode', 'ecritureNum', 'ecritureDate', 'ecritureLib'];
const entete = champs.join('|');
const bonne = 'AC|AC-1|20260115||Achat fictif|10,00|0,00';

function octets(texte: string): Uint8Array {
  return new TextEncoder().encode(texte);
}
function fichier(...lignes: string[]): Uint8Array {
  return octets(lignes.join(CRLF) + CRLF);
}
function lire(contenu: Uint8Array, extra: { marqueOrdreAcceptee?: boolean; finDeLigne?: string } = {}) {
  return lireFichierFec(contenu, {
    colonnes,
    options,
    finDeLigne: extra.finDeLigne ?? CRLF,
    marqueOrdreAcceptee: extra.marqueOrdreAcceptee ?? false,
    obligatoires,
  });
}
const ids = (r: { ecarts: { regleId: string }[] }): string[] => r.ecarts.map((e) => e.regleId);

describe('contrôles de structure du FEC', () => {
  it('fichier-propre-zero-ecart', () => {
    const r = lire(fichier(entete, bonne, 'AC|AC-2|20260116|20260201|Autre|0,00|10,00'));
    expect(r.ecarts).toEqual([]);
    expect(r.lignes).toHaveLength(2);
    expect(r.lignes[0]?.numero).toBe(2);
    expect(r.lignes[1]?.numero).toBe(3);
    expect(r.lignes[0]?.valeurs.ecritureLib).toBe('Achat fictif');
    expect(r.lignes[1]?.valeurs.dateLet).toBe('20260201');
    // sans fin de ligne finale : accepté aussi
    expect(lire(octets([entete, bonne].join(CRLF))).ecarts).toEqual([]);
  });

  it('entete-different-s01', () => {
    const r = lire(fichier(entete.replace('debit', 'Debit'), bonne));
    expect(r.ecarts).toEqual([{ regleId: 'FEC-S01', ligne: 1 }]);
    expect(r.lignes).toHaveLength(1); // les lignes suivantes sont quand même lues
    expect(ids(lire(fichier('a|b', bonne)))).toEqual(['FEC-S01']);
  });

  it('colonne-manquante-s02', () => {
    const r = lire(fichier(entete, 'AC|AC-1|20260115||Achat fictif|10,00', bonne));
    expect(r.ecarts).toEqual([{ regleId: 'FEC-S02', ligne: 2, valeur: '6' }]);
    expect(r.lignes.map((l) => l.numero)).toEqual([3]);
    expect(ids(lire(fichier(entete, bonne + '|x')))).toEqual(['FEC-S02']);
  });

  it('date-30-fevrier-s03', () => {
    const r = lire(fichier(entete, 'AC|AC-1|20260230||Achat|10,00|0,00', 'AC|AC-2|20260115|NaN|Achat|10,00|0,00'));
    expect(r.ecarts).toEqual([
      { regleId: 'FEC-S03', ligne: 2, champ: 'ecritureDate', valeur: '20260230' },
      { regleId: 'FEC-S03', ligne: 3, champ: 'dateLet', valeur: 'NaN' },
    ]);
    expect(r.lignes).toEqual([]);
    expect(ids(lire(fichier(entete, 'AC|AC-1|2026-01-15||Achat|10,00|0,00')))).toEqual(['FEC-S03']);
  });

  it('montant-avec-point-s04', () => {
    const r = lire(fichier(entete, 'AC|AC-1|20260115||Achat|1234.56|0,00'));
    expect(r.ecarts).toEqual([{ regleId: 'FEC-S04', ligne: 2, champ: 'debit', valeur: '1234.56' }]);
    for (const mauvais of ['', '1,5', '-1,00', 'Infinity', '01,00', '1 000,00']) {
      expect(ids(lire(fichier(entete, `AC|AC-1|20260115||Achat|0,00|${mauvais}`)))).toEqual(['FEC-S04']);
    }
  });

  it('obligatoire-vide-s05', () => {
    const r = lire(fichier(entete, 'AC||20260115||Achat|10,00|0,00', 'AC|AC-2|20260115|| |10,00|0,00'));
    expect(r.ecarts).toEqual([
      { regleId: 'FEC-S05', ligne: 2, champ: 'ecritureNum' },
      { regleId: 'FEC-S05', ligne: 3, champ: 'ecritureLib' },
    ]);
    expect(ids(lire(fichier(entete, 'AC|AC-1||| Achat|10,00|0,00')))).toEqual(['FEC-S05']);
  });

  it('ligne-vide-s06', () => {
    const r = lire(fichier(entete, bonne, '', bonne));
    expect(r.ecarts).toEqual([{ regleId: 'FEC-S06', ligne: 3 }]);
    expect(r.lignes.map((l) => l.numero)).toEqual([2, 4]);
    // deux fins de ligne finales : la seconde est une ligne vide
    expect(ids(lire(octets(entete + CRLF + bonne + CRLF + CRLF)))).toEqual(['FEC-S06']);
  });

  it('marque-ordre-refusee-s07', () => {
    const avec = new Uint8Array([0xef, 0xbb, 0xbf, ...fichier(entete, bonne)]);
    const refusee = lire(avec);
    expect(refusee.ecarts).toEqual([{ regleId: 'FEC-S07', ligne: 1 }]);
    expect(refusee.lignes).toHaveLength(1);
    expect(lire(avec, { marqueOrdreAcceptee: true }).ecarts).toEqual([]);
    expect(lire(fichier(entete, bonne), { marqueOrdreAcceptee: true }).ecarts).toEqual([]);
  });

  it('debit-et-credit-s08', () => {
    const r = lire(fichier(entete, 'AC|AC-1|20260115||Achat|10,00|5,00', 'AC|AC-2|20260115||Achat|0,00|0,00'));
    expect(r.ecarts).toEqual([{ regleId: 'FEC-S08', ligne: 2 }]);
    expect(r.lignes.map((l) => l.numero)).toEqual([3]);
  });

  it('encodage-invalide-s09', () => {
    const casse = new Uint8Array([...octets(entete + CRLF + 'AC|AC-1|20260115||'), 0xff, 0xfe, ...octets('|1,00|0,00' + CRLF)]);
    const r = lire(casse);
    expect(r.ecarts).toEqual([{ regleId: 'FEC-S09', ligne: 1 }]);
    expect(r.lignes).toEqual([]);
  });

  it('cas-limites-zero-octet-entete-seul-fin-de-ligne', () => {
    expect(lire(new Uint8Array(0))).toEqual({ lignes: [], ecarts: [{ regleId: 'FEC-S01', ligne: 1 }] });
    expect(lire(fichier(entete))).toEqual({ lignes: [], ecarts: [] });
    // LF au lieu de CR LF : écart, pas d'exception
    const lf = octets([entete, bonne].join(LF) + LF);
    expect(() => lire(lf)).not.toThrow();
    expect(lire(lf).ecarts.length).toBeGreaterThan(0);
    expect(lire(lf, { finDeLigne: LF }).ecarts).toEqual([]); // avec LF attendu, le même fichier est propre
    // CR LF dans le fichier mais LF attendu : écart de structure, pas d'exception
    expect(lire(fichier(entete, bonne), { finDeLigne: LF }).ecarts.length).toBeGreaterThan(0);
  });

  it('mille-lignes-a-graine-fixe', () => {
    let graine = 12345;
    const lignes = [entete];
    for (let i = 0; i < 1000; i += 1) {
      graine = (graine * 1103515245 + 12345) % 2147483648;
      const centimes = String(graine % 100).padStart(2, '0');
      lignes.push(`AC|AC-${String(i)}|20260115||Achat ${String(i)}|${String(graine % 1000)},${centimes}|0,00`);
    }
    const r = lire(fichier(...lignes));
    expect(r.ecarts).toEqual([]);
    expect(r.lignes).toHaveLength(1000);
  });

  it('regles-structure-completes', () => {
    expect(REGLES_STRUCTURE.map((r) => r.id)).toEqual(
      ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09'].map((s) => `FEC-${s}`),
    );
    for (const r of REGLES_STRUCTURE) {
      expect(r.source).toBe('a_sourcer');
      expect(r.libelle).not.toContain(',');
      expect(r.testId.endsWith(r.id.slice(-3).toLowerCase())).toBe(true);
    }
  });
});
