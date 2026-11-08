// Matrice « mauvais client » (V3-PRI-008, R03) : un cas par route, outil, export et tâche du contrat. Générée ici,
// vérifiée contre l'interface CibleEtanche (le serveur réel et la console viendront dans une fiche ultérieure).
export type GenreElement = 'route' | 'outil' | 'export' | 'tache';
export interface CasMauvaisClient { genre: GenreElement; code: string; methode?: string; chemin?: string }

/** Noms de fichier (sans extension) de apps/serveur/src/taches/. */
export const TACHES_PLANIFIEES: readonly string[] = Object.freeze([
  'controles-nocturnes',
  'veille-balayage',
  'sante-connecteurs',
  'purge-conservation',
  'sondes-exploitation',
  'veille-resume',
]);

export class ErreurMatrice extends Error {
  constructor(readonly code: 'doublon', readonly element: string) {
    super(code + ' : ' + element);
    this.name = 'ErreurMatrice';
  }
}

export const cle = (c: Pick<CasMauvaisClient, 'genre' | 'code'>): string => c.genre + ':' + c.code;
const METHODES = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const estObjet = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

function casDeRoutes(doc: unknown): CasMauvaisClient[] {
  const paths = estObjet(doc) ? doc['paths'] : undefined;
  if (!estObjet(paths)) return [];
  return Object.entries(paths).flatMap(([chemin, ops]) =>
    estObjet(ops)
      ? Object.entries(ops)
          .filter(([m, op]) => METHODES.includes(m) && estObjet(op))
          .map(([m, op]): CasMauvaisClient => {
            const methode = m.toUpperCase();
            const id = (op as Record<string, unknown>)['operationId'];
            return { genre: 'route', code: typeof id === 'string' && id !== '' ? id : methode + ' ' + chemin, methode, chemin };
          })
      : [],
  );
}

/** Un cas par opération du document, outil, liste exportable et tâche ; trié par genre puis code. */
export function genererMatrice(
  doc: unknown,
  outils: readonly { nom: string }[],
  exports: readonly { code: string }[],
  taches: readonly string[],
): CasMauvaisClient[] {
  const cas: CasMauvaisClient[] = [
    ...casDeRoutes(doc),
    ...outils.map((o): CasMauvaisClient => ({ genre: 'outil', code: o.nom })),
    ...exports.map((e): CasMauvaisClient => ({ genre: 'export', code: e.code })),
    ...taches.map((t): CasMauvaisClient => ({ genre: 'tache', code: t })),
  ];
  const vus = new Set<string>();
  for (const c of cas) {
    if (vus.has(cle(c))) throw new ErreurMatrice('doublon', cle(c));
    vus.add(cle(c));
  }
  return cas.sort((x, y) => (x.genre !== y.genre ? (x.genre < y.genre ? -1 : 1) : x.code < y.code ? -1 : x.code > y.code ? 1 : 0));
}

/** Les `genre:code` attendus qui n'ont aucun cas dans la matrice. */
export function elementsSansCas(attendus: readonly string[], matrice: readonly CasMauvaisClient[]): string[] {
  const presents = new Set(matrice.map(cle));
  return attendus.filter((a) => !presents.has(a));
}

/** Fichiers .ts (hors tests) du dossier des tâches qui ne figurent pas dans la liste déclarée. */
export function tachesNonDeclarees(fichiers: readonly string[], declarees: readonly string[]): string[] {
  return fichiers.filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).map((f) => f.slice(0, -'.ts'.length)).filter((n) => !declarees.includes(n));
}

export type ReponseCible = { statut: number; corps: string; journal: readonly { code: string; societeId: string }[] };
export interface CibleEtanche {
  appeler(cas: CasMauvaisClient, session: { societeId: string }, objetId: string): Promise<ReponseCible>;
}
export type Ecart = 'statut_non_404' | 'corps_different_d_un_inexistant' | 'fuite_d_octets_de_a' | 'refus_acces_absent';
export type Societe = { societeId: string; objetId: string; octets: string[] };

const STATUT_INTROUVABLE = 404;
const OBJET_INEXISTANT = 'objet-inexistant';

/** Session de B sur un objet de A, comparée à un identifiant inexistant : renvoie la liste des écarts (vide = étanche). */
export async function verifierCas(cible: CibleEtanche, cas: CasMauvaisClient, a: Societe, b: Societe): Promise<Ecart[]> {
  const session = { societeId: b.societeId };
  const sur = await cible.appeler(cas, session, a.objetId);
  const inexistant = await cible.appeler(cas, session, OBJET_INEXISTANT);
  const ecarts: Ecart[] = [];
  if (sur.statut !== STATUT_INTROUVABLE) ecarts.push('statut_non_404');
  if (sur.corps !== inexistant.corps) ecarts.push('corps_different_d_un_inexistant');
  if (a.octets.some((o) => o !== '' && sur.corps.includes(o))) ecarts.push('fuite_d_octets_de_a');
  if (!sur.journal.some((l) => l.code === 'refus_acces' && l.societeId === b.societeId)) ecarts.push('refus_acces_absent');
  return ecarts;
}
