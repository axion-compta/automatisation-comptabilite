import { createHash } from 'node:crypto';
import { genererRgpd, type JeuRgpd } from '../../../donnees-fictives/src/rgpd.js';
import { conserverJusquAu, type RegleConservation } from '../../../noyau/src/conservation/regles.js';
import { aRappeler, changerEtat, enRetard, nouvelleDemande, TRANSITIONS } from '../../../noyau/src/rgpd/demandes.js';
import { deciderEffacement, type DecisionEffacement } from '../../../noyau/src/rgpd/effacement.js';
import { filtrer, poserMarque } from '../../../noyau/src/rgpd/marques.js';
import { rechercherPersonne, type Critere, type Source } from '../../../noyau/src/rgpd/recherche-personne.js';
import { ErreurRgpd, ISSUES_PAR_DROIT, type DemandePersonne, type EtatDemande, type EvenementPersonne, type Issue, type Marque } from '../../../noyau/src/rgpd/types.js';
import type { DemandeVue } from './personnes.js';

export type CodePersonnes = 'DEMANDE_INTROUVABLE' | 'DEJA_TRAITEE' | 'TRANSITION_INTERDITE' | 'ISSUE_NON_PERMISE' | 'MOTIF_MANQUANT' | 'SOURCE_MANQUANTE' | 'RECHERCHE_VIDE' | 'RECHERCHE_TROP_COURTE' | 'ERREUR_INTERNE';

const STATUT: Record<CodePersonnes, number> = {
  DEMANDE_INTROUVABLE: 404, DEJA_TRAITEE: 409, TRANSITION_INTERDITE: 409, ISSUE_NON_PERMISE: 422, MOTIF_MANQUANT: 422, SOURCE_MANQUANTE: 422,
  RECHERCHE_VIDE: 422, RECHERCHE_TROP_COURTE: 422, ERREUR_INTERNE: 500,
};

/** Le message est le seul code : jamais de motif ni de donnée de personne. */
export class ErreurPersonnes extends Error {
  override name = 'ErreurPersonnes';
  readonly status: number;
  constructor(readonly code: CodePersonnes) {
    super(code);
    this.status = STATUT[code];
  }
}

export interface OptionsPersonnes {
  horloge: () => string;
  dateReference: string;
  moisReponse: number;
  joursRappel: number;
  /** Règles de conservation fictives du jeu (les vraies viendront des paramètres datés). */
  regles: readonly RegleConservation[];
  pays?: readonly string[];
  jeu?: JeuRgpd;
  /** Pour une demande d'effacement : critère des personnes concernées, par id de demande. */
  concernes?: Readonly<Record<string, Critere>>;
  gel?: (source: string, id: string) => boolean;
}

const ACTEUR_ESSAI = 'agent_exemple';
const PAYS_ESSAI = ['FR'] as const;
type Cat = 'pieces' | 'ecritures_livres' | 'conversations' | null;
const CATEGORIE: Record<Source, Cat> = { pieces: 'pieces', ecritures: 'ecritures_livres', conversations: 'conversations', tiers: null };
const MAPPAGE: Readonly<Record<string, CodePersonnes>> = {
  deja_traitee: 'DEJA_TRAITEE', transition_interdite: 'TRANSITION_INTERDITE', issue_non_permise: 'ISSUE_NON_PERMISE',
  motif_manquant: 'MOTIF_MANQUANT', source_manquante: 'SOURCE_MANQUANTE', recherche_vide: 'RECHERCHE_VIDE',
  recherche_trop_courte: 'RECHERCHE_TROP_COURTE',
};
const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const empreinte = (t: string): string => createHash('sha256').update(t).digest('hex');

function traduire(e: unknown): Error {
  if (e instanceof ErreurPersonnes) return e;
  return new ErreurPersonnes(e instanceof ErreurRgpd ? (MAPPAGE[e.code] ?? 'ERREUR_INTERNE') : 'ERREUR_INTERNE');
}

