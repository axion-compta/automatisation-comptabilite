const PROFONDEUR_MAX = 32;

const CLES_INTERDITES = new Set([
  'motdepasse',
  'password',
  'jeton',
  'token',
  'secret',
  'cleapi',
  'apikey',
  'authorization',
  'contenupiece',
  'codesecours',
]);

const FORME_JETON = /(?:^|[^A-Za-z0-9_-])eyJ[A-Za-z0-9_-]+.[A-Za-z0-9_-]+.[A-Za-z0-9_-]+/;
const FORME_IBAN =
  /(?<![A-Za-z0-9])[A-Za-z]{2} ?[0-9]{2}(?:(?: [A-Za-z0-9]{4}){2,7}(?: [A-Za-z0-9]{1,4})?|[A-Za-z0-9]{11,30})(?![A-Za-z0-9])/;

function normaliser(cle: string): string {
  return cle
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[_-]/g, '');
}

function valeurInterdite(texte: string): boolean {
  return FORME_JETON.test(texte) || FORME_IBAN.test(texte);
}

function parcourir(valeur: unknown, chemin: string, profondeur: number, fautes: string[]): void {
  if (profondeur > PROFONDEUR_MAX) {
    fautes.push('profondeur');
    return;
  }
  if (typeof valeur === 'string') {
    if (valeurInterdite(valeur)) fautes.push(chemin);
    return;
  }
  if (Array.isArray(valeur)) {
    valeur.forEach((element, i) => parcourir(element, `${chemin}[${i}]`, profondeur + 1, fautes));
    return;
  }
  if (valeur !== null && typeof valeur === 'object') {
    for (const [cle, sous] of Object.entries(valeur)) {
      const cheminCle = chemin === '' ? cle : `${chemin}.${cle}`;
      if (CLES_INTERDITES.has(normaliser(cle))) fautes.push(cheminCle);
      else parcourir(sous, cheminCle, profondeur + 1, fautes);
    }
  }
}

/** Liste des chemins fautifs (clé interdite, jeton signé, IBAN en clair) ; vide si propre. */
export function verifierSansSecret(valeur: unknown): string[] {
  const fautes: string[] = [];
  parcourir(valeur, '', 0, fautes);
  return fautes;
}
