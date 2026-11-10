// Raccourcis d'une lettre : actifs hors champ de saisie seulement, désactivables (Ctrl+K reste à raccourci.ts).
export type OptionsLettres = { actifs: () => boolean; actions: Record<string, () => void> };

const LETTRE = /^[a-z]$/;
const CHAMPS = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const MODAL = 'dialog[open], [aria-modal="true"]';

/** Actions proposées par défaut : action → lettre (une lettre réaffectée par la préférence `raccourcis.remap` la remplace). */
export const LETTRES_PAR_DEFAUT = { cloche: 'c', recherche: 'r' } as const;

const dansUnChamp = (cible: EventTarget | null): boolean => cible instanceof Element && cible.closest(CHAMPS) !== null;

/** Installe l'écoute ; renvoie la fonction qui la retire. */
export function installerLettres(cible: Window, { actifs, actions }: OptionsLettres): () => void {
  const ecouteur = (ev: Event): void => {
    const e = ev as KeyboardEvent;
    if (e.ctrlKey || e.altKey || e.metaKey || !LETTRE.test(e.key)) return;
    const action = Object.hasOwn(actions, e.key) ? actions[e.key] : undefined;
    if (!action || !actifs() || dansUnChamp(e.target) || cible.document.querySelector(MODAL)) return;
    e.preventDefault();
    action();
  };
  cible.addEventListener('keydown', ecouteur);
  return () => cible.removeEventListener('keydown', ecouteur);
}
