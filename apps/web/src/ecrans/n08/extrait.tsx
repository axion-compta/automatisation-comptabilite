import type { ReactNode } from 'react';

const ENTITES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

/** Décode les 5 entités connues, en un seul passage (« &amp;lt; » devient « &lt; », pas « < »). */
function decoder(texte: string): string {
  return texte.replace(/&(?:amp|lt|gt|quot|#39);/g, (e) => ENTITES[e] ?? e);
}

/**
 * Extrait de recherche : seules les balises `<mark>` et `</mark>` sont reconnues ; tout le reste
 * est du texte affiché tel quel. Aucun HTML n'est injecté : uniquement des nœuds React.
 */
export function Extrait({ html }: { html: string }) {
  const morceaux = html.split(/(<mark>|<\/mark>)/);
  const noeuds: ReactNode[] = [];
  let dansMark = false;
  morceaux.forEach((m, i) => {
    if (m === '<mark>') dansMark = true;
    else if (m === '</mark>') dansMark = false;
    else if (m !== '') noeuds.push(dansMark ? <mark key={i}>{decoder(m)}</mark> : decoder(m));
  });
  return <span>{noeuds}</span>;
}
