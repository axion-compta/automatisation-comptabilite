// Palette de commandes Ctrl+K (ou Cmd+K), sans modèle : filtrage local des destinations.
import { classer, COMMANDE, destinations, type Destination } from './aller.js';

type Touche = { key?: string; ctrlKey: boolean; metaKey: boolean; altKey?: boolean; shiftKey?: boolean };

/** Vrai pour Ctrl+K ou Cmd+K seuls (Alt et Maj exclus). Une touche sans `key` ne déclenche rien. */
export function estRaccourciPalette(e: Touche): boolean {
  return (e.key ?? '').toLowerCase() === 'k' && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;
}

/** Entrées proposées : les 10 destinations si la requête est vide, sinon les candidates (en cas d'égalité, toutes). */
export function proposer(requete: string, max = destinations.length): Destination[] {
  const m = COMMANDE.exec(requete);
  const texte = (m ? (m[1] ?? '') : requete).trim();
  if (texte === '') return destinations.slice(0, max);
  return classer(texte).slice(0, max);
}

/** Installe le raccourci ; renvoie la fonction qui le retire. */
export function installerRaccourci(cible: Pick<Document, 'addEventListener' | 'removeEventListener'>, ouvrir: () => void): () => void {
  const ecouteur = (ev: Event): void => {
    const e = ev as KeyboardEvent;
    if (estRaccourciPalette(e)) {
      e.preventDefault();
      ouvrir();
    }
  };
  cible.addEventListener('keydown', ecouteur);
  return () => cible.removeEventListener('keydown', ecouteur);
}
