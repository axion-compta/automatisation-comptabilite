import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { e50 } from '../../../../../packages/textes/src/ecrans/e50.js';
import { e50Personnes } from '../../../../../packages/textes/src/ecrans/e50-personnes.js';
import { lire, ErreurLecture } from '../../api.js';

const t = e50Personnes.rechercher;
const Reponse = z.object({ body: z.array(z.object({ source: z.string(), id: z.string(), par: z.string() })) });
const CHAMPS = ['nom', 'email', 'iban'] as const;
/** Étiquettes des sources de résultats (tiers, pièces, écritures, conversations). */
const SOURCES: Record<string, string> = { tiers: 'Tiers', pieces: 'Pièces', ecritures: 'Écritures', conversations: 'Conversations' };
type Issue = { genre: 'neutre' } | { genre: 'message'; texte: string } | { genre: 'groupes'; groupes: [string, number][] };

/** Recherche d'une personne : la saisie part dans la requête seulement, jamais dans l'URL de la page. */
export function RecherchePersonne() {
  const [saisie, setSaisie] = useState<Record<(typeof CHAMPS)[number], string>>({ nom: '', email: '', iban: '' });
  const [issue, setIssue] = useState<Issue>({ genre: 'neutre' });
  const [envoi, setEnvoi] = useState(false);
  const rechercher = async (ev: FormEvent) => {
    ev.preventDefault();
    const params = new URLSearchParams();
    for (const c of CHAMPS) if (saisie[c].trim() !== '') params.set(c, saisie[c].trim());
    if (params.size === 0) return;
    setEnvoi(true);
    try {
      const { body } = await lire('/personnes/recherche?' + params.toString(), Reponse);
      const nombres = new Map<string, number>();
      for (const r of body) nombres.set(r.source, (nombres.get(r.source) ?? 0) + 1);
      setIssue(body.length === 0 ? { genre: 'message', texte: t.aucunResultat } : { genre: 'groupes', groupes: [...nombres] });
    } catch (e) {
      // 422 RECHERCHE_TROP_COURTE / RECHERCHE_VIDE : lire() le signale par le statut 422.
      const statut = e instanceof ErreurLecture ? e.statut : 0;
      setIssue({ genre: 'message', texte: statut === 422 ? t.tropCourt : statut === 503 ? e50Personnes.erreurs.reglageAbsent : e50.etats.erreur });
    } finally {
      setEnvoi(false);
    }
  };
  const libelles = { nom: t.nom, email: t.email, iban: t.iban };
  return (
    <section aria-labelledby="e50-recherche">
      <h2 id="e50-recherche">{t.titre}</h2>
      <form onSubmit={(ev) => void rechercher(ev)}>
        {CHAMPS.map((c) => (
          <label key={c}>
            {libelles[c]}
            <input name={c} type="text" autoComplete="off" value={saisie[c]} onChange={(ev) => setSaisie({ ...saisie, [c]: ev.target.value })} />
          </label>
        ))}
        <button type="submit" disabled={envoi} style={{ minHeight: 24, minWidth: 24 }}>{t.bouton}</button>
      </form>
      {issue.genre === 'message' ? <p role="alert">{issue.texte}</p> : null}
      {issue.genre === 'groupes' ? (
        <ul>
          {issue.groupes.map(([source, n]) => (
            <li key={source}>{SOURCES[source] ?? source} : {n}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
