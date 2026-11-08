// Tour de chat en mémoire : ordre fixe en code, le modèle (simulé) rédige, les règles viennent du noyau (L05-T39).
import type { DemandeMessage, Evenement } from '../../../../packages/contrat/src/chat/evenements.js';
import { avecUnNouvelEssai } from '../../../../packages/contrat/src/chat/sortie-modele.js';
import { OUTILS, schemaSortie } from '../../../../packages/contrat/src/chat/outils.js';
import { autoriserAppel, estimerCout, ajouterCoutReel } from '../../../../packages/noyau/src/chat/budget.js';
import { recalculerContexte, evenementsJournal, type EntreeContexte } from '../../../../packages/noyau/src/chat/contexte.js';
import { filtrerSortie } from '../../../../packages/noyau/src/chat/filtre-sortie.js';
import { encadrer, preparerEntree, type DetecteurSensibles } from '../../../../packages/noyau/src/chat/gardien-entree.js';
import { verifierOutil, type SorteAgent } from '../../../../packages/noyau/src/chat/gardien-sortie.js';
import { issuePourErreur, verifierTour, type EvenementTour } from '../../../../packages/noyau/src/chat/issues.js';
import { marquer, verifierArguments } from '../../../../packages/noyau/src/chat/quarantaine.js';
import { TamponReferences, type Resultats, type Segment } from '../../../../packages/noyau/src/chat/references.js';
import { ErreurChat, microCentimes, type CodeErreur, type Issue } from '../../../../packages/noyau/src/chat/types.js';
import { appelerModele, type ModeleTexte } from '../ia/appel.js';

export const MARQUEUR_INCONNU = '⟦inconnu⟧';
export type EntreeJournal = { code: string; [cle: string]: unknown };
export interface ContexteTour extends EntreeContexte {
  textesNonFiables?: readonly string[];
  /** Lecture sur les données en mémoire : jamais d'écriture. */
  executer: (outil: string, args: unknown) => unknown;
}
export interface ReglagesTour {
  principal: string; secours?: string; listeFermee: readonly string[]; delaiMs: number;
  plafond: number | undefined; tarifEntree: number; tarifSortie: number; plafondJetonsSortie: number;
  etapesMax: number; lexique: readonly string[]; sorteAgent: SorteAgent; roleLectureSeule: boolean;
  detecteurSensibles: DetecteurSensibles;
}
export interface ParametresTour {
  demande: DemandeMessage; contexte: ContexteTour; port: ModeleTexte; reglages: ReglagesTour;
  journal: (e: EntreeJournal) => void;
}
type Brut = Evenement extends infer E ? (E extends { id: number } ? Omit<E, 'id'> : never) : never;
type Fin = { issue: Issue; cout: number };

class Arret extends Error {
  constructor(readonly code: CodeErreur) { super(code); }
}

const texteDe = (s: Segment): string => (s.sorte === 'texte' ? s.texte : s.sorte === 'valeur' ? String(s.valeur) : MARQUEUR_INCONNU);

function resultatsDe(appel: string, sortie: unknown): Resultats {
  const tableaux = Object.entries((sortie ?? {}) as Record<string, unknown>).filter(([, v]) => Array.isArray(v));
  const nombre = (v: unknown) => ({ valeur: (v as unknown[]).length, nature: 'nombre' as const, source: { type: 'lecture', id: appel } });
  return { [appel]: Object.fromEntries(tableaux.map(([k, v]) => [`${k}_nombre`, nombre(v)])) };
}

