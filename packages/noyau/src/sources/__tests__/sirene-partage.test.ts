import { describe, expect, it } from 'vitest';
import { respecteLeQuota } from '../sirene-planif.js';
import { ErreurPartage, preparerFile, router, sirenValide, siretValide, tourDeRole } from '../sirene-partage.js';

// Valeurs de test inventées : 30 envois par fenêtre de 60 s, un envoi toutes les 2 s, lots de 20.
const o = { quotaParFenetre: 30, fenetreMs: 60000, intervalleMinMs: 2000, tailleLot: 20 };

function luhn(base: string): string {
  let somme = 0;
  for (let i = 0; i < base.length; i++) {
    let c = Number(base[base.length - 1 - i]);
    if (i % 2 === 0) {
      c *= 2;
      if (c > 9) c -= 9;
    }
    somme += c;
  }
  return base + String((10 - (somme % 10)) % 10);
}
const sirens = (depart: number, n: number): string[] => Array.from({ length: n }, (_v, k) => luhn(String(depart + k)));
const file = (nom: string, numeros: string[]) => numeros.map((numero) => ({ file: nom, numero }));
function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurPartage) return e.code;
    throw e;
  }
  return undefined;
}

const demandes = [...file('A', sirens(10000000, 500)), ...file('B', sirens(20000000, 500))];
const plan = tourDeRole(preparerFile(demandes), 0, o);

