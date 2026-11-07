// Stockage des pièces chiffré par enveloppe : clé de données par objet, enveloppée par la clé du client (interface, jamais de clé dans le dépôt).
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { sha256Hex } from '../etape-entree.js';
import type { StockagePieces } from '../ports.js';

export interface ContexteDepot { tenantId: string; societeId: string; pieceId: string; sha256: string; reel: boolean }
export interface Enveloppe {
  sceller(clair: Uint8Array, donneesAssociees: Uint8Array): Uint8Array;
  ouvrir(scelle: Uint8Array, donneesAssociees: Uint8Array): Uint8Array;
}

export class ErreurStockage extends Error {
  override name = 'ErreurStockage';
  constructor(readonly code: 'pieces_reelles_non_autorisees' | 'dechiffrement_refuse' | 'sha256_incoherent', message: string) { super(message); }
}

const LONGUEUR_CLE = 32;
const LONGUEUR_IV = 12;
const LONGUEUR_ETIQUETTE = 16;

function chiffrerAes(cle: Uint8Array, clair: Uint8Array, aad: Uint8Array): Uint8Array {
  const iv = randomBytes(LONGUEUR_IV);
  const c = createCipheriv('aes-256-gcm', cle, iv);
  c.setAAD(aad);
  const corps = Buffer.concat([c.update(clair), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), corps]);
}
function dechiffrerAes(cle: Uint8Array, scelle: Uint8Array, aad: Uint8Array): Uint8Array {
  const d = createDecipheriv('aes-256-gcm', cle, scelle.subarray(0, LONGUEUR_IV));
  d.setAAD(aad);
  d.setAuthTag(Buffer.from(scelle.subarray(LONGUEUR_IV, LONGUEUR_IV + LONGUEUR_ETIQUETTE)));
  return new Uint8Array(Buffer.concat([d.update(scelle.subarray(LONGUEUR_IV + LONGUEUR_ETIQUETTE)), d.final()]));
}

/** Enveloppe AES-256-GCM : clé de données aléatoire par objet, enveloppée par `cleClient` (fournie par l'appelant). */
export function creerEnveloppeAes(cleClient: Uint8Array): Enveloppe {
  if (cleClient.length !== LONGUEUR_CLE) throw new RangeError('clé client de longueur invalide');
  const tailleCleEnveloppee = LONGUEUR_IV + LONGUEUR_ETIQUETTE + LONGUEUR_CLE;
  return {
    sceller(clair, aad) {
      const cleDonnees = randomBytes(LONGUEUR_CLE);
      return Buffer.concat([chiffrerAes(cleClient, cleDonnees, aad), chiffrerAes(cleDonnees, clair, aad)]);
    },
    ouvrir(scelle, aad) {
      const cleDonnees = dechiffrerAes(cleClient, scelle.subarray(0, tailleCleEnveloppee), aad);
      return dechiffrerAes(cleDonnees, scelle.subarray(tailleCleEnveloppee), aad);
    },
  };
}

const encoder = new TextEncoder();
const donneesAssociees = (c: ContexteDepot): Uint8Array => encoder.encode([c.tenantId, c.societeId, c.pieceId, c.sha256].join('\n'));

export class StockageChiffre implements StockagePieces {
  constructor(
    private readonly interieur: StockagePieces,
    private readonly enveloppe: Enveloppe,
    private readonly piecesReellesAutorisees: () => boolean,
    private readonly contexteDeCle: (cle: string) => ContexteDepot,
  ) {}

  async deposerSiAbsent(cle: string, octets: Uint8Array): Promise<'depose' | 'existe'> {
    const contexte = this.contexteDeCle(cle);
    if (contexte.reel && !this.piecesReellesAutorisees()) throw new ErreurStockage('pieces_reelles_non_autorisees', 'dépôt de pièce réelle refusé : réglage pieces_reelles_autorisees à faux');
    if (contexte.sha256 !== sha256Hex(octets)) throw new ErreurStockage('sha256_incoherent', 'empreinte annoncée différente du contenu');
    if ((await this.interieur.lire(cle)) !== null) return 'existe';
    return this.interieur.deposerSiAbsent(cle, this.enveloppe.sceller(octets, donneesAssociees(contexte)));
  }

  async lire(cle: string): Promise<Uint8Array | null> {
    const scelle = await this.interieur.lire(cle);
    if (scelle === null) return null;
    try {
      return this.enveloppe.ouvrir(scelle, donneesAssociees(this.contexteDeCle(cle)));
    } catch {
      throw new ErreurStockage('dechiffrement_refuse', 'déchiffrement refusé : objet altéré ou rattaché à une autre pièce');
    }
  }
}
