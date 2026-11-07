// Calcul d'argent en centimes entiers : aucun flottant, arrondis explicites.
declare const marque: unique symbol;

/** Montant en centimes d'euro : toujours un entier sûr. */
export type Centimes = number & { readonly [marque]: 'Centimes' };

/**
 * Mode d'arrondi explicite pour toute division.
 * - `demi-superieur` : demi éloigné de zéro (0,5 donne 1 et -0,5 donne -1) ;
 * - `demi-pair` : demi vers l'entier pair le plus proche ;
 * - `inferieur` : vers moins l'infini ; `superieur` : vers plus l'infini.
 */
export type Arrondi = 'demi-superieur' | 'demi-pair' | 'inferieur' | 'superieur';

export class ErreurArgent extends Error {
  override name = 'ErreurArgent';
}

export function centimes(valeur: number): Centimes {
  if (!Number.isSafeInteger(valeur)) {
    throw new ErreurArgent('Un montant doit être un entier de centimes : ' + String(valeur));
  }
  // Normalise -0 en +0.
  return (valeur === 0 ? 0 : valeur) as Centimes;
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
  // La seule division autorisée du noyau : bigint, arrondi traité juste après.
  // eslint-disable-next-line no-restricted-syntax
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

function enBigint(valeur: number | bigint, nom: string): bigint {
  if (typeof valeur === 'bigint') return valeur;
  if (!Number.isSafeInteger(valeur)) {
    throw new ErreurArgent('Argument entier requis (' + nom + ') : ' + String(valeur));
  }
  return BigInt(valeur);
}

/**
 * Calcule `a × numerateur ÷ denominateur` avec un seul arrondi explicite (produit en bigint).
 * Le dénominateur doit être strictement positif ; un résultat hors entier sûr est refusé.
 */
export function fraction(
  a: Centimes | bigint,
  numerateur: number | bigint,
  denominateur: number | bigint,
  mode: Arrondi,
): Centimes {
  const produit = enBigint(a, 'montant') * enBigint(numerateur, 'numérateur');
  const bas = enBigint(denominateur, 'dénominateur');
  if (bas <= 0n) throw new ErreurArgent('Le dénominateur doit être strictement positif');
  return verifier(Number(diviser(produit, bas, mode)));
}

/**
 * Multiplie par une fraction `numerateur / denominateur` (entiers sûrs, numérateur ≥ 0,
 * dénominateur > 0) en bigint, puis arrondit selon le mode explicite.
 */
export function appliquerFraction(a: Centimes, numerateur: number, denominateur: number, mode: Arrondi): Centimes {
  if (!Number.isSafeInteger(numerateur) || numerateur < 0) {
    throw new ErreurArgent('Le numérateur doit être un entier sûr positif ou nul : ' + String(numerateur));
  }
  if (!Number.isSafeInteger(denominateur) || denominateur <= 0) {
    throw new ErreurArgent('Le dénominateur doit être un entier sûr strictement positif : ' + String(denominateur));
  }
  const brut = BigInt(a) * BigInt(numerateur);
  return verifier(Number(diviser(brut, BigInt(denominateur), mode)));
}

/**
 * Proportion `partie / total` en points de base (10000 = 100 %), arrondie selon le mode.
 * Un total nul n'a pas de proportion : `null` (jamais 0 ni Infinity).
 */
export function proportionPointsDeBase(partie: number, total: number, mode: Arrondi): number | null {
  if (!Number.isSafeInteger(partie)) {
    throw new ErreurArgent('La partie doit être un entier sûr : ' + String(partie));
  }
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new ErreurArgent('Le total doit être un entier sûr positif ou nul : ' + String(total));
  }
  if (total === 0) return null;
  const q = Number(diviser(BigInt(partie) * 10000n, BigInt(total), mode));
  if (!Number.isSafeInteger(q)) throw new ErreurArgent('Proportion hors des entiers sûrs');
  return q;
}

/**
 * Répartit un montant selon des poids entiers positifs ; la somme des parts est exacte.
 * Méthode du plus grand reste ; à reste égal, l'indice le plus petit passe d'abord.
 * Un total négatif donne l'opposé de la répartition du total positif.
 */
export function repartir(total: Centimes, poids: readonly number[]): Centimes[] {
  if (poids.length === 0) throw new ErreurArgent('Aucun poids pour la répartition');
  if (poids.some((p) => !Number.isSafeInteger(p) || p < 0)) {
    throw new ErreurArgent('Les poids doivent être des entiers positifs ou nuls');
  }
  const somme = poids.reduce((s, p) => s + BigInt(p), 0n);
  if (somme === 0n) throw new ErreurArgent('La somme des poids est nulle');
  const negatif = total < 0;
  const absolu = BigInt(negatif ? -total : total);
  const produits = poids.map((p) => absolu * BigInt(p));
  const parts = produits.map((x) => diviser(x, somme, 'inferieur'));
  const restes = produits.map((x) => x % somme);
  const distribue = parts.reduce((s, p) => s + p, 0n);
  const aDistribuer = Number(absolu - distribue);
  const ordre = poids
    .map((_p, k) => k)
    .sort((k, l) => {
      const rk = restes[k] ?? 0n;
      const rl = restes[l] ?? 0n;
      if (rk !== rl) return rk > rl ? -1 : 1;
      return k - l;
    });
  for (const k of ordre.slice(0, aDistribuer)) {
    parts[k] = (parts[k] ?? 0n) + 1n;
  }
  return parts.map((p) => verifier(Number(negatif ? -p : p)));
}

/** Formate en euros avec virgule, sans passer par un flottant. Ex. : 123456 -> « 1234,56 ». */
export function formater(a: Centimes): string {
  const negatif = a < 0;
  const absolu = BigInt(Math.abs(a));
  const euros = diviser(absolu, 100n, 'inferieur');
  const reste = String(absolu % 100n).padStart(2, '0');
  return (negatif ? '-' : '') + String(euros) + ',' + reste;
}

const ECHELLE_HUIT_DECIMALES = 10n ** 8n;

/** Convertit un montant par un taux entier « taux × 10^8 » (0,92000000 donne 92000000n). */
export function convertir(montant: Centimes, tauxHuitDecimales: bigint, mode: Arrondi): Centimes {
  if (!Number.isSafeInteger(montant)) {
    throw new ErreurArgent('Un montant doit être un entier de centimes : ' + String(montant));
  }
  if (tauxHuitDecimales <= 0n) throw new ErreurArgent('Le taux doit être strictement positif');
  return verifier(Number(diviser(BigInt(montant) * tauxHuitDecimales, ECHELLE_HUIT_DECIMALES, mode)));
}
