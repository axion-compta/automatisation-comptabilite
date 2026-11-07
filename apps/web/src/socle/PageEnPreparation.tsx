import { Link } from '@tanstack/react-router';
import { socle } from '../../../../packages/textes/src/ecrans/socle.js';

/** Page affichée pour toute route inconnue. */
export function PageEnPreparation() {
  return (
    <section>
      <h1>{socle.enPreparation.titre}</h1>
      <p>{socle.enPreparation.message}</p>
      <Link to="/">{socle.accueil.titre}</Link>
    </section>
  );
}
