import { ErreurSecurite, type Role } from './types.js';

export const CANAUX_COUPES = ['api', 'chat', 'imports', 'envois'] as const;
export type CanalCoupe = (typeof CANAUX_COUPES)[number];
export type Marque = { depuis: string; par: string };
export type Drapeaux = { global?: Marque; societes: Readonly<Record<string, Marque>> };
export type Cible = 'global' | { societeId: string };
export type EvenementArret = { type: 'securite.arret_urgence'; cible: Cible; par: string; horodatage: string };
export type EvenementReprise = { type: 'securite.reprise'; cible: Cible; par: string; horodatage: string };

const invalide = (m: string): never => {
  throw new ErreurSecurite('argument_invalide', m);
};
const texte = (v: unknown, nom: string): string =>
  typeof v === 'string' && v !== '' ? v : invalide(nom);
const instant = (v: unknown): string =>
  typeof v === 'string' && v !== '' && !Number.isNaN(Date.parse(v)) ? v : invalide('horodatage');
const societeDe = (c: Cible): string | undefined => (c === 'global' ? undefined : texte(c?.societeId, 'societeId'));
const marque = (d: Drapeaux, c: Cible): Marque | undefined => {
  const id = societeDe(c);
  return id === undefined ? d.global : Object.hasOwn(d.societes, id) ? d.societes[id] : undefined;
};
const avec = (d: Drapeaux, c: Cible, m: Marque | undefined): Drapeaux => {
  const id = societeDe(c);
  if (id === undefined) return m === undefined ? { societes: d.societes } : { ...d, global: m };
  const societes = Object.fromEntries(Object.entries(d.societes).filter(([k]) => k !== id));
  return { ...d, societes: m === undefined ? societes : { ...societes, [id]: m } };
};

export function estCoupe(d: Drapeaux, societeId: string | undefined, canal: string): boolean {
  if (!(CANAUX_COUPES as readonly string[]).includes(canal)) invalide('canal');
  if (d.global !== undefined) return true;
  return societeId !== undefined && Object.hasOwn(d.societes, societeId);
}

export function poserArret(d: Drapeaux, cible: Cible, par: string, maintenant: string) {
  texte(par, 'par');
  const horodatage = instant(maintenant);
  if (marque(d, cible) !== undefined) return { drapeaux: d, evenement: undefined };
  const evenement: EvenementArret = { type: 'securite.arret_urgence', cible, par, horodatage };
  return { drapeaux: avec(d, cible, { depuis: horodatage, par }), evenement };
}

export function reprendre(d: Drapeaux, cible: Cible, personne: { id: string; role: Role }, maintenant: string) {
  const par = texte(personne?.id, 'id');
  const horodatage = instant(maintenant);
  societeDe(cible);
  if (personne.role !== 'administrateur') return { ok: false as const, raison: 'role_insuffisant' as const };
  const evenement: EvenementReprise = { type: 'securite.reprise', cible, par, horodatage };
  return { ok: true as const, drapeaux: avec(d, cible, undefined), evenement };
}
