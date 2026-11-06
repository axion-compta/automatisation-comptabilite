// L00-T09 : tests des scripts de pilotage (demarrer, avancement, alerte).
import { describe, it, expect } from 'vitest';
import { demarrer, CODE_ARRET } from './demarrer.mjs';
import { avancement, lireStatut, resume } from './avancement.mjs';
import { alertesEchecs, alerteFusion, estSensible } from './alerte.mjs';

const gitFaux = (arret, fetch = 0) => (args) => ({ status: args[0] === 'fetch' ? fetch : arret ? 0 : 128 });

describe('L00-T09 demarrer', () => {
  it('ARRET présent = code 3', () => {
    expect(demarrer(gitFaux(true))).toBe(CODE_ARRET);
    expect(CODE_ARRET).toBe(3);
  });
  it('ARRET absent = code 0 (cas rouge : ne s’arrête pas à tort)', () => {
    expect(demarrer(gitFaux(false))).toBe(0);
  });
  it('fetch en échec = code 1, jamais 0', () => {
    expect(demarrer(gitFaux(false, 1))).toBe(1);
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
  it('lit id et statut, rejette une fiche sans statut', () => {
    expect(lireStatut('---\nid: L00-T09\nstatut: fait\n---')).toEqual({ id: 'L00-T09', statut: 'fait' });
    expect(lireStatut('---\nid: L00-T09\n---')).toBeNull();
  });
  it('résumé lisible', () => {
    expect(resume(avancement(fiches))).toBe('Avancement : 1/3 fiches faites\nLot 00 : 1/2\nLot 01 : 0/1');
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
  it('chemins sensibles reconnus, autres non', () => {
    for (const c of ['.github/workflows/ci.yml', 'pnpm-lock.yaml', 'outils/gardes/tests.mjs', 'pilotage/ARRET', 'scripts/pilotage/alerte.mjs']) {
      expect(estSensible(c)).toBe(true);
    }
    for (const c of ['packages/noyau/src/a.ts', 'docs/x.md', 'scripts/autre.mjs']) expect(estSensible(c)).toBe(false);
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
});
