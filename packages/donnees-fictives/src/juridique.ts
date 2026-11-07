// Obligations juridiques fictives de deux sociétés fictives, à graine fixe. Aucune valeur légale réelle (V3-PRI-017).
import { creerAlea, GRAINE } from './generateur.js';

export interface OptionsFictives {
  vide?: boolean;
}

export interface ObligationJuridique {
  exerciceId: string;
  societeSiren: string;
  forme: 'FORME_A' | 'FORME_SCI';
  rapportGestion: { statut: 'dispense' | 'brouillon' | 'non_applicable'; questions: string[] };
  convocation: {
    applicable: boolean;
    dateAssemblee: string | null;
    dateLimite: string | null;
    rappel: string | null;
    cartes: string[];
  };
  confidentialite: { proposee: boolean; choix: 'non_choisi' | 'demandee' | 'refusee' | null };
  cartes: { code: string; objetId: string; ecartCentimes: number | null }[];
  mention: 'prepare_par_ia';
}

export interface JeuJuridique {
  version: 1;
  obligations: ObligationJuridique[];
}

function trier(valeur: unknown): unknown {
  if (Array.isArray(valeur)) return valeur.map(trier);
  if (valeur !== null && typeof valeur === 'object') {
    const source = valeur as Record<string, unknown>;
    const sortie: Record<string, unknown> = {};
    for (const cle of Object.keys(source).sort()) sortie[cle] = trier(source[cle]);
    return sortie;
  }
  return valeur;
}

/** Sérialisation stable (clés triées) partagée avec sources.ts. */
export function serialiserStable(valeur: unknown): string {
  return `${JSON.stringify(trier(valeur), null, 2)}\n`;
}

export function serialiserJuridique(jeu: JeuJuridique): string {
  return serialiserStable(jeu);
}

function jour(n: number): string {
  return `2027-${String(1 + Math.floor(n / 28)).padStart(2, '0')}-${String((n % 28) + 1).padStart(2, '0')}`;
}

export function genererJuridique(graine: number = GRAINE, options: OptionsFictives = {}): JeuJuridique {
  if (options.vide === true) return { version: 1, obligations: [] };
  const alea = creerAlea(graine);
  // Décalage déterministe (0 à 6 jours) de la date d'assemblée ; la date limite et le rappel en découlent.
  const decalage = Math.floor(alea() * 7);
  const assemblee = decalage + 5; // dates inventées, janvier à février 2027
  const sarl: ObligationJuridique = {
    exerciceId: 'EX2026',
    societeSiren: '123456782',
    forme: 'FORME_A',
    rapportGestion: { statut: 'brouillon', questions: ['effectif'] },
    convocation: {
      applicable: true,
      dateAssemblee: jour(assemblee + 28),
      dateLimite: jour(assemblee + 14),
      rappel: jour(assemblee + 7),
      cartes: ['convocation_a_envoyer'],
    },
    confidentialite: { proposee: true, choix: 'non_choisi' },
    cartes: [{ code: 'ecart_montant', objetId: 'OBJ-SARL-001', ecartCentimes: 50000 }],
    mention: 'prepare_par_ia',
  };
  const sci: ObligationJuridique = {
    exerciceId: 'EX2026',
    societeSiren: '987654324',
    forme: 'FORME_SCI',
    rapportGestion: { statut: 'non_applicable', questions: [] },
    convocation: { applicable: false, dateAssemblee: null, dateLimite: null, rappel: null, cartes: [] },
    confidentialite: { proposee: false, choix: null },
    cartes: [{ code: 'deposer_convention', objetId: 'OBJ-SCI-001', ecartCentimes: null }],
    mention: 'prepare_par_ia',
  };
  return { version: 1, obligations: [sarl, sci] };
}
