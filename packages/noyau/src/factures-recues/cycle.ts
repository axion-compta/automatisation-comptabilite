// Noyau des factures reçues (V3-DEC-020, V3-VEN-045, V3-TVA-039) : partie pure, sans réseau.
// Le logiciel reçoit des factures électroniques, il n'en émet pas. Toutes les fonctions rendent un nouvel état.
import { type Centimes, ajouter, centimes } from '../argent/index.js';

export type CodeErreurFactureRecue = 'siren_invalide' | 'numero_invalide' | 'date_invalide' | 'montant_invalide';

export class ErreurFactureRecue extends Error {
  override name = 'ErreurFactureRecue';
  readonly code: CodeErreurFactureRecue;
  constructor(code: CodeErreurFactureRecue) {
    super(code);
    this.code = code;
  }
}

export interface FactureRecue {
  source: string;
  idExterne: string;
  sirenEmetteur: string;
  sirenDestinataire: string;
  numero: string;
  date: string;
  ttc: Centimes;
  tva: Centimes;
  cle: string;
  /** Clé de la facture d'origine si celle-ci est un doublon rattaché, sinon null. */
  rattacheeA: string | null;
}

export interface EtatFacturesRecues {
  factures: FactureRecue[];
}

export interface Arrivee {
  source: string;
  idExterne: string;
  sirenEmetteur: string;
  sirenDestinataire: string;
  numero: string;
  date: string;
  ttc: Centimes;
  tva: Centimes;
}

export type ResultatReception = 'nouvelle' | 'rejouee' | 'doublon_rattache' | 'autre_destinataire';

const SIREN = /^\d{9}$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function verifierSiren(siren: string): void {
  if (!SIREN.test(siren)) throw new ErreurFactureRecue('siren_invalide');
}

function verifierMontant(montant: number): void {
  if (!Number.isSafeInteger(montant) || montant < 0) throw new ErreurFactureRecue('montant_invalide');
}

export function cleDedoublonnage(f: { sirenEmetteur: string; numero: string; date: string; ttc: Centimes }): string {
  verifierSiren(f.sirenEmetteur);
  const numero = f.numero.replace(/\s+/g, '').toUpperCase();
  if (numero === '') throw new ErreurFactureRecue('numero_invalide');
  if (!DATE.test(f.date)) throw new ErreurFactureRecue('date_invalide');
  verifierMontant(f.ttc);
  return `${f.sirenEmetteur}|${numero}|${f.date}|${String(f.ttc)}`;
}

export function recevoir(
  etat: EtatFacturesRecues,
  arrivee: Arrivee,
  sirenSociete: string,
): { etat: EtatFacturesRecues; resultat: ResultatReception } {
  const cle = cleDedoublonnage(arrivee);
  verifierSiren(arrivee.sirenDestinataire);
  verifierSiren(sirenSociete);
  verifierMontant(arrivee.tva);
  if (etat.factures.some((x) => x.source === arrivee.source && x.idExterne === arrivee.idExterne)) {
    return { etat, resultat: 'rejouee' };
  }
  if (arrivee.sirenDestinataire !== sirenSociete) return { etat, resultat: 'autre_destinataire' };
  const numero = arrivee.numero.replace(/\s+/g, '').toUpperCase();
  const origine = etat.factures.find((x) => x.cle === cle && x.rattacheeA === null);
  const facture: FactureRecue = { ...arrivee, numero, cle, rattacheeA: origine ? origine.cle : null };
  return { etat: { factures: [...etat.factures, facture] }, resultat: origine ? 'doublon_rattache' : 'nouvelle' };
}

export function tvaComptee(etat: EtatFacturesRecues): Centimes {
  return etat.factures.filter((f) => f.rattacheeA === null).reduce((t, f) => ajouter(t, f.tva), centimes(0));
}

export type ResultatStatut =
  | { ok: true; envoi: { statut: string; validePar: string; valideLe: string } }
  | { ok: false; code: 'validation_client_requise' | 'statut_inconnu' };

export function statutAEnvoyer(
  _facture: FactureRecue,
  statut: string,
  statutsPermis: readonly string[],
  validation?: { par: string; le: string },
): ResultatStatut {
  if (!statutsPermis.includes(statut)) return { ok: false, code: 'statut_inconnu' };
  const par = validation?.par.trim() ?? '';
  const le = validation?.le.trim() ?? '';
  if (par === '' || le === '') return { ok: false, code: 'validation_client_requise' };
  return { ok: true, envoi: { statut, validePar: par, valideLe: le } };
}