describe('sirene-partage', () => {
  it('deux-clients-cinquante-requetes', () => {
    expect(plan).toHaveLength(50);
    expect(plan.filter((p) => p.file === 'A')).toHaveLength(25);
    expect(plan.filter((p) => p.file === 'B')).toHaveLength(25);
    expect(plan.every((p) => p.lot.length === 20)).toBe(true);
    expect(plan.filter((p) => p.file === 'A').flatMap((p) => p.lot)).toEqual(demandes.slice(0, 500).map((d) => d.numero));
    expect(plan.map((p) => p.file).slice(0, 4)).toEqual(['A', 'B', 'A', 'B']);
    // une seule file, une file vide ou absente parmi d'autres, ordre des files = première apparition
    expect(tourDeRole(file('A', sirens(10000000, 45)), 0, o).map((p) => p.lot.length)).toEqual([20, 20, 5]);
    expect(tourDeRole([], 0, o)).toEqual([]);
    for (const mauvais of [0, -1, 1.5, Number.NaN]) {
      expect(() => tourDeRole(file('A', sirens(10000000, 3)), 0, { ...o, tailleLot: mauvais })).toThrow();
    }
    const ordre = tourDeRole([...file('B', sirens(1000000, 2)), ...file('A', sirens(2000000, 2)), ...file('B', sirens(3000000, 40))], 0, o);
    expect(ordre.map((p) => p.file)).toEqual(['B', 'A', 'B', 'B']);
    expect(ordre.map((p) => p.lot.length)).toEqual([20, 2, 20, 2]);
  });

  it('ecart-au-plus-une-requete-a-tout-instant', () => {
    const compte = { A: 0, B: 0 };
    for (const p of plan) {
      compte[p.file as 'A' | 'B']++;
      expect(Math.abs(compte.A - compte.B)).toBeLessThanOrEqual(1);
    }
    // client plus gros : l'écart reste borné tant que les deux ont des lots à servir
    const inegal = tourDeRole([...file('A', sirens(10000000, 100)), ...file('B', sirens(20000000, 60))], 0, o);
    expect(inegal.slice(0, 6).map((p) => p.file)).toEqual(['A', 'B', 'A', 'B', 'A', 'B']);
    expect(inegal.map((p) => p.file).slice(6)).toEqual(['A', 'A']);
  });

  it('quota-respecte-sur-toute-fenetre', () => {
    const instants = plan.map((p) => p.a);
    expect(respecteLeQuota(instants, o)).toBe(true);
    for (const t of instants) {
      expect(instants.filter((x) => x > t - o.fenetreMs && x <= t).length).toBeLessThanOrEqual(o.quotaParFenetre);
    }
    for (let i = 1; i < instants.length; i++) expect(instants[i]! - instants[i - 1]!).toBeGreaterThanOrEqual(o.intervalleMinMs);
    expect(Math.max(...instants.slice(0, o.quotaParFenetre))).toBeLessThan(o.fenetreMs);
    expect(instants[o.quotaParFenetre]).toBeGreaterThanOrEqual(o.fenetreMs);
    expect(tourDeRole(file('A', sirens(10000000, 40)), 5000, o)[0]?.a).toBe(5000);
  });

  it('trois-minutes-au-plus', () => {
    const dernier = plan[plan.length - 1]!.a;
    expect(dernier).toBeLessThanOrEqual(3 * 60000);
    expect(dernier).toBeGreaterThan(0);
  });

  it('aucune-reponse-croisee', () => {
    const reponses = [
      { file: 'B', numero: 'n1', corps: { x: 1 } },
      { file: 'A', numero: 'n2', corps: { x: 2 } },
      { file: 'B', numero: 'n3', corps: { x: 3 } },
    ];
    const rendu = router(reponses, ['A', 'B', 'C']);
    expect([...rendu.keys()]).toEqual(['A', 'B', 'C']);
    expect(rendu.get('A')).toEqual([{ numero: 'n2', corps: { x: 2 } }]);
    expect(rendu.get('B')).toEqual([{ numero: 'n1', corps: { x: 1 } }, { numero: 'n3', corps: { x: 3 } }]);
    expect(rendu.get('C')).toEqual([]);
    expect(code(() => router([{ file: 'Z', numero: 'n', corps: 1 }], ['A', 'B']))).toBe('file_inconnue');
    expect(code(() => router([{ file: 'A', numero: 'n', corps: 1 }], []))).toBe('file_inconnue');
    expect(router([], ['A']).get('A')).toEqual([]);
    for (const p of plan) {
      const attendues = new Set(demandes.filter((d) => d.file === p.file).map((d) => d.numero));
      expect(p.lot.every((n) => attendues.has(n))).toBe(true);
    }
  });

  it('siren-invalide-refuse', () => {
    const bon = luhn('12345678');
    expect(sirenValide(bon)).toBe(true);
    const faux = bon.slice(0, 8) + String((Number(bon[8]) + 1) % 10);
    for (const s of [faux, '', ' ' + bon, bon + ' ', bon.slice(0, 8), bon + '0', 'abcdefghi', '12345678a', bon.replace('1', ' ')]) {
      expect(sirenValide(s)).toBe(false);
      expect(code(() => preparerFile([{ file: 'A', numero: s }]))).toBe('numero_invalide');
    }
    const siret = luhn('1234567890123');
    expect(siretValide(siret)).toBe(true);
    expect(siretValide(siret.slice(0, 13) + String((Number(siret[13]) + 1) % 10))).toBe(false);
    expect(siretValide(bon)).toBe(false);
    expect(sirenValide(siret)).toBe(false);
    expect(siretValide('')).toBe(false);
    expect(siretValide(siret + '0')).toBe(false);
    expect(preparerFile([{ file: 'A', numero: siret }])).toHaveLength(1);
    expect(preparerFile([])).toEqual([]);
    expect(code(() => preparerFile([{ file: 'A', numero: faux }]))).toBe('numero_invalide');
    expect(code(() => preparerFile([{ file: '', numero: bon }]))).toBe('file_invalide');
    expect(sirenValide(undefined as never)).toBe(false);
  });

  it('doublon-garde-entre-deux-clients', () => {
    const s = luhn('12345678');
    const t = luhn('87654321');
    const r = preparerFile([
      { file: 'A', numero: s },
      { file: 'B', numero: s },
      { file: 'A', numero: s },
      { file: 'A', numero: t },
      { file: 'B', numero: s },
    ]);
    expect(r).toEqual([
      { file: 'A', numero: s },
      { file: 'B', numero: s },
      { file: 'A', numero: t },
    ]);
  });
});
