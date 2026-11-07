// Textes du garde-fou (V3-CTL-071) : refus d'une action et refus d'écarter un contrôle. Vouvoiement.

export function titreRefus(nombre: number): string {
  if (!Number.isInteger(nombre) || nombre < 1) throw new RangeError('nombre doit être un entier supérieur ou égal à 1');
  return `Cette action attend la correction de ${nombre} ${nombre === 1 ? 'point bloquant' : 'points bloquants'}.`;
}

export const refusEcart = 'Ce contrôle ne peut pas être écarté : la donnée doit être corrigée.';

export const libelleReverifier = 'Revérifier';