async function* corps(p: ParametresTour, fin: Fin): AsyncGenerator<Brut> {
  const { demande, contexte: c, reglages: r, port, journal } = p;
  const refuser = (code: CodeErreur): Brut => {
    fin.issue = issuePourErreur(code);
    return { type: 'erreur', code };
  };
  try {
    evenementsJournal(recalculerContexte(c).rejets).forEach((j) => journal({ ...j }));
  } catch (e) {
    if (!(e instanceof ErreurChat)) throw e;
    yield refuser('droit_insuffisant');
    return;
  }
  const prepare = preparerEntree({ texteUtilisateur: demande.texte, textesNonFiables: c.textesNonFiables ?? [], detecteurSensibles: r.detecteurSensibles });
  if (prepare.refus !== undefined || prepare.signaux.includes('consignes_demandees')) {
    journal({ code: 'chat.refus', motif: prepare.refus ?? 'consignes_confidentielles' });
    fin.issue = 'refus_utile';
    return;
  }
  prepare.signaux.forEach((code) => journal({ code }));

  let entree = prepare.entree;
  let depense = microCentimes(0);
  const modele = async (): Promise<string> => {
    const estimation = estimerCout({ jetonsEntree: entree.length, plafondJetonsSortie: r.plafondJetonsSortie, tarifEntree: r.tarifEntree, tarifSortie: r.tarifSortie });
    const plafond = r.plafond === undefined ? undefined : microCentimes(r.plafond);
    const d = autoriserAppel({ depense, estimation, plafond });
    if (!d.permis) throw new Arret(d.code);
    const res = await appelerModele({ port, reglage: { principal: r.principal, ...(r.secours === undefined ? {} : { secours: r.secours }) }, listeFermee: r.listeFermee, entree, delaiMs: r.delaiMs, ecriture: false });
    if (res.issue === 'arret') throw new Arret(res.code);
    depense = ajouterCoutReel(depense, res.reponse.coutMicroCentimes);
    return res.reponse.texte;
  };
  const outilsPermis = OUTILS.map((o) => o.nom);
  const resultats: Resultats = {};
  try {
    for (let etape = 1; etape <= r.etapesMax; etape++) {
      const sortie = await avecUnNouvelEssai(modele, outilsPermis);
      fin.cout = depense;
      if (sortie.sorte === 'sans_modele') throw new Arret('hors_schema');
      if (sortie.sorte === 'rejet') throw new Arret(sortie.code);
      if (sortie.sorte === 'texte') {
        const tampon = new TamponReferences(resultats);
        const filtre = filtrerSortie(sortie.texte, { lexique: r.lexique });
        const segments = [...tampon.pousser(filtre.texte), ...tampon.terminer()];
        yield { type: 'texte', texte: segments.map(texteDe).join('') };
        fin.issue = 'reponse';
        return;
      }
      const niveauOutil = OUTILS.find((o) => o.nom === sortie.outil)?.niveau ?? 'I';
      const v = verifierOutil({ outil: sortie.outil, niveauOutil, sorteAgent: r.sorteAgent, outilsPermisAgent: outilsPermis, roleLectureSeule: r.roleLectureSeule });
      if (!v.permis) throw new Arret(v.code);
      if (niveauOutil !== 'L') throw new Arret('niveau_ferme');
      const args = Object.fromEntries(Object.entries((sortie.arguments ?? {}) as Record<string, unknown>).map(([k, x]) => [k, marquer(x, 'outil')]));
      if (!verifierArguments(niveauOutil, args, false).permis) throw new Arret('parametre_invalide');
      const lu = schemaSortie(sortie.outil)?.safeParse(c.executer(sortie.outil, sortie.arguments));
      if (!lu?.success) throw new Arret('hors_schema');
      const appel = `appel_${etape}`;
      Object.assign(resultats, resultatsDe(appel, lu.data));
      entree += `\n\n${appel} :\n${encadrer(JSON.stringify(lu.data))}`;
      yield { type: 'etape', etape: sortie.outil };
    }
    throw new Arret('budget_tour_atteint');
  } catch (e) {
    if (!(e instanceof Arret)) throw e;
    yield refuser(e.code);
    if (e.code === 'budget_tour_atteint') fin.issue = 'refus_utile';
  }
}

/** Un tour : début, événements, une seule fin valide. Le tour ne fait que proposer, jamais appliquer. */
export async function* executerTour(p: ParametresTour): AsyncGenerator<Evenement> {
  const vus: EvenementTour[] = [];
  const emettre = (e: Brut): Evenement => {
    const evt = { ...e, id: vus.length + 1 } as Evenement;
    vus.push(evt as EvenementTour);
    return evt;
  };
  const fin: Fin = { issue: 'escalade', cout: 0 };
  yield emettre({ type: 'tour.debut' });
  for await (const e of corps(p, fin)) yield emettre(e);
  const finale = (): Brut => ({ type: 'tour.fin', issue: fin.issue, cout_micro_centimes: fin.cout });
  if (!verifierTour([...vus, { ...finale(), id: vus.length + 1 } as EvenementTour]).valide) {
    fin.issue = 'escalade';
    yield emettre({ type: 'erreur', code: 'hors_schema' });
  }
  yield emettre(finale());
}
