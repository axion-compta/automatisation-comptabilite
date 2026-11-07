type Genre = 'IBAN' | 'CARTE' | 'PERSONNE';

// Même longueur que le texte : minuscules sans accents, pour repérer puis découper l'original.
const plier = (s: string): string =>
  Array.from({ length: s.length }, (_, i) => {
    const d = s[i]!.normalize('NFD')[0]!;
    const l = d.toLowerCase();
    return l.length === 1 ? l : d;
  }).join('');
const mots = (s: string): string[] => plier(s).split(/\s+/).filter((m) => m !== '');
const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE_JETON = /(\\*)(\[(?:IBAN|CARTE|PERSONNE)_\d+\])/g;
const IBAN_COMPACT = '(?<![a-z0-9])[a-z]{2}\\d{2}[a-z0-9]{11,30}';
const IBAN_ESPACES = '(?<![a-z0-9])[a-z]{2}\\d{2}\\s[a-z0-9]{4}(?:\\s(?=[a-z0-9]*\\d)[a-z0-9]{4}){2,6}(?:\\s\\d{1,3})?(?![a-z0-9])';
const BORNE = (s: string) => `(?<![\\p{L}\\p{N}])(?:${s})(?![\\p{L}\\p{N}])`;

function canon(genre: string, original: string): string {
  if (genre === 'IBAN') return original.replace(/\s/g, '').toLowerCase();
  return genre === 'CARTE' ? original.toLowerCase() : mots(original).sort().join(' ');
}

export function pseudonymiser(
  textes: readonly string[],
  personnes: readonly string[],
  tableExistante?: Map<string, string>,
): { textes: string[]; table: Map<string, string> } {
  const table = new Map(tableExistante);
  const index = new Map<string, string>();
  const compteurs: Record<string, number> = { IBAN: 0, CARTE: 0, PERSONNE: 0 };
  for (const [jeton, original] of table) {
    const m = /^\[(IBAN|CARTE|PERSONNE)_(\d+)\]$/.exec(jeton);
    if (!m) continue;
    index.set(`${m[1]}|${canon(m[1]!, original)}`, jeton);
    compteurs[m[1]!] = Math.max(compteurs[m[1]!]!, Number(m[2]));
  }
  const alternatives = new Set<string>();
  for (const p of personnes) {
    const w = mots(p);
    if (w.length === 0) continue;
    alternatives.add(w.map(echapper).join('\\s+'));
    alternatives.add([...w].reverse().map(echapper).join('\\s+'));
  }
  const pers = [...alternatives].sort((a, b) => b.length - a.length).join('|');
  const re = new RegExp(
    `(?<IBAN>${IBAN_COMPACT}|${IBAN_ESPACES})|(?<CARTE>[0-9x]{12,}|(?<![0-9x])[0-9x]{4}(?:\\s[0-9x]{4}){2,3}(?:\\s[0-9]{1,3})?(?![0-9x]))` + (pers ? `|(?<PERSONNE>${BORNE(pers)})` : ''),
    'gu',
  );
  const jetonDe = (genre: Genre, original: string): string => {
    const cle = `${genre}|${canon(genre, original)}`;
    let jeton = index.get(cle);
    if (jeton === undefined) {
      compteurs[genre] = compteurs[genre]! + 1;
      jeton = `[${genre}_${compteurs[genre]}]`;
      index.set(cle, jeton);
      table.set(jeton, original);
    }
    return jeton;
  };
  const sortie = textes.map((brut) => {
    const t = brut.replace(RE_JETON, '\\$&');
    let res = '';
    let pos = 0;
    for (const m of plier(t).matchAll(re)) {
      const genre = (['IBAN', 'CARTE', 'PERSONNE'] as const).find((g) => m.groups?.[g] !== undefined)!;
      res += t.slice(pos, m.index) + jetonDe(genre, t.slice(m.index, m.index + m[0].length));
      pos = m.index + m[0].length;
    }
    return res + t.slice(pos);
  });
  return { textes: sortie, table };
}

export function retablir(texte: string, table: Map<string, string>): string {
  return texte.replace(RE_JETON, (_x, barres: string, jeton: string) =>
    barres === '' ? (table.get(jeton) ?? jeton) : barres.slice(1) + jeton,
  );
}
