import { ReponseDeclarationTva, type DeclarationTva } from '../../../../../packages/contrat/src/domaines/tva.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { mentionDocument } from '../../../../../packages/textes/src/documents/declarations.js';
import { e19 } from '../../../../../packages/textes/src/ecrans/e19.js';
import { BandeauDocument } from '../../../../../packages/ui/src/composants/BandeauDocument.js';
import { EtatChargement, EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { Provenance } from '../../../../../packages/ui/src/composants/Provenance.js';
import { useLecture } from '../../donnees/lecture.js';

const t = e19.declaration;
export type ControleVue = { regleId: string; resultat: string };
export type DeclarationVue = Omit<DeclarationTva, 'controles'> & { controles: ControleVue[] };

/** Seuls « ok » et « ecart » ont un texte propre ; tout autre résultat (dont IMPOSSIBLE) n'est jamais affiché comme réussi. */
export const texteControle = (r: string): string => (r === 'ok' ? t.resultats.ok : r === 'ecart' ? t.resultats.ecart : t.resultats.inconnu);

/** Identifiant de la déclaration d'une période (convention du jeu fictif : PERxxx → DECxxx). */
export const idDeclaration = (periodeId: string): string => 'DEC' + periodeId.slice(3);

export function VueDeclaration({ declaration: d }: { declaration: DeclarationVue }) {
  const validee = d.validePar !== null && d.valideLe !== null;
  const mention = validee ? mentionDocument({ validePar: d.validePar as string, valideLe: d.valideLe as string }) : mentionDocument();
  const cases = d.cases.filter((c) => c.montantCentimes !== 0);
  return (
    <article aria-labelledby="e19-decl-titre">
      <h2 id="e19-decl-titre">{t.titre}</h2>
      <BandeauDocument mention={mention} filigrane={validee ? 'aucun' : 'a_valider'} texteFiligrane={t.filigrane} />
      <section aria-labelledby="e19-decl-cases">
        <h3 id="e19-decl-cases">{t.cases}</h3>
        {cases.length === 0 ? (
          <p>{t.neant}</p>
        ) : (
          <ul>
            {cases.map((c) => (
              <li key={c.code} data-case={c.code}>
                <span>{t.libellesCases[c.code] ?? c.code}</span> <Montant centimes={centimes(c.montantCentimes)} />
                <Provenance
                  bouton={t.provenance}
                  vide={t.provenanceVide}
                  sources={c.sources.map((s) => ({ ecritureId: s.ecritureId, libelle: t.ecriture + ' ' + s.ecritureId, montant: c.montantCentimes }))}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="e19-decl-controles">
        <h3 id="e19-decl-controles">{t.controles}</h3>
        {d.controles.length === 0 ? (
          <p>{t.controlesVide}</p>
        ) : (
          <ul>
            {d.controles.map((c) => (
              <li key={c.regleId}>{c.regleId} : {texteControle(c.resultat)}</li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

/** Détail d'une déclaration préparée (lecture seule). */
export function Declaration({ id }: { id: string }) {
  const lecture = useLecture('/tva/declarations/' + encodeURIComponent(id), ReponseDeclarationTva);
  if (lecture.etat === 'chargement') return <EtatChargement libelle={e19.etats.chargement} />;
  const d = lecture.donnees?.body;
  if (lecture.etat === 'erreur' || !d) return <EtatErreur message={lecture.erreur?.code === 'acces_refuse' ? e19.etats.acces : e19.etats.erreur} />;
  return <VueDeclaration declaration={d} />;
}
