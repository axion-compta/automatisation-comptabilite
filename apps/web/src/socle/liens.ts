export type CiblePortail = 'abonnement' | 'fin_contrat';

// Chemins à confirmer (D29) : la console n'a pas encore répondu.
const CHEMINS: Record<CiblePortail, string> = { abonnement: '/abonnement', fin_contrat: '/demandes/fin-de-contrat' };

/** Adresse du portail pour une cible, ou null si la variable de construction est absente, vide ou pas en https. */
export function lienPortail(cible: CiblePortail): string | null {
  const brut = import.meta.env.VITE_URL_PORTAIL;
  if (typeof brut !== 'string' || brut === '') return null;
  try {
    const base = new URL(brut);
    if (base.protocol !== 'https:') return null;
    return new URL(CHEMINS[cible], base.origin).toString();
  } catch {
    return null;
  }
}
