// Rendu d'un message de la discussion (fiche L05-T52) : tous les libellés viennent de e25.
import { e25 } from '../../../../packages/textes/src/ecrans/e25.js';
import { Bouton } from '../../../../packages/ui/src/composants/Bouton.js';
import { CarteAction, type EtatCarteAction } from '../../../../packages/ui/src/composants/CarteAction.js';
import { Etapes } from '../../../../packages/ui/src/composants/Etapes.js';
import { Pourquoi } from '../../../../packages/ui/src/composants/Pourquoi.js';
import { RenduCarte, type LibellesRenduCarte } from '../../../../packages/ui/src/composants/RenduCarte.js';
import { TexteSources } from '../../../../packages/ui/src/composants/TexteSources.js';
import { centimes } from '../../../../packages/noyau/src/argent/index.js';
import type { AppelIa, DecisionIa } from '../../../../packages/contrat/src/chat/journal-ia.js';
import type { Message as MessageEtat } from './etat.js';

const LIBELLES_CARTE: LibellesRenduCarte = { indisponible: e25.affichageIndisponible, ...e25.rendu };
const rempl = (modele: string, cle: string, valeur: string | number) => modele.replace(`{${cle}}`, String(valeur));
const LIBELLES_ACTION = {
  mention: e25.carte.mentionAvant, mentionValidee: (personne: string, date: string) => rempl(rempl(e25.carte.mentionApres, 'personne', personne), 'date', date),
  objets: (n: number) => rempl(e25.carte.objetsNombre, 'n', n), periode: (p: string) => rempl(e25.carte.periodeDe, 'periode', p),
  appliquer: e25.carte.appliquer, confirmer: e25.carte.confirmer, ouvrirEcran: e25.carte.ouvrirEcran, pourquoi: e25.pourquoi.bouton,
};
const rien = () => undefined;
export type ReponsePourquoi = { decision: DecisionIa; appel: AppelIa };

export type ActionsMessage = {
  etats: Record<string, EtatCarteAction>;
  pourquoi: Record<string, ReponsePourquoi>;
  enCours: boolean;
  onAppliquer: (id: string) => void; onPourquoi: (id: string) => void; onChoix: (code: string) => void;
  onRegenerer: () => void; onCopier: (texte: string) => void; onOuvrirVue: () => void;
};

export function MessageDiscussion({ message, actions }: { message: MessageEtat; actions: ActionsMessage }) {
  if (message.auteur === 'personne') return <p className="axion-discussion__personne">{message.texte}</p>;
  const { tour } = message;
  const terminee = !actions.enCours || tour.issue !== undefined;
  const etapes = tour.etapes.map((libelle, i) => ({ libelle, etat: terminee || i < tour.etapes.length - 1 ? ('faite' as const) : ('en_cours' as const) }));
  const p = (id: string) => actions.pourquoi[id];
  const reponse = tour.segments.join('');
  return (
    <article className="axion-discussion__axion">
      {etapes.length > 0 && <Etapes titre={e25.etapes.titre} etapes={etapes} libellesEtats={{ en_cours: e25.etapes.enCours, faite: e25.etapes.faite, echec: e25.etapes.echec }} />}
      {reponse !== '' && <TexteSources segments={[{ sorte: 'texte', texte: reponse }]} libelles={e25.sources} onSource={rien} />}
      {tour.cartes.map((c, i) => <RenduCarte key={i} brut={c} libelles={LIBELLES_CARTE} onOuvrir={rien} />)}
      {tour.propositions.map((pr) => (
        <div key={pr.proposition_id}>
          <CarteAction
            proposition={{ niveau: pr.niveau === 'L' ? 'B' : pr.niveau, nombreObjets: pr.nombre_objets, ...(pr.montant_total_centimes === undefined ? {} : { montantTotalCentimes: centimes(pr.montant_total_centimes) }) }}
            libelles={LIBELLES_ACTION}
            etat={actions.etats[pr.proposition_id] ?? 'a_valider'}
            onAppliquer={() => actions.onAppliquer(pr.proposition_id)}
            onOuvrirEcran={actions.onOuvrirVue}
            onPourquoi={() => actions.onPourquoi(pr.proposition_id)}
          />
          {p(pr.proposition_id) && <Pourquoi decision={p(pr.proposition_id)!.decision} appel={p(pr.proposition_id)!.appel} libelles={{ ...e25.pourquoi }} onSource={rien} />}
        </div>
      ))}
      {tour.question?.choix.map((c) => <Bouton key={c.code} variante="discret" onClick={() => actions.onChoix(c.code)}>{c.libelle_code}</Bouton>)}
      {tour.erreur === 'tour_interrompu' && <p role="status">{e25.tourInterrompu}</p>}
      {tour.erreur !== undefined && tour.erreur in e25.erreurs && <p role="alert">{e25.erreurs[tour.erreur as keyof typeof e25.erreurs].message}</p>}
      {terminee && (
        <div className="axion-discussion__outils">
          <Bouton variante="discret" onClick={() => actions.onCopier(reponse)}>{e25.copier}</Bouton>
          <Bouton variante="discret" onClick={actions.onRegenerer}>{e25.regenerer}</Bouton>
          {tour.issue === 'navigation' && <Bouton variante="discret" onClick={actions.onOuvrirVue}>{e25.ouvrirVue}</Bouton>}
        </div>
      )}
    </article>
  );
}
