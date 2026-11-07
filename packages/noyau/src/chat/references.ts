// Références de chiffres {{ref:appel.champ}} : le serveur remplace chaque référence, même coupée dans le flux.
// Aucun texte affiché ici : le segment « inconnu » porte le « je ne sais pas » (texte ailleurs).

export const NATURES = ['montant', 'date', 'compte', 'taux', 'nombre'] as const;
export type Nature = (typeof NATURES)[number];
export type Source = { type: string; id: string };
export type ResultatChamp = { valeur: string | number; nature: Nature; source: Source };
export type Resultats = Record<string, Record<string, ResultatChamp>>;
export type Segment =
  | { sorte: 'texte'; texte: string }
  | { sorte: 'valeur'; valeur: string | number; nature: Nature; source: Source }
  | { sorte: 'inconnu' };

const BALISE = /\{\{([^{}]*)\}\}/g;
const REFERENCE = /^ref:([a-z0-9_]+)\.([a-z0-9_]+)$/;
const OUVERTURE = '{{';
const FERMETURE = '}}';
const DEBUT_REFERENCE = '{{ref:';
const INCONNU: Segment = { sorte: 'inconnu' };

function lire(resultats: Resultats, appel: string, champ: string): Segment {
  if (!Object.hasOwn(resultats, appel)) return INCONNU;
  const champs = resultats[appel] ?? {};
  if (!Object.hasOwn(champs, champ)) return INCONNU;
  const r = champs[champ] as Partial<ResultatChamp> | undefined;
  const valeurOk = typeof r?.valeur === 'string' || (typeof r?.valeur === 'number' && Number.isFinite(r.valeur));
  const natureOk = (NATURES as readonly unknown[]).includes(r?.nature);
  const s = r?.source;
  const sourceOk = typeof s?.type === 'string' && typeof s.id === 'string';
  if (!valeurOk || !natureOk || !sourceOk) return INCONNU;
  return { sorte: 'valeur', valeur: r.valeur as string | number, nature: r.nature as Nature, source: s };
}

function texte(t: string): Segment[] {
  return t === '' ? [] : [{ sorte: 'texte', texte: t }];
}

function ajouter(segments: Segment[], nouveaux: Segment[]): void {
  for (const s of nouveaux) {
    const dernier = segments[segments.length - 1];
    if (dernier?.sorte === 'texte' && s.sorte === 'texte') segments[segments.length - 1] = { sorte: 'texte', texte: dernier.texte + s.texte };
    else segments.push(s);
  }
}

export function resoudre(entree: string, resultats: Resultats): Segment[] {
  const segments: Segment[] = [];
  let curseur = 0;
  for (const m of entree.matchAll(BALISE)) {
    ajouter(segments, texte(entree.slice(curseur, m.index)));
    const ref = REFERENCE.exec(m[1] ?? '');
    ajouter(segments, ref ? [lire(resultats, ref[1] ?? '', ref[2] ?? '')] : texte(m[1] ?? ''));
    curseur = m.index + m[0].length;
  }
  ajouter(segments, texte(entree.slice(curseur)));
  return segments;
}

/** Début de la fin à retenir : accolade seule finale, ou « {{ » jamais refermée. */
function pointDeCoupe(tampon: string): number {
  const ouverte = tampon.lastIndexOf(OUVERTURE);
  if (ouverte >= 0 && tampon.indexOf(FERMETURE, ouverte + OUVERTURE.length) < 0) return ouverte;
  return tampon.endsWith('{') ? tampon.length - 1 : tampon.length;
}

export class TamponReferences {
  private reste = '';
  constructor(private readonly resultats: Resultats) {}

  pousser(morceau: string): Segment[] {
    const tampon = this.reste + morceau;
    const coupe = pointDeCoupe(tampon);
    this.reste = tampon.slice(coupe);
    return resoudre(tampon.slice(0, coupe), this.resultats);
  }

  terminer(): Segment[] {
    const reste = this.reste;
    this.reste = '';
    return reste.startsWith(DEBUT_REFERENCE) ? [INCONNU] : texte(reste);
  }
}
