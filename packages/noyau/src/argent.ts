// Calcul d'argent en centimes entiers : aucun flottant, arrondis explicites.
declare const marque: unique symbol;

/** Montant en centimes d'euro : toujours un entier sûr. */
export type Centimes = number & { readonly [marque]: 'Centimes' };

/** Mode d'arrondi explicite pour toute division. */
export type Arrondi = 'demi-superieur' | 'demi-pair' | 'inferieur' | 'superieur';

export class ErreurArgent extends Error {
  override name = 'ErreurArgent';
}

export function centimes(valeur: number): Centimes {
  if (!Number.isSafeInteger(valeur)) {
    throw new ErreurArgent('Un montant doit être un entier de centimes : ' + String(valeur));
  }
  return valeur as Centimes;
}

function verifier(valeur: number): Centimes {
  return centimes(valeur);
}

export function ajouter(a: Centimes, b: Centimes): Centimes {
  return verifier(a + b);
}

export function soustraire(a: Centimes, b: Centimes): Centimes {
  return verifier(a - b);
}

export function multiplier(a: Centimes, facteur: number): Centimes {
  if (!Number.isSafeInteger(facteur)) {
    throw new ErreurArgent('Le facteur doit être un entier : ' + String(facteur));
  }
  return verifier(a * facteur);
}

/** Division entière de deux bigint avec arrondi explicite (dénominateur > 0). */
function diviser(numerateur: bigint, denominateur: bigint, mode: Arrondi): bigint {
  let q = numerateur / denominateur;
  const reste = numerateur % denominateur;
  if (reste === 0n) return q;
  const negatif = numerateur < 0n;
  const doubleReste = (reste < 0n ? -reste : reste) * 2n;
  switch (mode) {
    case 'inferieur':
      if (negatif) q -= 1n;
      break;
    case 'superieur':
      if (!negatif) q += 1n;
      break;
    case 'demi-superieur':
      if (doubleReste >= denominateur) q += negatif ? -1n : 1n;
      break;
    case 'demi-pair':
      if (doubleReste > denominateur || (doubleReste === denominateur && q % 2n !== 0n)) {
        q += negatif ? -1n : 1n;
      }
      break;
  }
  return q;
}

/**
 * Applique un taux exprimé en points de base (10000 = 100 %) puis arrondit.
 * Ex. : 20 % de TVA = 2000 points de base.
 */
export function pourcentage(a: Centimes, pointsDeBase: number, mode: Arrondi): Centimes {
  if (!Number.isSafeInteger(pointsDeBase)) {
    throw new ErreurArgent('Le taux doit être un entier de points de base : ' + String(pointsDeBase));
  }
  const brut = BigInt(a) * BigInt(pointsDeBase);
  return verifier(Number(diviser(brut, 10000n, mode)));
}

/** Répartit un montant selon des poids entiers positifs ; la somme des parts est exacte. */
export function repartir(total: Centimes, poids: readonly number[]): Centimes[] {
  if (poids.length === 0) throw new ErreurArgent('Aucun poids pour la répartition');
  if (poids.some((p) => !Number.isSafeInteger(p) || p < 0)) {
    throw new ErreurArgent('Les poids doivent être des entiers positifs ou nuls');
  }
  const somme = poids.reduce((s, p) => s + BigInt(p), 0n);
  if (somme === 0n) throw new ErreurArgent('La somme des poids est nulle');
  const parts = poids.map((p) => diviser(BigInt(total) * BigInt(p), somme, 'inferieur'));
  let reste = BigInt(total) - parts.reduce((s, p) => s + p, 0n);
  // Le reliquat (en centimes) est distribué un par un, dans l'ordre, aux poids non nuls.
  for (let i = 0; reste > 0n; i = (i + 1) % poids.length) {
    if (poids[i] !== 0) {
      parts[i] = (parts[i] ?? 0n) + 1n;
      reste -= 1n;
    }
  }
  return parts.map((p) => verifier(Number(p)));
}

/** Formate en euros avec virgule, sans passer par un flottant. Ex. : 123456 -> « 1234,56 ». */
export function formater(a: Centimes): string {
  const negatif = a < 0;
  const absolu = Math.abs(a);
  const euros = Math.trunc(absolu / 100);
  const reste = String(absolu % 100).padStart(2, '0');
  return (negatif ? '-' : '') + String(euros) + ',' + reste;
}