/** Service pur en mémoire sur le jeu fictif : aucune suppression, seulement des marques. */
export function creerServicePersonnes(options: OptionsPersonnes) {
  const jeu = options.jeu ?? genererRgpd({ dateReference: options.dateReference });
  const demandes = new Map<string, DemandePersonne>(jeu.demandes.map((d) => [d.id, { ...d }]));
  const issues = new Map<string, Issue>(), conserves = new Map<string, string>();
  const marques = new Map<string, Marque[]>(), rejeux = new Map<string, DemandeVue>();
  const evenements: EvenementPersonne[] = [];
  let compteur = 0;
  const maintenant = options.horloge;
  const aujourdhui = (): string => maintenant().slice(0, 10);
  const cle = (source: string, id: string): string => `${source}|${id}`;

  const vue = (d: DemandePersonne): DemandeVue => ({
    id: d.id, type: d.type, recue_le: d.recueLe, echeance: d.echeance, etat: d.etat,
    en_retard: enRetard([d], aujourdhui()).length > 0,
    a_rappeler: aRappeler([d], aujourdhui(), options.joursRappel).length > 0,
    issue: issues.get(d.id) ?? null, conserve_jusqu_au: conserves.get(d.id) ?? null, source_motif: d.sourceMotif,
  });
  const unefois = (k: string, calcul: () => DemandeVue): DemandeVue => {
    const vu = rejeux.get(k);
    if (vu !== undefined) return vu;
    try {
      return rejeux.set(k, calcul()).get(k) as DemandeVue;
    } catch (e) {
      throw traduire(e);
    }
  };

  const trouver = (critere: Critere): { source: Source; id: string; par: 'nom' | 'email' | 'iban' }[] => {
    const trouves = rechercherPersonne(critere, { tiers: [], pieces: jeu.pieces, ecritures: jeu.ecritures, conversations: jeu.conversations });
    return filtrer(trouves.map((t) => ({ ...t, marques: marques.get(cle(t.source, t.id)) ?? [] })), 'affichage')
      .map(({ source, id, par }) => ({ source, id, par }));
  };

  const datesDe = (source: Source, id: string): Partial<Record<'date_document', string>> => {
    const date = source === 'pieces' ? jeu.pieces.find((p) => p.id === id)?.recueLe
      : source === 'conversations' ? jeu.conversations.find((c) => c.id === id)?.derniereActiviteLe : undefined;
    return date === undefined ? {} : { date_document: date };
  };
  const decider = (source: Source, id: string): DecisionEffacement => {
    const categorie = CATEGORIE[source];
    const regles = options.regles.filter((r) => r.categorie === categorie);
    const conservation = categorie === null ? null
      : conserverJusquAu(regles, { pays: [...(options.pays ?? PAYS_ESSAI)], categorie, dates: datesDe(source, id) });
    return deciderEffacement({ objet: { source, id }, conservation, gelActif: options.gel?.(source, id) ?? false, finSauvegardes: null }, aujourdhui());
  };
  /** Décision la plus stricte sur l'ensemble des objets : gel, puis conservation (date la plus tardive), sinon effacement. */
  const decisionGlobale = (objets: { source: Source; id: string }[]): DecisionEffacement => {
    const ds = objets.map((o) => decider(o.source, o.id));
    const gel = ds.find((d) => d.issue === 'refus_gel');
    if (gel) return gel;
    const refus = ds.filter((d): d is Extract<DecisionEffacement, { issue: 'refus_conservation' }> => d.issue === 'refus_conservation');
    if (refus.length === 0) return { issue: 'a_effacer', sauvegardesJusquAu: null };
    return refus.filter((d) => d.jusquAu !== null).sort((a, b) => comparer(b.jusquAu ?? '', a.jusquAu ?? ''))[0] ?? refus[0]!;
  };

  return {
    lister: (): DemandeVue[] => [...demandes.values()].sort((a, b) => comparer(a.echeance, b.echeance) || comparer(a.id, b.id)).map(vue),
    enregistrer(cleRejeu: string, corps: { type: DemandePersonne['type']; recue_le: string }): DemandeVue {
      return unefois(`enregistrer|${cleRejeu}`, () => {
        compteur += 1;
        const d = nouvelleDemande({ id: `dem-${compteur}`, societeId: jeu.demandes[0]?.societeId ?? 'societe_exemple', type: corps.type, recueLe: corps.recue_le }, { moisReponse: options.moisReponse });
        demandes.set(d.id, d);
        evenements.push({ type: 'personne.demande_recue', horodatage: maintenant(), demandeId: d.id, donnees: { type: d.type, issue: null, motifFourni: false } });
        return vue(d);
      });
    },
    rechercher(query: Critere): { source: string; id: string; par: string }[] {
      try { return trouver(query); } catch (e) { throw traduire(e); }
    },
    traiter(cleRejeu: string, id: string, corps: { issue: Issue; motif?: string; source?: string; inclure_autres_personnes?: boolean }): DemandeVue {
      return unefois(`traiter|${id}|${cleRejeu}`, () => {
        const d = demandes.get(id);
        if (d === undefined) throw new ErreurPersonnes('DEMANDE_INTROUVABLE');
        if (TRANSITIONS[d.etat].length === 0) throw new ErreurRgpd('deja_traitee');
        if (!(ISSUES_PAR_DROIT[d.type] as readonly string[]).includes(corps.issue)) throw new ErreurRgpd('issue_non_permise');
        const le = aujourdhui();
        let objets: { source: Source; id: string }[] = [];
        let [source, jusquAu] = [corps.source, null as string | null];
        if (d.type === 'effacement' && corps.issue !== 'renvoi_societe') {
          const critere = options.concernes?.[id];
          objets = critere === undefined ? [] : trouver(critere);
          const decision = decisionGlobale(objets);
          if (decision.issue !== corps.issue) throw new ErreurRgpd('issue_non_permise');
          if (decision.issue === 'refus_conservation') {
            jusquAu = decision.jusquAu;
            source = corps.source ?? decision.source ?? undefined;
          }
        }
        const refus = corps.issue === 'refus_conservation' || corps.issue === 'refus_gel';
        const vers: EtatDemande = corps.issue === 'renvoi_societe' ? 'transmise_a_la_societe' : refus ? 'refusee' : 'traitee';
        const base = vers === 'transmise_a_la_societe' || d.etat !== 'recue' ? d : changerEtat(d, 'en_cours', { par: ACTEUR_ESSAI, le }).demande;
        const o: Parameters<typeof changerEtat>[2] = { par: ACTEUR_ESSAI, le, issue: corps.issue, fichierEmpreinte: empreinte(`${id}|${corps.issue}`) };
        if (corps.motif !== undefined) o.motif = corps.motif;
        if (source !== undefined) o.source = source;
        const r = changerEtat(base, vers, o);
        for (const obj of corps.issue === 'a_effacer' ? objets : []) {
          const k = cle(obj.source, obj.id);
          marques.set(k, poserMarque({ id: obj.id, source: obj.source, marques: marques.get(k) ?? [] }, 'a_effacer', { le: maintenant(), par: ACTEUR_ESSAI }).objet.marques ?? []);
        }
        demandes.set(id, r.demande);
        issues.set(id, corps.issue);
        if (jusquAu !== null) conserves.set(id, jusquAu);
        evenements.push(r.evenement);
        return vue(r.demande);
      });
    },
    journal: (): EvenementPersonne[] => evenements.map((e) => ({ ...e, donnees: { ...e.donnees } })),
  };
}
