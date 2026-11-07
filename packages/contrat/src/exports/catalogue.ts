import { z } from 'zod';

// Catalogue des listes exportables, CALCULÉ depuis le contrat : toute nouvelle liste y entre sans
// toucher ce fichier. Un type inconnu devient « texte » (le plus prudent : il sera neutralisé).

export type TypeColonne = 'texte' | 'entier' | 'centimes' | 'date' | 'booleen';

export interface ColonneExport {
  code: string;
  type: TypeColonne;
}

export interface ListeExportable {
  /** operationId de la route. */
  code: string;
  methode: string;
  chemin: string;
  colonnes: ColonneExport[];
  /** Première colonne `centimes`, s'il y en a une. */
  colonneTotal?: string;
}

export class ErreurCatalogue extends Error {
  readonly code: 'liste_sans_colonne';
  readonly liste: string;
  constructor(code: 'liste_sans_colonne', liste: string) {
    super(code + ' : ' + liste);
    this.name = 'ErreurCatalogue';
    this.code = code;
    this.liste = liste;
  }
}

type Noeud = Record<string, unknown>;

interface Procedure {
  route: Noeud;
  outputSchema: unknown;
}

const PROFONDEUR_MAX = 20;
const MOTIF_DATE = /^\^?\\d\{4\}-\\d\{2\}-\\d\{2\}\$?$/;

function estNoeud(x: unknown): x is Noeud {
  return typeof x === 'object' && x !== null;
}

function lireProcedure(x: unknown): Procedure | null {
  if ((typeof x !== 'object' && typeof x !== 'function') || x === null) return null;
  const def = (x as Noeud)['~orpc'];
  if (!estNoeud(def) || !estNoeud(def['route'])) return null;
  return { route: def['route'], outputSchema: def['outputSchema'] };
}

function collecter(noeud: unknown, chemin: string[], profondeur: number, vus: WeakSet<object>, sortie: { chemin: string[]; p: Procedure }[]): void {
  const p = lireProcedure(noeud);
  if (p !== null) {
    sortie.push({ chemin, p });
    return;
  }
  if (!estNoeud(noeud) || profondeur >= PROFONDEUR_MAX || vus.has(noeud)) return;
  vus.add(noeud);
  for (const cle of Object.keys(noeud)) collecter(noeud[cle], [...chemin, cle], profondeur + 1, vus, sortie);
}

function schemaJson(schema: unknown): Noeud | null {
  try {
    const j = z.toJSONSchema(schema as z.ZodType, { io: 'output', unrepresentable: 'any' });
    return estNoeud(j) ? (j as Noeud) : null;
  } catch {
    return null;
  }
}

function typeDeColonne(code: string, propriete: unknown): TypeColonne {
  if (!estNoeud(propriete)) return 'texte';
  const type = propriete['type'];
  if (type === 'integer') return code.endsWith('Centimes') ? 'centimes' : 'entier';
  if (type === 'boolean') return 'booleen';
  if (type === 'string') {
    const motif = propriete['pattern'];
    if (propriete['format'] === 'date') return 'date';
    if (typeof motif === 'string' && MOTIF_DATE.test(motif.split('[0-9]').join('\\d'))) return 'date';
  }
  return 'texte';
}

function listeDe(code: string, p: Procedure): ListeExportable | null {
  const methode = p.route['method'];
  const chemin = p.route['path'];
  if (typeof methode !== 'string' || methode.toUpperCase() !== 'GET' || typeof chemin !== 'string') return null;
  if (p.outputSchema === undefined) return null;
  const sortie = schemaJson(p.outputSchema);
  if (sortie === null || sortie['type'] !== 'object' || !estNoeud(sortie['properties'])) return null;
  const corps = sortie['properties']['body'];
  if (!estNoeud(corps) || corps['type'] !== 'array') return null;
  const ligne = corps['items'];
  if (!estNoeud(ligne) || ligne['type'] !== 'object' || !estNoeud(ligne['properties'])) return null;
  const proprietes = ligne['properties'];
  const colonnes: ColonneExport[] = Object.keys(proprietes).map((c) => ({ code: c, type: typeDeColonne(c, proprietes[c]) }));
  if (colonnes.length === 0) throw new ErreurCatalogue('liste_sans_colonne', code);
  const total = colonnes.find((c) => c.type === 'centimes');
  const liste: ListeExportable = { code, methode: 'GET', chemin, colonnes };
  if (total !== undefined) liste.colonneTotal = total.code;
  return liste;
}

/** Parcourt tout l'objet contrat (clés présentes et futures) et garde les routes GET qui renvoient une liste. */
export function catalogueExportable(contrat: unknown): ListeExportable[] {
  const trouvees: { chemin: string[]; p: Procedure }[] = [];
  collecter(contrat, [], 0, new WeakSet(), trouvees);
  const listes: ListeExportable[] = [];
  for (const { chemin, p } of trouvees) {
    const id = p.route['operationId'];
    const code = typeof id === 'string' && id !== '' ? id : chemin.join('.');
    const liste = listeDe(code, p);
    if (liste !== null) listes.push(liste);
  }
  return listes.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
}

/** Couples liste / colonne dont le type est « texte » : ce sont elles que la neutralisation couvre. */
export function colonnesTexte(catalogue: readonly ListeExportable[]): { liste: string; colonne: string }[] {
  return catalogue.flatMap((l) => l.colonnes.filter((c) => c.type === 'texte').map((c) => ({ liste: l.code, colonne: c.code })));
}
