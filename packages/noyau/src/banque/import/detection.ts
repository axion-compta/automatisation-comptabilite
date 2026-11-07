// Détection du format d'un fichier de relevé par son CONTENU (jamais par le nom ni l'extension), encodage, limites.
// Ordre : PDF, XLSX, XML (CAMT.053, OFX 2), OFX 1 (SGML), CSV/TSV. Les limites sont des arguments (rien en dur).

export type FormatFichier = 'camt053' | 'ofx2' | 'ofx1' | 'pdf' | 'xlsx' | 'csv' | 'inconnu';
export type Encodage = 'utf-8' | 'utf-8-bom' | 'windows-1252';
export type Separateur = ';' | ',' | '\t';

export interface LimitesFichier {
  octetsMax: number;
  lignesMax: number;
}

export class ErreurDetection extends Error {
  override name = 'ErreurDetection';
  readonly code: 'trop_gros' | 'trop_de_lignes' | 'limites_invalides';
  constructor(code: 'trop_gros' | 'trop_de_lignes' | 'limites_invalides') {
    super(code);
    this.code = code;
  }
}

// Windows-1252, octets 0x80 à 0x9F (les cinq cases libres gardent le code de contrôle, comme les navigateurs).
const CP1252_HAUT = [
  0x20ac, 0x81, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030, 0x160, 0x2039, 0x152, 0x8d, 0x17d, 0x8f,
  0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x2dc, 0x2122, 0x161, 0x203a, 0x153, 0x9d, 0x17e, 0x178,
];
const SEPARATEURS: Separateur[] = [';', ',', '\t'];
const LIGNES_ECHANTILLON = 10;
const NOM_XLSX = '[Content_Types].xml';

function commence(octets: Uint8Array, signature: number[]): boolean {
  return octets.length >= signature.length && signature.every((v, i) => octets[i] === v);
}

function contient(octets: Uint8Array, motif: string): boolean {
  const cible = Array.from(motif, (c) => c.charCodeAt(0));
  for (let i = 0; i + cible.length <= octets.length; i += 1) {
    if (cible.every((v, j) => octets[i + j] === v)) return true;
  }
  return false;
}

function utf8Valide(octets: Uint8Array): boolean {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(octets) !== undefined;
  } catch {
    return false;
  }
}

export function detecterEncodage(octets: Uint8Array): Encodage {
  if (commence(octets, [0xef, 0xbb, 0xbf])) {
    return utf8Valide(octets.subarray(3)) ? 'utf-8-bom' : 'windows-1252';
  }
  return utf8Valide(octets) ? 'utf-8' : 'windows-1252';
}

export function decoder(octets: Uint8Array, encodage: Encodage): string {
  if (encodage !== 'windows-1252') return new TextDecoder('utf-8').decode(octets);
  return Array.from(octets, (o) => String.fromCharCode(o >= 0x80 && o <= 0x9f ? (CP1252_HAUT[o - 0x80] ?? o) : o)).join('');
}

function comptePar(ligne: string, separateur: Separateur): number {
  const [compte] = [...ligne].reduce(([n, dedans], c) => [n + (c === separateur && !dedans ? 1 : 0), c === '"' ? !dedans : dedans], [0, false]);
  return compte ?? 0;
}

/** Séparateur constant sur les 10 premières lignes non vides ; une seule ligne de titre sans séparateur est tolérée. */
export function detecterSeparateur(texte: string): Separateur | null {
  const lignes = texte.split(/\r\n|\r|\n/).filter((l) => l.trim() !== '').slice(0, LIGNES_ECHANTILLON);
  let meilleur: Separateur | null = null;
  let meilleurCompte = 0;
  for (const sep of SEPARATEURS) {
    const comptes = lignes.map((l) => comptePar(l, sep));
    const utiles = comptes[0] === 0 ? comptes.slice(1) : comptes;
    const premier = utiles[0] ?? 0;
    if (premier > meilleurCompte && utiles.every((n) => n === premier)) {
      meilleur = sep;
      meilleurCompte = premier;
    }
  }
  return meilleur;
}

function estBinaire(octets: Uint8Array): boolean {
  return octets.some((o) => o === 0x7f || (o < 0x20 && o !== 0x09 && o !== 0x0a && o !== 0x0d));
}

export function detecterFormat(octets: Uint8Array): FormatFichier {
  if (octets.length === 0) return 'inconnu';
  if (commence(octets, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';
  if (commence(octets, [0x50, 0x4b, 0x03, 0x04])) return contient(octets, NOM_XLSX) ? 'xlsx' : 'inconnu';
  if (estBinaire(octets)) return 'inconnu';
  const texte = decoder(octets, detecterEncodage(octets)).trimStart();
  if (texte.startsWith('<')) {
    if (texte.includes('<Document') && texte.includes('camt.053')) return 'camt053';
    return texte.includes('<OFX>') ? 'ofx2' : 'inconnu';
  }
  if (texte.startsWith('OFXHEADER:')) return 'ofx1';
  return detecterSeparateur(texte) === null ? 'inconnu' : 'csv';
}

function compterLignes(texte: string): number {
  let lignes = 0;
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte.charCodeAt(i);
    if (c === 13 && texte.charCodeAt(i + 1) === 10) i += 1;
    if (c === 10 || c === 13) lignes += 1;
  }
  const dernier = texte.charCodeAt(texte.length - 1);
  return texte.length > 0 && dernier !== 10 && dernier !== 13 ? lignes + 1 : lignes;
}

export function verifierLimites(octets: Uint8Array, texte: string, limites: LimitesFichier): void {
  if (![limites.octetsMax, limites.lignesMax].every((n) => Number.isSafeInteger(n) && n > 0)) {
    throw new ErreurDetection('limites_invalides');
  }
  if (octets.length > limites.octetsMax) throw new ErreurDetection('trop_gros');
  if (compterLignes(texte) > limites.lignesMax) throw new ErreurDetection('trop_de_lignes');
}
