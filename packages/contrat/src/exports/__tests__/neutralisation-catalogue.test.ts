import { describe, expect, it } from 'vitest';
import { CARACTERES_DANGEREUX } from '../../../../noyau/src/exports/neutraliser.js';
import { exporterListe, sourcesParDefaut } from '../../domaines/exports-service.js';
import { contrat } from '../../routes.js';
import { catalogueExportable, type ColonneExport, type ListeExportable, type TypeColonne } from '../catalogue.js';

type Exporteur = typeof exporterListe;
type Format = 'csv' | 'xlsx';
const FORMATS: Format[] = ['csv', 'xlsx'];
const APOSTROPHE = String.fromCodePoint(0x27);
const BOM = String.fromCodePoint(0xfeff);
const OPTIONS = { code: 'liste', jour: '2026-10-15' };
const NEUTRES: Record<TypeColonne, unknown> = { texte: 'abc', entier: 1, centimes: 100, date: '2026-01-15', booleen: true };
const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// Les 11 valeurs de la fiche, écrites en dur : indépendantes de la constante du noyau.
const DANGEREUX = ['=1+1', '+1', '-1', '@A1', '\t=1', '\r=1', '\n=1', '\uFF1D1', '\uFF0B1', '\uFF0D1', '\uFF201'];

const catalogue = catalogueExportable(contrat);
const reliees = new Set(Object.keys(sourcesParDefaut()));
const verifiees = catalogue.filter((l) => reliees.has(l.code));

const neutre = (colonnes: ColonneExport[]): Record<string, unknown> => Object.fromEntries(colonnes.map((c) => [c.code, NEUTRES[c.type]]));
const decoder = (octets: Uint8Array): string => new TextDecoder().decode(octets);

/** Relit un CSV (BOM, « ; », CRLF, guillemets doublés) : une cellule peut contenir CR et LF entre guillemets. */
function lireCsv(texte: string): string[][] {
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let cellule = '';
  let entre = false;
  let ferme = false;
  const corps = texte.startsWith(BOM) ? texte.slice(1) : texte;
  const fin = (): void => {
    ligne.push(cellule);
    cellule = '';
    ferme = false;
  };
  for (let i = 0; i < corps.length; i++) {
    const c = corps[i]!;
    if (entre && c !== '"') cellule += c;
    else if (entre && corps[i + 1] === '"') {
      cellule += c;
      i++;
    } else if (entre) {
      entre = false;
      ferme = true;
    } else if (c === ';') fin();
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && corps[i + 1] === '\n') i++;
      fin();
      lignes.push(ligne);
      ligne = [];
    } else if (ferme) throw new Error('caractère après un guillemet fermant');
    else if (c === '"' && cellule === '') entre = true;
    else cellule += c;
  }
  return lignes;
}

