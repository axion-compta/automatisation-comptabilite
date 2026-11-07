import { useEffect, useState } from 'react';
import { fr } from '../../../../packages/textes/src/fr.js';
import { executerCommande } from './aller.js';
import { installerRaccourci, proposer } from './raccourci.js';

export const EVENEMENT_OUVRIR = 'palette:ouvrir';

/** Ouvre la palette depuis un bouton (ex. « Discuter ») : émet l'événement écouté par la palette. */
export function ouvrirPalette(): void {
  document.dispatchEvent(new Event(EVENEMENT_OUVRIR));
}

/** Palette Ctrl+K / Cmd+K : champ, liste des destinations, Entrée pour y aller, Échap pour fermer. Aucun modèle. */
export function Palette({ onAller }: { onAller: (chemin: string) => void }) {
  const [ouverte, setOuverte] = useState(false);
  const [requete, setRequete] = useState('');

  useEffect(() => installerRaccourci(document, () => setOuverte(true)), []);
  useEffect(() => {
    const ouvrir = (): void => setOuverte(true);
    document.addEventListener(EVENEMENT_OUVRIR, ouvrir);
    return () => document.removeEventListener(EVENEMENT_OUVRIR, ouvrir);
  }, []);

  if (!ouverte) return null;
  const fermer = (): void => {
    setOuverte(false);
    setRequete('');
  };
  const choisir = (chemin: string): void => {
    fermer();
    onAller(chemin);
  };
  const candidates = proposer(requete);

  return (
    <div role="dialog" aria-label={fr.palette.titre}>
      <input
        aria-label={fr.palette.champ}
        autoFocus
        value={requete}
        placeholder={fr.palette.exemple}
        onChange={(e) => setRequete(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') fermer();
          if (e.key === 'Enter') {
            const d = executerCommande(requete.startsWith('/') ? requete : '/aller ' + requete)?.destination;
            if (d) choisir(d.chemin);
            else if (candidates.length === 1 && candidates[0]) choisir(candidates[0].chemin);
          }
        }}
      />
      <ul>
        {candidates.map((d) => (
          <li key={d.id}>
            <button type="button" onClick={() => choisir(d.chemin)}>
              {d.titre}
            </button>
          </li>
        ))}
      </ul>
      {candidates.length === 0 && <p>{fr.palette.aucune}</p>}
    </div>
  );
}
