// Valeur par défaut en attente de l'ADR 0060 de la console : seule ligne à changer.
export const PREFIXE_ROUTES_SOCIETE = '/api/compta/v1/societes/{s}' as const;

export function cheminSociete(suffixe: string): string {
  if (typeof suffixe !== 'string' || !suffixe.startsWith('/') || suffixe.includes('..') || suffixe.includes('//')) {
    throw new Error('suffixe_invalide');
  }
  return PREFIXE_ROUTES_SOCIETE + suffixe;
}
