import { createPublicKey, verify } from 'node:crypto';

export class ErreurJournal extends Error {
  override name = 'ErreurJournal';
  readonly code = 'argument_invalide';
  constructor(message = 'argument_invalide') {
    super(message);
  }
}

export type TeteChaine = { societeId: string; sequence: number; empreinte: string };
export type VerificateurSignature = (document: string, signatureBase64: string) => boolean;
export type EvenementSignature = 'cloture' | 'export' | 'nuit';

const EVENEMENTS: readonly string[] = ['cloture', 'export', 'nuit'];
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const refuser = (m: string): never => {
  throw new ErreurJournal(m);
};
const entier = (v: unknown, nom: string): number =>
  Number.isSafeInteger(v) && (v as number) >= 0 ? (v as number) : refuser(nom);
const texte = (v: unknown, nom: string): string => (typeof v === 'string' && v !== '' ? v : refuser(nom));

/** Document canonique : JSON aux clés triées. */
export function documentTete(tete: TeteChaine, horodatage: string): string {
  const h = texte(horodatage, 'horodatage');
  if (Number.isNaN(Date.parse(h))) refuser('horodatage');
  return JSON.stringify({
    empreinte: texte(tete?.empreinte, 'empreinte'),
    horodatage: h,
    sequence: entier(tete.sequence, 'sequence'),
    societeId: texte(tete.societeId, 'societeId'),
  });
}

export function verificateurEd25519(clePubliquePem: string): VerificateurSignature {
  let cle;
  try {
    cle = createPublicKey(texte(clePubliquePem, 'cle'));
  } catch {
    return refuser('cle');
  }
  return (document, signatureBase64) => {
    try {
      return verify(null, Buffer.from(document, 'utf8'), cle, Buffer.from(signatureBase64, 'base64'));
    } catch {
      return false;
    }
  };
}

export function verifierTeteSignee(document: string, signatureBase64: string, verificateur: VerificateurSignature): boolean {
  if (typeof signatureBase64 !== 'string' || signatureBase64 === '' || !BASE64.test(signatureBase64)) return false;
  try {
    return verificateur(document, signatureBase64) === true;
  } catch {
    return false;
  }
}

export function doitSignerTete(
  derniereSignatureMs: number | null,
  maintenantMs: number,
  intervalleMs: number,
  evenement?: EvenementSignature,
): boolean {
  entier(maintenantMs, 'maintenantMs');
  entier(intervalleMs, 'intervalleMs');
  if (evenement !== undefined && !EVENEMENTS.includes(evenement)) refuser('evenement');
  if (derniereSignatureMs === null) return true;
  entier(derniereSignatureMs, 'derniereSignatureMs');
  return evenement !== undefined || maintenantMs - derniereSignatureMs >= intervalleMs;
}
