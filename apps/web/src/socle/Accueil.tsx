import { Link } from '@tanstack/react-router';
import { socle } from '../../../../packages/textes/src/ecrans/socle.js';
import type { DefinitionEcran } from './ecrans.js';

/** Accueil provisoire : liste les écrans découverts. */
export function Accueil({ ecrans }: { ecrans: readonly DefinitionEcran[] }) {
  return (
    <main>
      <h1>{socle.accueil.titre}</h1>
      <p>{socle.accueil.message}</p>
      <ul>
        {ecrans.map((e) => (
          <li key={e.id}>
            <Link to={e.chemin}>{e.titre}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
