import { useState, type FormEvent } from 'react';
import { TYPES_DROIT, type TypeDroit } from '../../../../../packages/noyau/src/rgpd/types.js';
import { pagesPubliques as t } from '../../../../../packages/textes/src/ecrans/pages-publiques.js';
import { Tableau, type ColonneTableau } from '../../../../../packages/ui/src/composants/Tableau.js';
import csvSousTraitants from '../../../../../docs/sous-traitants.csv?raw';
import { lignesSousTraitants, type LigneSousTraitant } from './sous-traitants.js';

export type EnvoyerDemandeDroit = (d: { type: TypeDroit; email: string; message: string }) => Promise<{ reference: string }>;

const FORME_EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const COLONNES: ColonneTableau<LigneSousTraitant>[] = [
  { cle: 'role', entete: t.colonnes.role, rendu: (l) => l.role },
  { cle: 'nom', entete: t.colonnes.nom, rendu: (l) => l.nom ?? '' },
  { cle: 'ue', entete: t.colonnes.dansUnion, rendu: (l) => (l.dansUnion ? t.oui : t.non) },
  { cle: 'etat', entete: t.colonnes.etat, rendu: (l) => t.etats[l.etat] },
];

/** Pages publiques : confidentialité, mentions, sous-traitants, droits. Aucune donnée de client. */
export function Ecran({ noms = {}, envoyer }: { noms?: Record<string, string>; envoyer?: EnvoyerDemandeDroit }) {
  const [type, setType] = useState<TypeDroit>(TYPES_DROIT[0]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const s = t.sections;

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setReference(null);
    if (!envoyer) return;
    if (!FORME_EMAIL.test(email.trim())) return setErreur(t.formulaire.erreurs.email);
    if (message.trim() === '') return setErreur(t.formulaire.erreurs.message);
    setErreur(null);
    try {
      setReference((await envoyer({ type, email, message })).reference);
    } catch {
      setErreur(t.formulaire.erreurs.envoi);
    }
  }

  return (
    <div>
      <h1>{t.titre}</h1>
      <section id={s.confidentialite.ancre}>
        <h2>{s.confidentialite.titre}</h2>
        <p>{s.confidentialite.texte}</p>
      </section>
      <section id={s.mentions.ancre}>
        <h2>{s.mentions.titre}</h2>
        <p>{s.mentions.texte}</p>
      </section>
      <section id={s.sousTraitants.ancre}>
        <h2>{s.sousTraitants.titre}</h2>
        <p>{s.sousTraitants.texte}</p>
        <Tableau legende={t.legendeTableau} colonnes={COLONNES} lignes={lignesSousTraitants(csvSousTraitants, noms)} cleDeLigne={(l) => l.ref} />
      </section>
      <section id={s.droits.ancre}>
        <h2>{s.droits.titre}</h2>
        <p>{s.droits.texte}</p>
        <form onSubmit={soumettre} noValidate>
          <label>
            {t.formulaire.type}
            <select value={type} onChange={(e) => setType(e.target.value as TypeDroit)}>
              {TYPES_DROIT.map((d) => (
                <option key={d} value={d}>
                  {t.droitsLibelles[d]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.formulaire.email}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            {t.formulaire.message}
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <button type="submit" disabled={!envoyer}>
            {t.formulaire.envoyer}
          </button>
          {!envoyer && <p>{t.formulaire.contactIndisponible}</p>}
          {erreur && <p role="alert">{erreur}</p>}
          {reference && <p role="status">{t.formulaire.envoye.replace('{reference}', reference)}</p>}
        </form>
      </section>
    </div>
  );
}