const dexml = (s: string): string => s.replace(/&(lt|gt|quot|apos|amp);/g, (_, n: string) => ({ lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' })[n]!);
/** Cellules `inlineStr` de la feuille : référence → texte. Les autres cellules ne sont pas des chaînes. */
function chainesXlsx(feuille: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const x of feuille.matchAll(/<c r="([A-Z]+[0-9]+)" t="inlineStr"><is><t xml:space="preserve">([\s\S]*?)<\/t><\/is><\/c>/g)) m.set(x[1]!, dexml(x[2]!));
  return m;
}

/** Vérifie toutes les colonnes texte (et les en-têtes) d'un exporteur ; rend la liste des écarts, vide si tout passe. */
function verifierExporteur(exporteur: Exporteur, listes: readonly ListeExportable[], formats: readonly Format[] = FORMATS): string[] {
  const ecarts: string[] = [];
  for (const liste of listes) {
    liste.colonnes.forEach((col, rang) => {
      if (col.type === 'texte') {
        const lignes = DANGEREUX.map((v) => ({ ...neutre(liste.colonnes), [col.code]: v }));
        for (const format of formats) {
          const f = exporteur(liste, format, lignes, OPTIONS);
          if (format === 'csv') {
            const rows = lireCsv(decoder(f.octets));
            const attendu = 1 + DANGEREUX.length + (liste.colonneTotal === undefined ? 0 : 1);
            if (rows.length !== attendu || rows.some((r) => r.length !== liste.colonnes.length)) ecarts.push(`${liste.code}.${col.code} csv structure`);
          }
          DANGEREUX.forEach((v, i) => {
            const lu = format === 'csv' ? lireCsv(decoder(f.octets))[i + 1]?.[rang] : chainesXlsx(f.parties?.['xl/worksheets/sheet1.xml'] ?? '').get(LETTRES[rang]! + String(i + 2));
            if (lu !== APOSTROPHE + v) ecarts.push(`${liste.code}.${col.code} ${format} #${i}`);
          });
        }
      }
      // En-tête forgé : le code de colonne devient « =X » et sert d'en-tête.
      const forgee = { ...liste, colonnes: liste.colonnes.map((c, j) => (j === rang ? { ...c, code: '=X' } : c)), ...(liste.colonneTotal === col.code ? { colonneTotal: '=X' } : {}) };
      const ligne = { ...neutre(forgee.colonnes) };
      for (const format of formats) {
        const f = exporteur(forgee, format, [ligne], OPTIONS);
        const lu = format === 'csv' ? lireCsv(decoder(f.octets))[0]?.[rang] : chainesXlsx(f.parties?.['xl/worksheets/sheet1.xml'] ?? '').get(LETTRES[rang]! + '1');
        if (lu !== APOSTROPHE + '=X') ecarts.push(`${liste.code} entete ${col.code} ${format}`);
      }
    });
  }
  return ecarts;
}

/** Aucune partie du classeur ne contient de balise de formule. */
function formulesXlsx(exporteur: Exporteur, listes: readonly ListeExportable[]): string[] {
  const ecarts: string[] = [];
  for (const liste of listes) {
    const lignes = DANGEREUX.map((v) => Object.fromEntries(liste.colonnes.map((c) => [c.code, c.type === 'texte' ? v : NEUTRES[c.type]])));
    for (const [nom, contenu] of Object.entries(exporteur(liste, 'xlsx', lignes, OPTIONS).parties ?? {})) {
      if (/<f[\s>/]/.test(contenu)) ecarts.push(`${liste.code} ${nom}`);
    }
  }
  return ecarts;
}

/** Exporteur forgé : il écrit les colonnes texte telles quelles (apostrophe retirée, formule ajoutée). */
const forge: Exporteur = (liste, format, lignes, options) => {
  const f = exporterListe(liste, format, lignes, options);
  if (format === 'csv') return { ...f, octets: new TextEncoder().encode(decoder(f.octets).split('"' + APOSTROPHE).join('"')) };
  const parties = { ...f.parties };
  const cle = 'xl/worksheets/sheet1.xml';
  parties[cle] = (parties[cle] ?? '').split('preserve">&apos;').join('preserve">').replace('<sheetData>', '<sheetData><f>1+1</f>');
  return { ...f, parties };
};

/** Forgé CSV : cellules texte brutes, sans guillemets ni apostrophe. */
const forgeCsvBrut: Exporteur = (liste, format, lignes, options) => {
  const f = exporterListe(liste, format, lignes, options);
  if (format !== 'csv') return f;
  const brut = decoder(f.octets).split('"' + APOSTROPHE).join('"').split('"').join('');
  return { ...f, octets: new TextEncoder().encode(brut) };
};

describe('neutralisation de toutes les colonnes texte du catalogue', () => {
  it('csv-toutes-colonnes-tous-caracteres', () => {
    expect(DANGEREUX).toEqual([...CARACTERES_DANGEREUX].map((c, i) => c + DANGEREUX[i]!.slice(1)));
    expect(verifiees.length).toBeGreaterThan(0);
    expect(verifierExporteur(exporterListe, verifiees, ['csv'])).toEqual([]);
  });

  it('xlsx-toutes-colonnes-tous-caracteres', () => {
    expect(verifierExporteur(exporterListe, verifiees, ['xlsx'])).toEqual([]);
  });

  it('xlsx-aucune-formule', () => {
    expect(formulesXlsx(exporterListe, verifiees)).toEqual([]);
  });

  it('exporteur-forge-sans-neutralisation-detecte', () => {
    for (const format of FORMATS) expect(verifierExporteur(forge, verifiees, [format]).length).toBeGreaterThan(0);
    expect(formulesXlsx(forge, verifiees).length).toBeGreaterThan(0);
    expect(verifierExporteur(forgeCsvBrut, verifiees, ['csv']).length).toBeGreaterThan(0);
  });

  // L15-T04 : visible mais jamais rouge, une nouvelle liste d autre lot ne doit pas casser la CI.
  for (const l of catalogue.filter((x) => !reliees.has(x.code))) it.todo(`liste non reliée à exporterListe : ${l.code}`);
});
