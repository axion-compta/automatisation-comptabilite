// Jetons de design : seule source des couleurs, espacements et polices.
export const jetons = {
  couleur: {
    fond: '#faf8f5',
    surface: '#ffffff',
    texte: '#1f1b16',
    texteDiscret: '#5c554c',
    accent: '#2f5d50',
    accentTexte: '#ffffff',
    bordure: '#ddd6cc',
    succes: '#2e7d4f',
    alerte: '#b26a00',
    erreur: '#b3261e',
    etatOk: '#2e7d4f',
    // provisoire : teinte neutre (ni bleue ni orangée), à remplacer par celle du paquet de la console.
    etatAttente: '#6e5a7e',
    etatBloque: '#b3261e',
  },
  espace: { xs: '4px', s: '8px', m: '16px', l: '24px', xl: '40px' },
  rayon: { s: '4px', m: '8px', l: '16px', carte: '22px' },
  taille: { texte: '14px', titre: '24px' },
  graisse: { normale: 400, forte: 600 },
  rupture: { mobile: '720px' },
  police: {
    titre: "'Fraunces', Georgia, serif",
    texte: "'Manrope', system-ui, sans-serif",
  },
} as const;

export type Jetons = typeof jetons;

function aplatir(objet: Record<string, unknown>, prefixe: string): [string, string][] {
  return Object.entries(objet).flatMap(([cle, valeur]) => {
    const nom = `${prefixe}${prefixe ? '-' : ''}${cle.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
    return typeof valeur === 'string' || typeof valeur === 'number'
      ? [[nom, String(valeur)] as [string, string]] : aplatir(valeur as Record<string, unknown>, nom);
  });
}

/** Produit le contenu de jetons.css à partir des jetons. */
export function genererCss(source: Jetons = jetons): string {
  const lignes = aplatir(source as unknown as Record<string, unknown>, '').map(
    ([nom, valeur]) => `  --${nom}: ${valeur};`,
  );
  return `/* Fichier généré depuis jetons.ts : ne pas modifier à la main. */\n:root {\n${lignes.join('\n')}\n}\n`;
}
