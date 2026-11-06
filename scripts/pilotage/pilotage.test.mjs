// L00-T09 : tests des scripts de pilotage (demarrer, avancement, alerte).
import { describe, it, expect } from 'vitest';
import { demarrer, CODE_ARRET } from './demarrer.mjs';
import { avancement, lireStatut, resume } from './avancement.mjs';
import { alertesEchecs, alerteFusion, estSensible, SENSIBLES } from './alerte.mjs';

// options : arret (ARRET présent), fetch (code du fetch), ref (false = origin/main introuvable)
const gitFaux =
  ({ arret = false, fetch = 0, ref = true } = {}) =>
  (args) => {
    if (args[0] === 'fetch') return { status: fetch };
    if (args[0] === 'rev-parse') return { status: ref ? 0 : 1 };
    return { status: arret ? 0 : 128 };
  };

describe('L00-T09 demarrer', () => {
  it('ARRET présent = code 3', () => {
    expect(demarrer(gitFaux({ arret: true }))).toBe(CODE_ARRET);
    expect(CODE_ARRET).toBe(3);
  });
  it('ARRET absent = code 0 (cas rouge : ne s’arrête pas à tort)', () => {
    expect(demarrer(gitFaux())).toBe(0);
  });
  it('fetch en échec = code 1, jamais 0', () => {
    expect(demarrer(gitFaux({ fetch: 1 }))).toBe(1);
  });
  it('réf main introuvable = 1, même si cat-file réussirait', () => {
    expect(demarrer(gitFaux({ ref: false, arret: true }))).toBe(1);
    expect(demarrer(gitFaux({ ref: false }))).toBe(1);
  });
});

describe('L00-T09 avancement', () => {
  const fiches = [
    { id: 'L00-T01', statut: 'fait' },
    { id: 'L00-T02', statut: 'a_faire' },
    { id: 'L01-T01', statut: 'a_faire' },
  ];
  it('compte par lot et au total', () => {
    expect(avancement(fiches)).toEqual({
      total: 3,
      fait: 1,
      lots: { '00': { total: 2, fait: 1 }, '01': { total: 1, fait: 0 } },
    });
  });
  it('liste vide = zéro partout', () => {
    expect(avancement([])).toEqual({ total: 0, fait: 0, lots: {} });
  });
  it('lit le statut, id pris dans le nom du fichier', () => {
    expect(lireStatut('---\nid: L99-T99\nstatut: fait\n---', 'L00-T09.md')).toEqual({ id: 'L00-T09', statut: 'fait' });
  });
  it('rejette une fiche sans statut ou au nom de fichier invalide', () => {
    expect(lireStatut('---\nid: L00-T09\n---', 'L00-T09.md')).toBeNull();
    expect(lireStatut('---\nstatut: fait\n---', 'notes.md')).toBeNull();
  });
  it('accepte les guillemets', () => {
    expect(lireStatut('---\nstatut: "fait"\n---', 'L00-T01.md')?.statut).toBe('fait');
    expect(lireStatut("---\nstatut: 'a_faire'\n---", 'L00-T01.md')?.statut).toBe('a_faire');
  });
  it('accepte un commentaire de fin de ligne', () => {
    expect(lireStatut('---\nstatut: fait # revu\n---', 'L00-T01.md')?.statut).toBe('fait');
  });
  it('accepte les fins de ligne CRLF', () => {
    expect(lireStatut('---\r\nid: L00-T01\r\nstatut: fait\r\n---\r\n', 'L00-T01.md')?.statut).toBe('fait');
  });
  it('accepte une majuscule (Fait)', () => {
    expect(lireStatut('---\nstatut: Fait\n---', 'L00-T01.md')?.statut).toBe('fait');
  });
  it('ignore un statut écrit seulement dans le corps', () => {
    expect(lireStatut('---\nid: L00-T01\n---\n\nstatut: fait\n', 'L00-T01.md')).toBeNull();
  });
  it('résumé lisible, avec les fiches illisibles comptées', () => {
    expect(resume(avancement(fiches))).toBe('Avancement : 1/3 fiches faites\nLot 00 : 1/2\nLot 01 : 0/1');
    expect(resume(avancement(fiches), 2)).toContain('2 fiche(s) illisible(s)');
  });
});

