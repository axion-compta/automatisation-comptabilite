import { Link, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';
import { DocumentAAccepter } from '../../../../packages/contrat/src/domaines/acceptations.js';
import { abonnement } from '../../../../packages/textes/src/ecrans/abonnement.js';
import { acceptation } from '../../../../packages/textes/src/ecrans/acceptation.js';
import { formaterDateAffiche } from '../../../../packages/ui/src/format/affichage.js';
import { ErreurEcriture, ecrire, nouvelleCle } from '../api.js';
import { useLecture } from '../donnees/lecture.js';

const ROUTE_LISTE = '/documents-contractuels/a-accepter';
const LongueurDate = 10;
/** Chemins qui restent ouverts sans acceptation : on ne retient jamais les données du client. */
export const CHEMINS_TOUJOURS_OUVERTS: readonly string[] = ['/reglages/donnees'];
const Liste = z.object({ body: z.array(DocumentAAccepter) });
const Accepte = z.object({ type: z.string(), version: z.number() });
type Document = z.infer<typeof DocumentAAccepter>;

/** Parcours d'acceptation (pas une sécurité) : une erreur de lecture ne bloque jamais l'écran. */
export function PorteAcceptation({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const client = useQueryClient();
  const lecture = useLecture(ROUTE_LISTE, Liste);
  const [coche, setCoche] = useState(false);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const documents = lecture.etat === 'pret' ? (lecture.donnees?.body ?? []) : [];
  if (documents.length === 0 || CHEMINS_TOUJOURS_OUVERTS.includes(pathname)) return <>{children}</>;
  const doc = documents[0] as Document;
  const relire = () => client.invalidateQueries({ queryKey: ['lecture', ROUTE_LISTE] });
  const accepter = async () => {
    setOccupe(true);
    setErreur('');
    try {
      await ecrire('POST', '/acceptations', { type: doc.type, version: doc.version }, Accepte, nouvelleCle());
      setCoche(false);
    } catch (e) {
      const code = e instanceof ErreurEcriture ? e.code : '';
      setErreur(code in abonnement.erreurs ? abonnement.erreurs[code as keyof typeof abonnement.erreurs] : abonnement.erreurs.ACCORD_MANQUANT);
    }
    setOccupe(false);
    await relire();
  };
  return (
    <section aria-labelledby="porte-titre">
      <h1 id="porte-titre">{acceptation.titre}</h1>
      <p>{acceptation.introduction}</p>
      <article>
        <h2>{acceptation.types[doc.type] ?? acceptation.typeInconnu}</h2>
        <p>{acceptation.version + ' ' + doc.version}</p>
        <p>{acceptation.approuveLe + ' ' + formaterDateAffiche(doc.approuve_le.slice(0, LongueurDate))}</p>
        {doc.sources.length > 0 && (
          <p>
            {acceptation.sources + ' : '}
            {doc.sources.join(', ')}
          </p>
        )}
      </article>
      <label>
        <input type="checkbox" checked={coche} onChange={(e) => setCoche(e.target.checked)} /> {acceptation.case}
      </label>
      <button type="button" disabled={!coche || occupe} onClick={() => void accepter()}>
        {acceptation.bouton}
      </button>
      {erreur !== '' && <p role="alert">{erreur}</p>}
      <p>
        <Link to="/reglages/donnees">{acceptation.lienDonnees}</Link>
      </p>
    </section>
  );
}
