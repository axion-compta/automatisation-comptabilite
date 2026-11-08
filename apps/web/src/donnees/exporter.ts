import { ErreurEcriture, ecrire, nouvelleCle } from '../api.js';
import { FORMATS_EXPORT, ReponseExport } from '../../../../packages/contrat/src/domaines/exports.js';

export type FormatExport = (typeof FORMATS_EXPORT)[number];
export type FiltresExport = Record<string, string | number>;
export type CodeErreurExporter = 'trop_gros' | 'au_dela_du_direct' | 'introuvable' | 'autre';
/** Codes d'erreur du contrat (`exporter`) vers les cas affichés. */
const CODES: Record<string, CodeErreurExporter> = {
  EXPORT_TROP_GROS: 'trop_gros',
  EXPORT_EN_TACHE_A_VENIR: 'au_dela_du_direct',
  LISTE_NON_EXPORTABLE: 'introuvable',
};
export class ErreurExporter extends Error {
  constructor(readonly code: CodeErreurExporter) {
    super('Export impossible : ' + code);
    this.name = 'ErreurExporter';
  }
}
function octets(base64: string): Uint8Array<ArrayBuffer> {
  const brut = atob(base64);
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}
/**
 * Exporte les lignes d'une liste (mêmes filtres que l'écran) et déclenche le téléchargement.
 * Le nom du fichier est celui rendu par le serveur ; l'URL d'objet est libérée dans tous les cas.
 */
export async function exporter(liste: string, format: FormatExport, filtres: FiltresExport, cle: string = nouvelleCle()): Promise<void> {
  let rep;
  try {
    rep = await ecrire('POST', '/exports', { liste, format, filtres }, ReponseExport, cle);
  } catch (e) {
    throw new ErreurExporter(e instanceof ErreurEcriture ? (CODES[e.code] ?? 'autre') : 'autre');
  }
  const { nom, typeContenu, octetsBase64 } = rep.body;
  const url = URL.createObjectURL(new Blob([octets(octetsBase64)], { type: typeContenu }));
  try {
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nom;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
