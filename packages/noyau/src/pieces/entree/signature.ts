export type TypeReel = 'pdf' | 'jpeg' | 'png' | 'heic' | 'webp' | 'tiff' | 'xml' | 'zip' | 'eml' | 'msg' | 'csv';
export type ResultatType = { type: TypeReel } | { refus: 'type_refuse' | 'macro_refusee'; raison: string };

const ascii = (t: string): number[] => Array.from(t, (c) => c.charCodeAt(0));
const utf16 = (t: string): number[] => ascii(t).flatMap((c) => [c, 0]);
const a = (o: Uint8Array, motif: number[], depuis: number): boolean =>
  o.length >= depuis + motif.length && motif.every((v, i) => o[depuis + i] === v);
const contient = (o: Uint8Array, motif: number[]): boolean => {
  for (let i = 0; i + motif.length <= o.length; i++) if (a(o, motif, i)) return true;
  return false;
};
const MARQUES_HEIC = ['heic', 'heix', 'mif1', 'msf1'].map(ascii);
const EN_TETES_EML = ['received:', 'return-path:', 'from:', 'mime-version:', 'message-id:', 'date:'];

function estXml(o: Uint8Array): boolean {
  let i = a(o, [0xef, 0xbb, 0xbf], 0) ? 3 : 0;
  while (i < o.length && [0x20, 0x09, 0x0a, 0x0d].includes(o[i] as number)) i++;
  return a(o, ascii('<?xml'), i);
}

function estEml(o: Uint8Array): boolean {
  const ligne: number[] = [];
  for (const v of o) {
    if (v === 0x0a || v === 0x0d) {
      if (ligne.every((c) => c === 0x20 || c === 0x09)) { ligne.length = 0; continue; }
      break;
    }
    if (v > 0x7e || (v < 0x20 && v !== 0x09)) return false;
    ligne.push(v);
  }
  const texte = String.fromCharCode(...ligne).toLowerCase();
  return EN_TETES_EML.some((e) => texte.startsWith(e));
}

function estCsv(o: Uint8Array): boolean {
  if (o.includes(0)) return false;
  let texte: string;
  try { texte = new TextDecoder('utf-8', { fatal: true }).decode(o); } catch { return false; }
  const lignes = texte.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() !== '');
  return [';', ',', '\t'].some((sep) => {
    const vus = new Set<number>();
    for (const l of lignes) {
      const n = l.split(sep).length - 1;
      if (n < 1) continue;
      if (vus.has(n)) return true;
      vus.add(n);
    }
    return false;
  });
}

export function typeReel(octets: Uint8Array): ResultatType {
  const ok = (type: TypeReel): ResultatType => ({ type });
  if (a(octets, ascii('%PDF-'), 0)) return ok('pdf');
  if (a(octets, [0xff, 0xd8, 0xff], 0)) return ok('jpeg');
  if (a(octets, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)) return ok('png');
  if (a(octets, ascii('ftyp'), 4) && MARQUES_HEIC.some((m) => a(octets, m, 8))) return ok('heic');
  if (a(octets, ascii('RIFF'), 0) && a(octets, ascii('WEBP'), 8)) return ok('webp');
  if (a(octets, [0x49, 0x49, 0x2a, 0x00], 0) || a(octets, [0x4d, 0x4d, 0x00, 0x2a], 0)) return ok('tiff');
  if (a(octets, [0x50, 0x4b, 0x03, 0x04], 0)) return ok('zip');
  if (estXml(octets)) return ok('xml');
  if (a(octets, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 0)) {
    if (contient(octets, utf16('_VBA_PROJECT'))) return { refus: 'macro_refusee', raison: 'ole_macro' };
    if (contient(octets, utf16('__substg1.0_'))) return ok('msg');
    return { refus: 'type_refuse', raison: 'ole_inconnu' };
  }
  if (estEml(octets)) return ok('eml');
  if (estCsv(octets)) return ok('csv');
  return { refus: 'type_refuse', raison: 'signature_inconnue' };
}
