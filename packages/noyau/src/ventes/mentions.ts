// Contrôle des mentions d'une facture lue. La liste vient d'un paramètre daté ; jamais bloquant.
import type { Centimes } from '../argent/index.js';
import { ErreurVente } from './types.js';
import type { NatureClient } from './types.js';

export type ConditionMention = 'toujours' | 'client_professionnel' | 'franchise' | 'ht_au_dessus';
export type EtatLu = 'presente' | 'absente' | 'illisible';
export interface MentionRequise {
  code: string;
  condition: ConditionMention;
  seuilHt?: Centimes | undefined;
}
export interface ResultatMention {
  code: string;
  etat: EtatLu | 'non_exigee';
}
export interface CarteMention {
  code: string;
  anomalie?: 'A7';
}
export interface EntreeMentions {
  requises: readonly MentionRequise[] | undefined;
  lues: Readonly<Record<string, EtatLu>>;
  contexte: { natureClient: NatureClient; franchise: boolean; htCentimes: Centimes };
}
export interface SortieMentions {
  resultats: ResultatMention[];
  cartes: CarteMention[];
  bloque: false;
  parametreAbsent: boolean;
}

const invalide = (): never => {
  throw new ErreurVente('entree_invalide', 'Entrée du contrôle des mentions invalide.');
};

function estExigee(m: MentionRequise, c: EntreeMentions['contexte']): boolean {
  switch (m.condition) {
    case 'toujours':
      return true;
    case 'client_professionnel':
      return c.natureClient === 'professionnel';
    case 'franchise':
      return c.franchise;
    case 'ht_au_dessus':
      if (!Number.isSafeInteger(m.seuilHt)) return invalide();
      return c.htCentimes > (m.seuilHt as number);
    default:
      return invalide();
  }
}

export function controlerMentions(entree: EntreeMentions): SortieMentions {
  const { requises, lues, contexte } = entree;
  if (!Number.isSafeInteger(contexte.htCentimes)) invalide();
  const sortie: SortieMentions = { resultats: [], cartes: [], bloque: false, parametreAbsent: requises === undefined };
  for (const m of requises ?? []) {
    if (!estExigee(m, contexte)) {
      sortie.resultats.push({ code: m.code, etat: 'non_exigee' });
      continue;
    }
    const lue = Object.hasOwn(lues, m.code) ? lues[m.code] : undefined;
    const etat: EtatLu = lue === 'presente' || lue === 'illisible' ? lue : 'absente';
    sortie.resultats.push({ code: m.code, etat });
    if (etat === 'presente') continue;
    sortie.cartes.push(m.condition === 'franchise' ? { code: m.code, anomalie: 'A7' } : { code: m.code });
  }
  return sortie;
}
