import { useRouter } from '@tanstack/react-router';
import { e25 } from '../../../../../packages/textes/src/ecrans/e25.js';
import { Discussion } from '../../chat/Discussion.js';

/** M04 : discussion en plein écran, avec retour vers la page précédente. */
export function Ecran() {
  const router = useRouter();
  return (
    <section className="m04-plein-ecran">
      <button type="button" className="m04-retour" onClick={() => router.history.back()}>
        {e25.mobile.retour}
      </button>
      <h1>{e25.mobile.titre}</h1>
      <Discussion onOuvrirVue={() => void router.navigate({ to: '/' })} />
    </section>
  );
}
