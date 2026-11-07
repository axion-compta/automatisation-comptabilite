// Documents contractuels : version en vigueur et acceptations manquantes. Le texte des CGV est hors back-end.
import { ErreurAbonnement, verifierDate, verifierEmpreinte, verifierHorodatage, type EvenementJournal } from './types.js';

export type DocumentContractuel = { type: string; version: number; approuveLe: string; empreinte: string; sources: readonly string[] };
export type Acceptation = { personne: string; organisation: string; type: string; version: number; accepteLe: string };

const invalide = () => new ErreurAbonnement('parametre_invalide');
const vide = (s: unknown) => typeof s !== 'string' || s.trim() === '';

export function verifierDocument(d: DocumentContractuel): void {
  if (vide(d.type) || typeof d.version !== 'number' || !Number.isSafeInteger(d.version) || d.version < 1) throw invalide();
  verifierDate(d.approuveLe);
  verifierEmpreinte(d.empreinte);
  if (!Array.isArray(d.sources) || d.sources.length === 0 || d.sources.some(vide)) throw invalide();
}

export function documentEnVigueur(documents: readonly DocumentContractuel[], type: string, date: string): DocumentContractuel | null {
  verifierDate(date);
  const memeType = documents.filter((d) => d.type === type);
  memeType.forEach(verifierDocument);
  if (new Set(memeType.map((d) => d.version)).size !== memeType.length) throw invalide();
  let retenu: DocumentContractuel | null = null;
  for (const d of memeType) {
    if (d.approuveLe <= date && (retenu === null || d.version > retenu.version)) retenu = d;
  }
  return retenu;
}

export function acceptationsManquantes(o: {
  documents: readonly DocumentContractuel[]; acceptations: readonly Acceptation[]; personne: string; organisation: string;
  typesRequis: readonly string[]; date: string;
}): { type: string; version: number }[] {
  const manquantes: { type: string; version: number }[] = [];
  for (const type of o.typesRequis) {
    const d = documentEnVigueur(o.documents, type, o.date);
    if (d === null) throw new ErreurAbonnement('document_absent');
    const faite = o.acceptations.some(
      (a) => a.personne === o.personne && a.organisation === o.organisation && a.type === type && a.version === d.version,
    );
    if (!faite) manquantes.push({ type, version: d.version });
  }
  return manquantes;
}

export function accepter(o: {
  documents: readonly DocumentContractuel[]; personne: string; organisation: string; type: string; version: number; horodatage: string;
}): { acceptation: Acceptation; evenement: EvenementJournal } {
  if (vide(o.personne) || vide(o.organisation)) throw new ErreurAbonnement('auteur_manquant');
  verifierHorodatage(o.horodatage);
  const date = o.horodatage.slice(0, 10);
  const d = documentEnVigueur(o.documents, o.type, date);
  if (d === null) throw new ErreurAbonnement('document_absent');
  if (d.version !== o.version) throw new ErreurAbonnement('version_perimee');
  const acceptation = { personne: o.personne, organisation: o.organisation, type: o.type, version: o.version, accepteLe: date };
  const evenement: EvenementJournal = {
    type: 'acceptation.enregistree', horodatage: o.horodatage,
    donnees: { personne: o.personne, organisation: o.organisation, type: o.type, version: o.version },
  };
  return { acceptation, evenement };
}