describe('L00-T09 alerte', () => {
  it('3e échec ou bloquée = alerte ; echec-2 = rien', () => {
    const prs = [
      { numero: 4, labels: ['echec-3'] },
      { numero: 5, labels: ['bloque'] },
      { numero: 6, labels: ['echec-2'] },
    ];
    const msgs = alertesEchecs(prs);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toContain('#4');
    expect(msgs[1]).toContain('#5');
  });
  it('labels absents : pas d’exception', () => {
    expect(alertesEchecs([{ numero: 7 }])).toEqual([]);
  });

  // Un test par motif de SENSIBLES : un chemin qui le déclenche, un voisin qui ne le déclenche pas.
  const cas = [
    ['.github/workflows/ci.yml', '.githubx/a'],
    ['LICENSE', 'LICENSE.md'],
    ['scripts/verifier.mjs', 'scripts/verifier.txt'],
    ['.gitleaks.toml', 'gitleaks.toml'],
    ['eslint.config.js', 'eslint.config.json'],
    ['tsconfig.base.json', 'tsconfig.json'],
    ['CODEOWNERS', 'docs/CODEOWNERS.md'],
    ['.npmrc', 'npmrc'],
    ['pnpm-workspace.yaml', 'pnpm-workspace.yml'],
    ['pnpm-lock.yaml', 'pnpm-lock.json'],
    ['outils/gardes/tests.mjs', 'outils/autres/a.mjs'],
    ['scripts/pilotage/alerte.mjs', 'scripts/autre.mjs'],
    ['pilotage/ARRET', 'docs/pilotage/a.md'],
    ['.claude/agents/a.md', 'docs/.claude/a.md'],
    ['CLAUDE.md', 'docs/CLAUDE.md'],
    ['apps/web/package.json', 'apps/web/package.jsonc'],
  ];
  it('il y a un cas par motif', () => {
    expect(cas).toHaveLength(SENSIBLES.length);
  });
  for (const [i, [oui, non]] of cas.entries()) {
    it(`motif ${i + 1} : ${oui} sensible, ${non} non`, () => {
      expect(SENSIBLES[i].test(oui)).toBe(true);
      expect(estSensible(oui)).toBe(true);
      expect(SENSIBLES[i].test(non)).toBe(false);
    });
  }
  it('package.json à la racine est sensible', () => {
    expect(estSensible('package.json')).toBe(true);
    expect(estSensible('packages/noyau/src/a.ts')).toBe(false);
  });

  it('fusion sensible par un autre que Will = alerte', () => {
    const pr = { numero: 8, fusionnee: true, fusionnePar: 'relecteur-bot', fichiers: ['pilotage/ARRET'], labels: [] };
    expect(alerteFusion(pr)).toHaveLength(1);
    expect(alerteFusion({ ...pr, fichiers: ['docs/x.md'], labels: ['sensible-a-fusionner'] })).toHaveLength(1);
  });
  it('rien à signaler : fusion par Will, PR non fusionnée, PR non sensible', () => {
    const pr = { numero: 8, fusionnee: true, fusionnePar: 'will383842', fichiers: ['pilotage/ARRET'], labels: [] };
    expect(alerteFusion(pr)).toEqual([]);
    expect(alerteFusion({ ...pr, fusionnee: false, fusionnePar: 'bot' })).toEqual([]);
    expect(alerteFusion({ ...pr, fusionnePar: 'bot', fichiers: ['docs/x.md'] })).toEqual([]);
  });
  it('labels absents : pas d’exception', () => {
    const pr = { numero: 9, fusionnee: true, fusionnePar: 'bot', fichiers: ['docs/x.md'] };
    expect(alerteFusion(pr)).toEqual([]);
  });
  it('fichiers absents : PR considérée sensible, message clair', () => {
    const msgs = alerteFusion({ numero: 10, fusionnee: true, fusionnePar: 'bot' });
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain('liste des fichiers absente');
    expect(alerteFusion({ numero: 10, fusionnee: true, fusionnePar: 'will383842' })).toEqual([]);
  });
});
