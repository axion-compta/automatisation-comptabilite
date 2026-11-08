// Pré-remplissage du profil depuis des extraits déjà lus (spec 09 §01 règle 9, §02 règle 8). Aucun appel à un modèle ici.
// Un extrait devient une Source pour la règle « aucun doute » ; la valeur reste une proposition qu'une personne confirme.
import { evaluerSources } from './aucun-doute.js';
import type { Evaluation, Source } from './aucun-doute.js';
import { CONFIANCES, estDans, estDateIso } from './types.js';
import type { Confiance, Origine } from './types.js';
import type { NouvelleValeur } from './champs.js';

export type Zone = { x: number; y: number; largeur: number; hauteur: number };
export type Extrait = {
  cle: string;
  valeur: string;
  piece: string;
  page: number | undefined;
  zone: Zone | undefined;
  confiance: Confiance;
  dateSource: string;
  calcule?: boolean | undefined;
};
export type LienSource = { piece: string; page: number; zone: Zone };
export type MotifIgnore =
  | 'cle_vide' | 'valeur_vide' | 'piece_vide' | 'page_absente' | 'zone_hors_page'
  | 'confiance_inconnue' | 'date_invalide' | 'date_future' | 'montant_calcule';
export type ChampPreRempli = {
  decision: Evaluation['decision'];
  evaluation: Evaluation;
  candidats: string[];
  liens: LienSource[];
  nouvelle: NouvelleValeur;
};
export type Reglage = { societeId: string; dateDuJour: string; fraicheurMois: number };
export type Resultat = { champs: ChampPreRempli[]; ignores: { index: number; motif: MotifIgnore }[] };

const BORNE_BASSE = 0;
const BORNE_HAUTE = 1;
const RANGS_CONFIANCE: Record<Confiance, number> = { sur: 0, a_verifier: 1, douteux: 2 };
const vide = (t: unknown): boolean => typeof t !== 'string' || t.trim() === '';
const nombreFini = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

function zoneDansPage(z: Zone | undefined): z is Zone {
  if (z === undefined || z === null) return false;
  const { x, y, largeur, hauteur } = z;
  if (![x, y, largeur, hauteur].every(nombreFini)) return false;
  if (x < BORNE_BASSE || y < BORNE_BASSE || largeur <= BORNE_BASSE || hauteur <= BORNE_BASSE) return false;
  return x + largeur <= BORNE_HAUTE && y + hauteur <= BORNE_HAUTE;
}

function pageValide(p: unknown): p is number {
  return typeof p === 'number' && Number.isSafeInteger(p) && p >= BORNE_HAUTE;
}

export function motifIgnore(e: Extrait, dateDuJour: string): MotifIgnore | null {
  if (vide(e.cle)) return 'cle_vide';
  if (vide(e.valeur)) return 'valeur_vide';
  if (vide(e.piece)) return 'piece_vide';
  if (!pageValide(e.page)) return 'page_absente';
  if (!zoneDansPage(e.zone)) return 'zone_hors_page';
  if (!estDans(CONFIANCES, e.confiance)) return 'confiance_inconnue';
  if (!estDateIso(e.dateSource)) return 'date_invalide';
  if (e.dateSource > dateDuJour) return 'date_future';
  if (e.calcule === true) return 'montant_calcule';
  return null;
}

const refDe = (e: Extrait): string => {
  const z = e.zone as Zone;
  return `${e.piece}#p${String(e.page)}#${[z.x, z.y, z.largeur, z.hauteur].join(',')}`;
};

// Sans date du jour, seule la forme est contrôlée : la date future est jugée par preRemplir.
export function extraitEnSource(e: Extrait, dateDuJour = '9999-12-31'): Source | null {
  if (motifIgnore(e, dateDuJour) !== null) return null;
  return { origine: 'document', valeur: e.valeur.trim(), confiance: e.confiance, dateSource: e.dateSource, ref: refDe(e) };
}

const pire = (a: Confiance, b: Confiance): Confiance => (RANGS_CONFIANCE[b] > RANGS_CONFIANCE[a] ? b : a);

export function preRemplir(extraits: readonly Extrait[], reglage: Reglage): Resultat {
  const ignores: Resultat['ignores'] = [];
  const parCle = new Map<string, Extrait[]>();
  extraits.forEach((e, index) => {
    const motif = motifIgnore(e, reglage.dateDuJour);
    if (motif !== null) {
      ignores.push({ index, motif });
      return;
    }
    const cle = e.cle.trim();
    parCle.set(cle, [...(parCle.get(cle) ?? []), e]);
  });
  const champs: ChampPreRempli[] = [];
  for (const [cle, liste] of parCle) {
    const sources = liste.map((e) => extraitEnSource(e, reglage.dateDuJour) as Source);
    const evaluation = evaluerSources(sources, { dateDuJour: reglage.dateDuJour, fraicheurMois: reglage.fraicheurMois });
    const confirme = evaluation.decision === 'confirme_sans_question';
    const origine: Origine = confirme ? 'document' : 'proposition_ia';
    const unique = evaluation.valeurs.length === 1;
    const recente = sources.reduce((a, b) => (b.dateSource > a ? b.dateSource : a), '');
    champs.push({
      decision: evaluation.decision,
      evaluation,
      candidats: evaluation.valeurs,
      liens: liste.map((e) => ({ piece: e.piece, page: e.page as number, zone: e.zone as Zone })),
      nouvelle: {
        societeId: reglage.societeId,
        cle,
        valeur: unique ? evaluation.valeurs[0] : null,
        origine,
        confiance: liste.reduce<Confiance>((a, e) => pire(a, e.confiance), 'sur'),
        sourceRef: sources.map((s) => s.ref).join(' | '),
        dateSource: recente,
        statut: 'a_confirmer',
      },
    });
  }
  return { champs, ignores };
}
