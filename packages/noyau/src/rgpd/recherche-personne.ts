import { ErreurRgpd } from './types.js';

export type Collections = {
  tiers: { id: string; nom: string; email?: string; iban?: string }[];
  pieces: { id: string; texteLu: string }[];
  ecritures: { id: string; libelle: string }[];
  conversations: { id: string; texte: string }[];
};
export type Critere = { nom?: string; email?: string; iban?: string };
export type Source = 'tiers' | 'pieces' | 'ecritures' | 'conversations';
export type Trouve = { source: Source; id: string; par: 'nom' | 'email' | 'iban' };

const LONGUEUR_MIN_NOM = 3;

export function normaliserNom(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[-'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export const normaliserIban = (s: string): string => s.toUpperCase().replace(/\s+/g, '');
export const normaliserEmail = (s: string): string => s.trim().toLowerCase();

const pourMots = (s: string): string => ` ${normaliserNom(s).replace(/[.,;:!?]/g, ' ').replace(/\s+/g, ' ').trim()} `;

export function rechercherPersonne(critere: Critere, c: Collections): Trouve[] {
  const nomBrut = normaliserNom(critere.nom ?? '');
  const email = normaliserEmail(critere.email ?? '');
  const iban = normaliserIban((critere.iban ?? '').trim());
  if (nomBrut === '' && email === '' && iban === '') throw new ErreurRgpd('recherche_vide');
  if (nomBrut !== '' && nomBrut.length < LONGUEUR_MIN_NOM) throw new ErreurRgpd('recherche_trop_courte');
  const nom = nomBrut === '' ? '' : pourMots(nomBrut);

  const parTexte = (texte: string): Trouve['par'] | null => {
    if (nom !== '' && pourMots(texte).includes(nom)) return 'nom';
    if (email !== '' && normaliserEmail(texte).includes(email)) return 'email';
    if (iban !== '' && normaliserIban(texte).includes(iban)) return 'iban';
    return null;
  };
  const trouves: Trouve[] = [];
  const ajouter = (source: Source, id: string, par: Trouve['par'] | null): void => {
    if (par !== null) trouves.push({ source, id, par });
  };
  for (const t of c.tiers) {
    let par: Trouve['par'] | null = null;
    if (nom !== '' && pourMots(t.nom).includes(nom)) par = 'nom';
    else if (email !== '' && t.email !== undefined && normaliserEmail(t.email) === email) par = 'email';
    else if (iban !== '' && t.iban !== undefined && normaliserIban(t.iban) === iban) par = 'iban';
    ajouter('tiers', t.id, par);
  }
  for (const p of c.pieces) ajouter('pieces', p.id, parTexte(p.texteLu));
  for (const e of c.ecritures) ajouter('ecritures', e.id, parTexte(e.libelle));
  for (const v of c.conversations) ajouter('conversations', v.id, parTexte(v.texte));

  const vus = new Set<string>();
  return trouves
    .filter((t) => {
      const cle = `${t.source}\u0001${t.id}`;
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    })
    .sort((a, b) => (a.source === b.source ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.source < b.source ? -1 : 1));
}
