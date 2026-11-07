// Lecteur XML minimal et sûr pour CAMT.053 et OFX 2. Tout `<!DOCTYPE` et tout `<!ENTITY` sont refusés : pas d'entité
// externe ni d'expansion possible, sans dépendance. Lecture caractère par caractère, itérative (pas de récursion).
// Aucun extrait du texte dans les messages d'erreur. `texte` d'un nœud = son texte direct, sans espaces de bord.

export interface NoeudXml {
  nom: string;
  attributs: Record<string, string>;
  enfants: NoeudXml[];
  texte: string;
}

export interface LimitesXml {
  profondeurMax: number;
  noeudsMax: number;
}

type CodeErreurXml = 'doctype_refuse' | 'entite_inconnue' | 'xml_invalide' | 'trop_profond' | 'trop_de_noeuds' | 'limites_invalides';

export class ErreurXml extends Error {
  override name = 'ErreurXml';
  readonly code: CodeErreurXml;
  constructor(code: CodeErreurXml) {
    super(code);
    this.code = code;
  }
}

const PREDEFINIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const NOM = /^[A-Za-z_][A-Za-z0-9_.:-]*$/;
const estEspace = (c: string): boolean => c === ' ' || c === '\t' || c === '\n' || c === '\r';

function entite(nom: string): string {
  if (Object.hasOwn(PREDEFINIES, nom)) return PREDEFINIES[nom] ?? '';
  const hexa = nom.startsWith('#x');
  const chiffres = nom.slice(hexa ? 2 : 1);
  if (nom.startsWith('#') && (hexa ? /^[0-9A-Fa-f]{1,6}$/ : /^[0-9]{1,7}$/).test(chiffres)) {
    const cp = Number.parseInt(chiffres, hexa ? 16 : 10);
    const permis = cp >= 0x20 || cp === 9 || cp === 10 || cp === 13;
    if (permis && cp <= 0x10ffff && (cp < 0xd800 || cp > 0xdfff) && cp !== 0xfffe && cp !== 0xffff) {
      return String.fromCodePoint(cp);
    }
  }
  throw new ErreurXml('entite_inconnue');
}

function decoderEntites(s: string): string {
  let sortie = '';
  let i = 0;
  while (i < s.length) {
    const esperluette = s.indexOf('&', i);
    if (esperluette < 0) return sortie + s.slice(i);
    const fin = s.indexOf(';', esperluette);
    if (fin < 0) throw new ErreurXml('entite_inconnue');
    sortie += s.slice(i, esperluette) + entite(s.slice(esperluette + 1, fin));
    i = fin + 1;
  }
  return sortie;
}

