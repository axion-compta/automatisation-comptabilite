import { useId, useRef, useState, type FormEvent } from 'react';
import {
  ReponseRecherche,
  TYPES_RECHERCHE,
  BORNES_Q,
  type ResultatRecherche,
} from '../../../../../packages/contrat/src/domaines/recherche.js';
import { n08 } from '../../../../../packages/textes/src/ecrans/n08.js';
import { Bouton } from '../../../../../packages/ui/src/composants/Bouton.js';
import { ecrire, nouvelleCle } from '../../api.js';
import { Extrait } from './extrait.js';
import './n08.css';

type Page = { resultats: ResultatRecherche[]; curseurSuivant?: string; vide: boolean };

/** POST /recherche (via la couche api.ts) : le texte cherché reste dans le corps, jamais dans l'URL. */
async function chercher(q: string, curseur?: string): Promise<Page> {
  const corps = curseur === undefined ? { q } : { q, curseur };
  const lu = await ecrire('POST', '/recherche', corps, ReponseRecherche, nouvelleCle());
  const { resultats, curseurSuivant, mot } = lu.body;
  return { resultats, ...(curseurSuivant !== undefined ? { curseurSuivant } : {}), vide: mot === 'rien_trouve' || resultats.length === 0 };
}

const longueur = (s: string): number => [...s.trim()].length;

function annonce(n: number): string {
  return n === 1 ? n08.annonce.un : n08.annonce.plusieurs.replace('{n}', String(n));
}

/** N08 : recherche globale, résultats groupés par type. */
export function Ecran() {
  const [texte, setTexte] = useState('');
  const [resultats, setResultats] = useState<ResultatRecherche[]>([]);
  const [curseur, setCurseur] = useState<string | undefined>(undefined);
  const [etat, setEtat] = useState<'repos' | 'court' | 'chargement' | 'pret' | 'erreur'>('repos');
  const prefixe = useId();
  const requeteCourante = useRef('');

  async function lancer(q: string, suite?: string) {
    setEtat('chargement');
    try {
      const page = await chercher(q, suite);
      setResultats((avant) => (suite === undefined ? page.resultats : [...avant, ...page.resultats]));
      setCurseur(page.curseurSuivant);
      setEtat('pret');
    } catch {
      setEtat('erreur');
    }
  }

  function envoyer(e: FormEvent) {
    e.preventDefault();
    const q = texte.trim();
    if (longueur(q) < BORNES_Q.min) {
      setEtat('court');
      return;
    }
    requeteCourante.current = q;
    void lancer(q);
  }

  const pret = etat === 'pret';
  let message = '';
  if (etat === 'court') message = n08.trop_court;
  else if (etat === 'erreur') message = n08.erreur;
  else if (etat === 'chargement') message = n08.chargement;
  else if (pret) message = resultats.length === 0 ? n08.rien_trouve : annonce(resultats.length);

  return (
    <section>
      <h1>{n08.titre}</h1>
      <form className="n08-formulaire" onSubmit={envoyer}>
        <div>
          <label htmlFor="n08-recherche">{n08.etiquette}</label>
          <input id="n08-recherche" type="search" value={texte} onChange={(e) => setTexte(e.target.value)} autoComplete="off" />
        </div>
        <Bouton type="submit">{n08.bouton}</Bouton>
      </form>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {pret &&
        TYPES_RECHERCHE.map((type) => {
          const liste = resultats.filter((r) => r.type === type);
          if (liste.length === 0) return null;
          return (
            <section key={type} className="n08-groupe" aria-labelledby={prefixe + type}>
              <h2 id={prefixe + type}>{n08.groupes[type]}</h2>
              <ul>
                {liste.map((r) => (
                  <li key={r.id}>
                    <a href={r.lien}>{r.titre}</a> <Extrait html={r.extrait} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      {pret && curseur !== undefined && (
        <Bouton variante="discret" onClick={() => void lancer(requeteCourante.current, curseur)}>
          {n08.voirPlus}
        </Bouton>
      )}
    </section>
  );
}
