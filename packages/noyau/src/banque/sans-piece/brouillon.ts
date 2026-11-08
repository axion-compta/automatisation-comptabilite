// Brouillon de demande de pièces au fournisseur : copie à coller, jamais envoyée (aucun accès à la boîte du client).
import { formater, centimes, type Centimes } from '../../argent/index.js';
import { pseudonymiser, retablir } from '../libelles/pseudonymiser.js';
import type { DemandeSuivie } from './reponses.js';

export class ErreurBrouillon extends Error {
  override name = 'ErreurBrouillon';
  constructor(readonly code: 'demande_non_concernee' | 'ligne_inconnue' | 'montant_invalide') {
    super(code);
  }
}

export type RedacteurBrouillon = (entree: {
  fournisseur: string;
  pieces: { date: string; montant: string; libelle: string }[];
}) => Promise<{ texte: string; espaceClient?: string }>;

export type Brouillon = {
  etat: 'brouillon';
  envoye: false;
  objet: string;
  corps: string;
  pieces: { date: string; montant: Centimes }[];
  espaceClient?: string;
  source: 'ia' | 'modele';
};

type Contexte = {
  fournisseur: { nom: string; domaines: readonly string[] };
  lignes: readonly { id: string; date: string; montant: Centimes; libelle: string }[];
  personnes: readonly string[];
  rediger: RedacteurBrouillon;
};

const OBJET = 'Demande de justificatifs';
const REPLI = 'Bonjour, pourriez-vous nous transmettre les justificatifs des opérations ci-dessous, ou nous indiquer où les retrouver dans votre espace client ?';
const CLOTURE = 'Merci d’avance.';
const JETON = /\[(?:IBAN|CARTE|PERSONNE)_\d+\]/;
const MONTANT = /\d[\d\s.\u00a0\u202f]*[.,]\d{1,2}(?!\d)|\d[\d\s\u00a0\u202f]*\s?(?:€|euros?)/gi;

// Écriture canonique « 1234,56 » d'un montant trouvé dans un texte.
function canonique(brut: string): string {
  const nombre = brut.replace(/\s?(?:€|euros?)$/i, '').replace(/[\s\u00a0\u202f]/g, '');
  const m = /^(.*?)(?:[.,](\d{1,2}))?$/.exec(nombre);
  const entier = (m?.[1] ?? '').replace(/[.,]/g, '');
  return entier + ',' + (m?.[2] ?? '').padEnd(2, '0');
}

function espaceValide(url: unknown, domaines: readonly string[]): string | undefined {
  if (typeof url !== 'string') return undefined;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return undefined;
  }
  const hote = u.hostname.toLowerCase();
  const ok = u.protocol === 'https:' && hote !== '' && domaines.some((d) => d !== '' && (hote === d.toLowerCase() || hote.endsWith('.' + d.toLowerCase())));
  return ok ? url.trim() : undefined;
}

export async function preparerBrouillon(demande: DemandeSuivie, contexte: Contexte): Promise<Brouillon> {
  if (demande.reponse !== 'ou_les_trouver') throw new ErreurBrouillon('demande_non_concernee');
  const retenues = demande.ligneIds.map((id) => {
    const l = contexte.lignes.find((x) => x.id === id);
    if (l === undefined) throw new ErreurBrouillon('ligne_inconnue');
    if (!Number.isSafeInteger(l.montant)) throw new ErreurBrouillon('montant_invalide');
    return l;
  });
  const pieces = retenues.map((l) => ({ date: l.date, montant: centimes(Math.abs(l.montant)) }));
  const permis = new Set(pieces.map((p) => formater(p.montant)));
  const { textes, table } = pseudonymiser([...retenues.map((l) => l.libelle), contexte.fournisseur.nom], contexte.personnes);
  const entree = {
    fournisseur: textes[retenues.length] as string,
    pieces: pieces.map((p, i) => ({ date: p.date, montant: formater(p.montant), libelle: textes[i] as string })),
  };
  let formule = REPLI;
  let source: Brouillon['source'] = 'modele';
  let espaceClient: string | undefined;
  try {
    const r = await contexte.rediger(entree);
    if (typeof r.texte === 'string' && r.texte.trim() !== '') {
      const texte = retablir(r.texte, table).trim();
      const montants = texte.match(MONTANT) ?? [];
      if (!JETON.test(texte) && montants.every((m) => permis.has(canonique(m)))) {
        formule = texte;
        source = 'ia';
      }
    }
    espaceClient = espaceValide(r.espaceClient, contexte.fournisseur.domaines);
  } catch {
    // Panne du rédacteur : le texte de repli est utilisé.
  }
  const bloc = pieces.map((p) => `- ${p.date} : ${formater(p.montant)} €`).join('\n');
  return {
    etat: 'brouillon',
    envoye: false,
    objet: OBJET,
    corps: `${formule}\n\n${bloc}\n\n${CLOTURE}`,
    pieces,
    ...(espaceClient === undefined ? {} : { espaceClient }),
    source,
  };
}
