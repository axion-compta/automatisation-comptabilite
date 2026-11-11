// Fiche L05-T60 : port de transcription et faux en mémoire (décision D88 : aucun fournisseur d'IA ne reçoit l'audio).
// L'audio reste en mémoire, est effacé après usage, et n'est jamais écrit (disque, journal). L'implémentation chez
// l'hébergeur attend le feu vert J10 : elle devra respecter ce port.
export const SEGMENT_MAX_MS = 15_000;

export type SegmentAudio = { octets: Uint8Array; dureeMs: number };
export type PortTranscription = { transcrire: (segment: SegmentAudio) => Promise<string> };

export class SegmentTropLong extends Error {
  constructor() {
    super('segment_trop_long');
  }
}

/** Espaces (insécables compris) réduits, virgule décimale : le texte reste éditable ensuite. */
export function normaliser(texte: string): string {
  return texte
    .replace(/\s+/g, ' ')
    .replace(/(\d)\.(\d)/g, '$1,$2')
    .trim();
}

/** Transcrit un segment court ; le segment est effacé dans tous les cas, succès ou échec. */
export async function transcrire(port: PortTranscription, segment: SegmentAudio): Promise<string> {
  try {
    if (!(segment.dureeMs > 0) || segment.dureeMs > SEGMENT_MAX_MS) throw new SegmentTropLong();
    return normaliser(await port.transcrire(segment));
  } finally {
    segment.octets.fill(0);
  }
}

/** « oui » seul n'est un accord qu'après lecture du récapitulatif (A2-05) ; avant, il est ignoré. */
export function estOuiSeul(texte: string): boolean {
  return /^oui[\s.!]*$/i.test(normaliser(texte));
}
export const accepterOui = (texte: string, recapitulatifLu: boolean): boolean => recapitulatifLu && estOuiSeul(texte);

/** Faux en mémoire : rend les textes dans l'ordre, ne garde que le nombre d'appels (jamais d'octets). */
export function creerFauxTranscription(textes: string[]): PortTranscription & { appels: () => number } {
  let n = 0;
  return {
    transcrire: async () => textes[Math.min(n++, textes.length - 1)] ?? '',
    appels: () => n,
  };
}
