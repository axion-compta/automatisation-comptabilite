import { createHash } from 'node:crypto';

export type OctetsOuTexte = Uint8Array | string;

export class ErreurDocument extends Error {
  readonly code: 'nom_invalide' | 'nom_en_double' | 'manifeste_illisible';
  constructor(code: ErreurDocument['code'], message: string) {
    super(message);
    this.name = 'ErreurDocument';
    this.code = code;
  }
}

export interface FichierDocument {
  nom: string;
  octets: OctetsOuTexte;
}

export interface LigneManifeste {
  nom: string;
  sha256: string;
}

export interface ResultatVerification {
  ok: boolean;
  manquants: string[];
  modifies: string[];
  enTrop: string[];
}

const LIGNE = /^([0-9a-f]{64}) {2}(.+)$/;

export function empreinteSha256(octets: OctetsOuTexte): string {
  return createHash('sha256').update(octets).digest('hex');
}

function nomValide(nom: string): boolean {
  return nom !== '' && !/[/\\\n\r]/.test(nom);
}

function lignesDe(fichiers: readonly FichierDocument[]): LigneManifeste[] {
  const vus = new Set<string>();
  const lignes: LigneManifeste[] = [];
  for (const f of fichiers) {
    if (!nomValide(f.nom)) throw new ErreurDocument('nom_invalide', 'Nom de fichier invalide.');
    if (vus.has(f.nom)) throw new ErreurDocument('nom_en_double', 'Nom de fichier en double.');
    vus.add(f.nom);
    lignes.push({ nom: f.nom, sha256: empreinteSha256(f.octets) });
  }
  return lignes.sort((a, b) => (a.nom < b.nom ? -1 : 1));
}

export function manifeste(fichiers: readonly FichierDocument[]): string {
  return lignesDe(fichiers)
    .map((l) => `${l.sha256}  ${l.nom}\n`)
    .join('');
}

export function lireManifeste(texte: string): LigneManifeste[] {
  if (texte === '') return [];
  const lignes = texte.split('\n');
  if (lignes[lignes.length - 1] === '') lignes.pop();
  const vus = new Set<string>();
  return lignes.map((ligne) => {
    const m = LIGNE.exec(ligne);
    const nom = m?.[2];
    const sha256 = m?.[1];
    if (nom === undefined || sha256 === undefined || !nomValide(nom) || vus.has(nom)) {
      throw new ErreurDocument('manifeste_illisible', 'Ligne de manifeste illisible.');
    }
    vus.add(nom);
    return { nom, sha256 };
  });
}

export function verifierManifeste(
  texte: string,
  fichiers: readonly FichierDocument[],
): ResultatVerification {
  const attendu = new Map(lireManifeste(texte).map((l) => [l.nom, l.sha256]));
  const recalcule = new Map(lignesDe(fichiers).map((l) => [l.nom, l.sha256]));
  const manquants = [...attendu.keys()].filter((n) => !recalcule.has(n)).sort();
  const enTrop = [...recalcule.keys()].filter((n) => !attendu.has(n)).sort();
  const modifies = [...recalcule.keys()]
    .filter((n) => attendu.has(n) && attendu.get(n) !== recalcule.get(n))
    .sort();
  return {
    ok: manquants.length === 0 && enTrop.length === 0 && modifies.length === 0,
    manquants,
    modifies,
    enTrop,
  };
}
