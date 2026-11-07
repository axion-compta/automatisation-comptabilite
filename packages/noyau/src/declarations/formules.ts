// Formules entre lignes d'un formulaire : addition, soustraction et plancher à zéro seulement.
// Analyse à la main, sans eval ni Function ; aucun taux ni code de ligne n'est écrit ici.
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import type { CaseDeclaration, LigneFormulaire, SourceCase, TableFormulaire } from './cases.js';

export class ErreurFormule extends Error {
  override name = 'ErreurFormule';
  readonly code: 'formule_invalide' | 'formule_cyclique';
  readonly codes: string[];
  constructor(code: 'formule_invalide' | 'formule_cyclique', message: string, codes: string[] = []) {
    super(message);
    this.code = code;
    this.codes = codes;
  }
}

export type ResultatFormules =
  | { bloque: false; cases: CaseDeclaration[] }
  | { bloque: true; code: 'ligne_absente'; ligne: string }
  | { bloque: true; code: 'base_negative'; ligne: string; montant: Centimes };

type Terme = { code: string } | { plancher: Expression };
type Expression = { signe: 1 | -1; terme: Terme }[];
type Jeton = string;

const PLANCHER = 'plancher_zero(';

const estCode = (s: string): boolean => (s >= 'A' && s <= 'Z') || (s >= '0' && s <= '9') || s === '_';

function invalide(ligne: string, raison: string): ErreurFormule {
  return new ErreurFormule('formule_invalide', `Formule invalide sur « ${ligne} » : ${raison}.`);
}

function decouper(texte: string, ligne: string): Jeton[] {
  const jetons: Jeton[] = [];
  let i = 0;
  while (i < texte.length) {
    const ch = texte.charAt(i);
    if (ch === ' ' || ch === '\t') i += 1;
    else if (ch === '+' || ch === '-' || ch === ')') {
      jetons.push(ch);
      i += 1;
    } else if (texte.startsWith(PLANCHER, i)) {
      jetons.push(PLANCHER);
      i += PLANCHER.length;
    } else if (estCode(ch)) {
      let j = i;
      while (j < texte.length && estCode(texte.charAt(j))) j += 1;
      jetons.push(texte.slice(i, j));
      i = j;
    } else throw invalide(ligne, `caractère interdit « ${ch} »`);
  }
  return jetons;
}

function analyser(texte: string, ligne: string): Expression {
  const jetons = decouper(texte, ligne);
  let pos = 0;
  const expression = (): Expression => {
    const termes: Expression = [];
    let signe: 1 | -1 = 1;
    for (;;) {
      const j = jetons[pos];
      pos += 1;
      if (j === undefined) throw invalide(ligne, 'terme attendu');
      if (j === PLANCHER) {
        const interieur = expression();
        if (jetons[pos] !== ')') throw invalide(ligne, 'parenthèse non fermée');
        pos += 1;
        termes.push({ signe, terme: { plancher: interieur } });
      } else if (j === '+' || j === '-' || j === ')') throw invalide(ligne, 'terme attendu');
      else termes.push({ signe, terme: { code: j } });
      const op = jetons[pos];
      if (op !== '+' && op !== '-') return termes;
      signe = op === '+' ? 1 : -1;
      pos += 1;
    }
  };
  const resultat = expression();
  if (pos < jetons.length) throw invalide(ligne, 'suite inattendue');
  return resultat;
}

function citees(e: Expression, sortie: string[] = []): string[] {
  for (const { terme } of e) {
    if ('code' in terme) sortie.push(terme.code);
    else citees(terme.plancher, sortie);
  }
  return sortie;
}

function comparerSources(a: SourceCase, b: SourceCase): number {
  return a.ecritureId < b.ecritureId ? -1 : a.ecritureId > b.ecritureId ? 1 : a.ligneIndex - b.ligneIndex;
}

/** Ordre de calcul des lignes à formule, dépendances d'abord ; sans récursion pour tenir les chaînes longues. */
function ordonner(formules: Map<string, Expression>): string[] {
  const ordre: string[] = [];
  const etat = new Map<string, 'en_cours' | 'fait'>();
  for (const depart of formules.keys()) {
    if (etat.has(depart)) continue;
    const pile: { code: string; suivantes: string[] }[] = [];
    const entrer = (code: string): void => {
      etat.set(code, 'en_cours');
      pile.push({ code, suivantes: citees(formules.get(code) ?? []).filter((x) => formules.has(x)) });
    };
    entrer(depart);
    while (pile.length > 0) {
      const haut = pile[pile.length - 1]!;
      const prochain = haut.suivantes.shift();
      if (prochain === undefined) {
        etat.set(haut.code, 'fait');
        ordre.push(haut.code);
        pile.pop();
      } else if (etat.get(prochain) === 'en_cours') {
        const debut = pile.findIndex((p) => p.code === prochain);
        const cycle = pile.slice(debut).map((p) => p.code);
        throw new ErreurFormule('formule_cyclique', `Formules cycliques : ${cycle.join(', ')}.`, cycle);
      } else if (!etat.has(prochain)) entrer(prochain);
    }
  }
  return ordre;
}

/** Calcule les lignes à formule. Une ligne citée absente ou une base négative bloque la déclaration. */
export function calculerFormules(table: TableFormulaire, cases: readonly CaseDeclaration[]): ResultatFormules {
  const formules = new Map<string, Expression>();
  for (const l of table.lignes) if (l.formule !== undefined) formules.set(l.code, analyser(l.formule, l.code));

  const parCode = new Map<string, CaseDeclaration>(cases.map((x) => [x.code, x]));
  const connus = new Set(table.lignes.map((l: LigneFormulaire) => l.code));
  for (const l of table.lignes) {
    const absente = [l.code, ...citees(formules.get(l.code) ?? [])].find((x) => !connus.has(x) || !parCode.has(x));
    if (absente !== undefined) return { bloque: true, code: 'ligne_absente', ligne: absente };
  }

  const calculees = new Map<string, CaseDeclaration>();
  const valeur = (code: string): CaseDeclaration => calculees.get(code) ?? parCode.get(code)!;
  const somme = (e: Expression, sources: SourceCase[]): Centimes => {
    let total = centimes(0);
    for (const { signe, terme } of e) {
      let m: Centimes;
      if ('code' in terme) {
        const v = valeur(terme.code);
        sources.push(...v.sources);
        m = v.montant;
      } else m = centimes(Math.max(0, somme(terme.plancher, sources)));
      total = signe === 1 ? ajouter(total, m) : soustraire(total, m);
    }
    return total;
  };

  for (const code of ordonner(formules)) {
    const sources: SourceCase[] = [];
    const montant = somme(formules.get(code)!, sources);
    const uniques = sources
      .sort(comparerSources)
      .filter((s, i, tous) => i === 0 || comparerSources(tous[i - 1]!, s) !== 0);
    calculees.set(code, { code, montant, sources: uniques, aCalculer: false });
  }

  for (const l of table.lignes) {
    const m = valeur(l.code).montant;
    if (l.base === true && m < 0) return { bloque: true, code: 'base_negative', ligne: l.code, montant: m };
  }
  return { bloque: false, cases: cases.map((x) => calculees.get(x.code) ?? x) };
}
