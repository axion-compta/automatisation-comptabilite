import { ecrireCsv } from '../exports/csv.js';
import { empreinteSha256, manifeste } from '../documents/empreinte.js';
import { ErreurRgpd, donneesPermises, type EvenementPersonne } from './types.js';

export type DonneePersonne = { source: string; id: string; champs: Record<string, string> };
export type PiecePersonne = { id: string; extension: string; octets: Uint8Array; autresPersonnes: boolean };
export type EntreePaquet = {
  demandeId: string;
  type: 'acces' | 'portabilite';
  le: string;
  occurrences: { source: string; id: string }[];
  donnees: DonneePersonne[];
  pieces: PiecePersonne[];
  inclureAutresPersonnes: boolean;
  modele: (piecesExclues: number) => string;
};
export type PaquetAcces = {
  fichiers: { nom: string; octets: Uint8Array }[];
  manifeste: string;
  empreinteManifeste: string;
  evenements: EvenementPersonne[];
};

const EXTENSION = /^[a-z0-9]{1,8}$/;
const IDENTIFIANT = /^[A-Za-z0-9_-]+$/;
const COLONNES_FIXES = ['source', 'id'];
const encoder = new TextEncoder();
const octets = (t: string): Uint8Array => encoder.encode(t);
const cle = (source: string, id: string): string => `${source}\u0001${id}`;
const trier = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function paquetAcces(e: EntreePaquet): PaquetAcces {
  if (typeof e.le !== 'string' || Number.isNaN(Date.parse(e.le))) throw new ErreurRgpd('horodatage_invalide');
  const vus = new Set<string>();
  for (const p of e.pieces) {
    if (!EXTENSION.test(p.extension) || !IDENTIFIANT.test(p.id)) throw new ErreurRgpd('valeur_interdite');
    if (vus.has(p.id)) throw new ErreurRgpd('doublon');
    vus.add(p.id);
  }
  const permis = new Set(e.occurrences.map((o) => cle(o.source, o.id)));
  const retenues = e.donnees.filter((d) => permis.has(cle(d.source, d.id)));
  const champs = [...new Set(retenues.flatMap((d) => Object.keys(d.champs)))]
    .filter((c) => !COLONNES_FIXES.includes(c))
    .sort(trier);
  const codes = [...COLONNES_FIXES, ...champs];
  const lignes = retenues.map((d) => ({ ...d.champs, source: d.source, id: d.id }));

  const fichiers: { nom: string; octets: Uint8Array }[] = [
    { nom: 'donnees.csv', octets: octets(ecrireCsv({ colonnes: codes.map((c) => ({ code: c, type: 'texte', entete: c })), lignes })) },
  ];
  if (e.type === 'portabilite') {
    const jsonl = lignes
      .map((l) => JSON.stringify(Object.fromEntries(Object.entries(l).sort(([a], [b]) => trier(a, b)))) + '\n')
      .join('');
    fichiers.push({ nom: 'donnees.jsonl', octets: octets(jsonl) });
  }
  const gardees = e.pieces.filter((p) => e.inclureAutresPersonnes || !p.autresPersonnes);
  for (const p of gardees) fichiers.push({ nom: `piece-${p.id}.${p.extension}`, octets: p.octets });
  fichiers.push({ nom: 'a-savoir.txt', octets: octets(e.modele(e.pieces.length - gardees.length)) });

  const texte = manifeste(fichiers);
  fichiers.push({ nom: 'MANIFESTE.sha256', octets: octets(texte) });

  const evenement = (type: EvenementPersonne['type'], donnees: EvenementPersonne['donnees']): EvenementPersonne => {
    donneesPermises(donnees);
    return { type, horodatage: e.le, demandeId: e.demandeId, donnees };
  };
  const evenements = [
    evenement(e.type === 'acces' ? 'personne.acces_produit' : 'personne.portabilite_produite', {
      demande: e.demandeId, fichiers: fichiers.length,
    }),
  ];
  if (e.inclureAutresPersonnes) {
    evenements.push(evenement('personne.autres_personnes_incluses', { demande: e.demandeId, pieces: gardees.length }));
  }
  return { fichiers, manifeste: texte, empreinteManifeste: empreinteSha256(texte), evenements };
}