export function lireXml(texte: string, limites: LimitesXml): NoeudXml {
  if (![limites.profondeurMax, limites.noeudsMax].every((v) => Number.isSafeInteger(v) && v > 0)) {
    throw new ErreurXml('limites_invalides');
  }
  if (/<!(DOCTYPE|ENTITY)/i.test(texte)) throw new ErreurXml('doctype_refuse');
  const src = texte.startsWith('﻿') ? texte.slice(1) : texte;
  const invalide = (): ErreurXml => new ErreurXml('xml_invalide');
  const apres = (motif: string, depuis: number): number => {
    const p = src.indexOf(motif, depuis);
    if (p < 0) throw invalide();
    return p;
  };
  const pile: { noeud: NoeudXml; qual: string }[] = [];
  let racine: NoeudXml | undefined;
  let noeuds = 0;
  let i = 0;

  const ouvrir = (debut: number): number => {
    let j = debut + 1;
    while (j < src.length && !estEspace(src.charAt(j)) && src.charAt(j) !== '/' && src.charAt(j) !== '>') j += 1;
    const qual = src.slice(debut + 1, j);
    const nom = qual.slice(qual.lastIndexOf(':') + 1);
    if (!NOM.test(qual) || nom === '') throw invalide();
    const attributs: Record<string, string> = Object.create(null) as Record<string, string>;
    let autoFermante = false;
    for (;;) {
      while (estEspace(src.charAt(j))) j += 1;
      const c = src.charAt(j);
      if (c === '>' || (c === '/' && src.charAt(j + 1) === '>')) {
        autoFermante = c === '/';
        j += autoFermante ? 2 : 1;
        break;
      }
      const k = j;
      while (j < src.length && !estEspace(src.charAt(j)) && !['=', '>', '/'].includes(src.charAt(j))) j += 1;
      const an = src.slice(k, j);
      while (estEspace(src.charAt(j))) j += 1;
      const guillemet = src.charAt(j + 1) === '"' || src.charAt(j + 1) === "'" ? src.charAt(j + 1) : '';
      if (!NOM.test(an) || src.charAt(j) !== '=' || guillemet === '' || an in attributs) throw invalide();
      const fin = apres(guillemet, j + 2);
      const valeur = src.slice(j + 2, fin);
      if (valeur.includes('<')) throw invalide();
      attributs[an] = decoderEntites(valeur);
      j = fin + 1;
    }
    noeuds += 1;
    if (noeuds > limites.noeudsMax) throw new ErreurXml('trop_de_noeuds');
    if (pile.length + 1 > limites.profondeurMax) throw new ErreurXml('trop_profond');
    const noeud: NoeudXml = { nom, attributs, enfants: [], texte: '' };
    const parent = pile[pile.length - 1];
    if (parent !== undefined) parent.noeud.enfants.push(noeud);
    else if (racine === undefined) racine = noeud;
    else throw invalide();
    if (!autoFermante) pile.push({ noeud, qual });
    return j;
  };

  while (i < src.length) {
    const haut = pile[pile.length - 1];
    if (src.charAt(i) !== '<') {
      const f = src.indexOf('<', i) < 0 ? src.length : src.indexOf('<', i);
      if (haut !== undefined) haut.noeud.texte += decoderEntites(src.slice(i, f));
      else if (src.slice(i, f).trim() !== '') throw invalide();
      i = f;
    } else if (src.startsWith('<!--', i)) i = apres('-->', i + 4) + 3;
    else if (src.startsWith('<![CDATA[', i)) {
      if (haut === undefined) throw invalide();
      const f = apres(']]>', i + 9);
      haut.noeud.texte += src.slice(i + 9, f);
      i = f + 3;
    } else if (src.startsWith('<?', i)) i = apres('?>', i + 2) + 2;
    else if (src.startsWith('<!', i)) throw invalide();
    else if (src.startsWith('</', i)) {
      const f = apres('>', i + 2);
      const ferme = pile.pop();
      if (ferme === undefined || ferme.qual !== src.slice(i + 2, f).trim()) throw invalide();
      ferme.noeud.texte = ferme.noeud.texte.trim();
      i = f + 1;
    } else i = ouvrir(i);
  }
  if (pile.length > 0 || racine === undefined) throw invalide();
  return racine;
}

/** Premier nœud (ordre du document) atteint en suivant les noms de `chemin` parmi les enfants à chaque niveau. */
export function trouver(noeud: NoeudXml, chemin: string[]): NoeudXml | undefined {
  let niveau = [noeud];
  for (const nom of chemin) {
    niveau = niveau.flatMap((n) => n.enfants.filter((e) => e.nom === nom));
  }
  return niveau[0];
}

/** Descendants (hors le nœud lui-même) portant ce nom, en profondeur, dans l'ordre du document. */
export function trouverTous(noeud: NoeudXml, nom: string): NoeudXml[] {
  const resultat: NoeudXml[] = [];
  const pile = [...noeud.enfants].reverse();
  for (let x = pile.pop(); x !== undefined; x = pile.pop()) {
    if (x.nom === nom) resultat.push(x);
    for (let k = x.enfants.length - 1; k >= 0; k -= 1) pile.push(x.enfants[k] as NoeudXml);
  }
  return resultat;
}
