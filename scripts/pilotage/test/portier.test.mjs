import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHEMINS_SENSIBLES, decider, estSensible, ligneCalibrage } from '../portier.mjs';

const SHA = 'a'.repeat(40);
const ANCIEN = 'b'.repeat(40);
const RELECTEUR = 'relecteur-fictif';
const OPTIONS = { relecteurs: [RELECTEUR] };
const FICHE = '---\nid: L01-T02\nstatut: a_faire\nsensible: non\ntests_requis: oui\n---\nCorps\n';

// PR de référence : tout est vert. Chaque test en dégrade UNE seule chose.
function prVerte(modif = {}) {
  return {
    arret: false, etat: 'OPEN', brouillon: false, base: 'main', fork: false, branche: 'lot-01/L01-T02',
    headRefOid: SHA, auteur: 'auteur-fictif', etiquettes: ['relu'], verifier: 'SUCCESS', aJour: true,
    fichiers: [
      { chemin: 'apps/web/src/a.ts', additions: 40, suppressions: 5, etat: 'modified' },
      { chemin: 'apps/web/src/__tests__/a.test.ts', additions: 60, suppressions: 0, etat: 'added' },
      { chemin: 'pilotage/fiches/L01-T02.md', additions: 1, suppressions: 1, etat: 'modified' },
      { chemin: 'pilotage/journal/L01-T02.md', additions: 6, suppressions: 0, etat: 'added' },
    ],
    diffDependances: false,
    fiche: { id: 'L01-T02', sensible: 'non', tests_requis: 'oui' },
    ficheBase: FICHE, ficheTete: FICHE.replace('statut: a_faire', 'statut: fait'),
    commentaires: [{ auteur: RELECTEUR, corps: `Relu.\nVERDICT: OK\n${SHA}`, date: '2026-11-06T10:00:00Z' }],
    evenements: [{ evenement: 'labeled', etiquette: 'relu', acteur: RELECTEUR, date: '2026-11-06T10:01:00Z' }],
    ...modif,
  };
}
const refuse = (pr, motif, options = OPTIONS) => {
  const d = decider(pr, options);
  expect(d.fusionner).toBe(false);
  expect(d.raisons.join(' | ')).toContain(motif);
};

describe('portier : décision', () => {
  it('fusionne-tout-vert', () => {
    expect(decider(prVerte(), OPTIONS)).toEqual({ fusionner: true, raisons: [] });
  });
  it('refuse-verifier-rouge', () => {
    refuse(prVerte({ verifier: 'FAILURE' }), 'verifier');
  });
  it('refuse-branche-pas-a-jour', () => {
    refuse(prVerte({ aJour: false }), 'pas à jour');
  });
  it('refuse-sans-tests', () => {
    const fichiers = prVerte().fichiers.filter((f) => !f.chemin.includes('test'));
    refuse(prVerte({ fichiers }), 'tests requis');
  });
  it('refuse-plus-de-400-lignes', () => {
    const fichiers = [...prVerte().fichiers, { chemin: 'apps/web/src/b.ts', additions: 400, suppressions: 0, etat: 'added' }];
    refuse(prVerte({ fichiers }), '400 lignes');
    const limite = [...prVerte().fichiers, { chemin: 'apps/web/src/b.ts', additions: 300, suppressions: 0, etat: 'added' }];
    refuse(prVerte({ fichiers: limite }), '400 lignes'); // 112 + 300 = 412
    expect(decider(prVerte({ fichiers: [...prVerte().fichiers, { chemin: 'apps/web/src/b.ts', additions: 200, suppressions: 0, etat: 'added' }] }), OPTIONS).fusionner).toBe(true);
    refuse(prVerte({ fichiers: [{ chemin: 'apps/x.test.ts', additions: 'beaucoup', suppressions: 0 }] }), '400 lignes');
  });
  it('refuse-dependance-ajoutee', () => {
    refuse(prVerte({ diffDependances: true }), 'dépendance');
    refuse(prVerte({ diffDependances: undefined }), 'dépendance');
    const fichiers = [...prVerte().fichiers, { chemin: 'packages/x/package.json', additions: 1, suppressions: 0 }];
    refuse(prVerte({ fichiers }), 'dépendance');
  });
  it('refuse-chemin-sensible', () => {
    for (const chemin of ['.github/workflows/ci.yml', '.GitHub/x', 'scripts/verifier.mjs', 'outils/gardes/a.mjs', 'scripts/pilotage/portier.mjs', 'pilotage/LISEZMOI.md', 'pilotage/fiches/L09-T09.md', 'pilotage/journal/L09-T09.md', 'x/../pilotage/ARRET', 'sous/dossier/LICENSE', 'pnpm-lock.yaml']) {
      const fichiers = [...prVerte().fichiers, { chemin, additions: 1, suppressions: 0 }];
      refuse(prVerte({ fichiers }), 'chemin sensible');
    }
    const renomme = [...prVerte().fichiers, { chemin: 'apps/z.ts', ancien: '.github/CODEOWNERS', additions: 0, suppressions: 0 }];
    refuse(prVerte({ fichiers: renomme }), 'chemin sensible');
    expect(estSensible('apps/web/src/a.ts')).toBe(false);
  });
  it('refuse-fiche-sensible', () => {
    refuse(prVerte({ fiche: { id: 'L01-T02', sensible: 'oui', tests_requis: 'oui' } }), 'fiche sensible');
    refuse(prVerte({ fiche: { id: 'L01-T02', tests_requis: 'oui' } }), 'fiche sensible');
    refuse(prVerte({ fiche: undefined }), 'fiche');
  });
  it('refuse-fiche-modifiee-hors-statut', () => {
    refuse(prVerte({ ficheTete: FICHE.replace('statut: a_faire', 'statut: fait').replace('Corps', 'Autre corps') }), 'fiche modifiée');
    refuse(prVerte({ ficheTete: FICHE.replace('sensible: non', 'sensible: oui') }), 'fiche modifiée');
    refuse(prVerte({ ficheTete: undefined }), 'fiche modifiée');
  });
  it('refuse-sans-verdict-ok', () => {
    refuse(prVerte({ commentaires: [] }), 'aucun verdict');
    refuse(prVerte({ commentaires: [{ auteur: RELECTEUR, corps: `verdict: ok ${SHA}`, date: '2026-11-06T10:00:00Z' }] }), 'aucun verdict');
    refuse(prVerte({ commentaires: [{ auteur: RELECTEUR, corps: `> VERDICT: OK ${SHA}`, date: '2026-11-06T10:00:00Z' }] }), 'aucun verdict');
  });
  it('refuse-sans-etiquette-relu', () => {
    refuse(prVerte({ etiquettes: [] }), 'relu');
    refuse(prVerte({ evenements: [] }), 'relu');
    refuse(prVerte({ evenements: [...prVerte().evenements, { evenement: 'unlabeled', etiquette: 'relu', acteur: RELECTEUR, date: '2026-11-06T10:05:00Z' }] }), 'relu');
  });
  it('refuse-arret-present', () => {
    refuse(prVerte({ arret: true }), 'ARRET');
    refuse(prVerte({ arret: undefined }), 'ARRET');
  });
  it('refuse-etiquette-bloque', () => {
    refuse(prVerte({ etiquettes: ['relu', 'bloque'] }), 'étiquette interdite : bloque');
  });
  it('refuse-etiquette-a-corriger', () => {
    refuse(prVerte({ etiquettes: ['relu', 'a-corriger'] }), 'étiquette interdite : a-corriger');
  });
  it('refuse-etiquette-sensible-a-fusionner', () => {
    refuse(prVerte({ etiquettes: ['relu', 'sensible-a-fusionner'] }), 'étiquette interdite : sensible-a-fusionner');
  });
  it('refuse-verdict-autre-auteur', () => {
    const corps = `VERDICT: OK\n${SHA}`;
    const date = '2026-11-06T10:00:00Z';
    refuse(prVerte({ commentaires: [{ auteur: 'auteur-fictif', corps, date }] }), 'aucun verdict', { relecteurs: ['auteur-fictif'] });
    refuse(prVerte({ commentaires: [{ auteur: 'inconnu-fictif', corps, date }] }), 'aucun verdict');
    refuse(prVerte({ commentaires: [{ auteur: 'Auteur-Fictif', corps, date }] }), 'aucun verdict', { relecteurs: ['auteur-fictif'] });
  });
  it('refuse-verdict-avant-dernier-commit', () => {
    refuse(prVerte({ commentaires: [{ auteur: RELECTEUR, corps: `VERDICT: OK\n${ANCIEN}`, date: '2026-11-06T10:00:00Z' }] }), 'headRefOid actuel');
    refuse(prVerte({ commentaires: [{ auteur: RELECTEUR, corps: 'VERDICT: OK', date: '2026-11-06T10:00:00Z' }] }), 'headRefOid actuel');
    refuse(prVerte({ headRefOid: 'abc' }), 'headRefOid invalide');
  });
  it('refuse-verdict-ok-puis-a-corriger', () => {
    const commentaires = [
      { auteur: RELECTEUR, corps: `VERDICT: OK\n${SHA}`, date: '2026-11-06T10:00:00Z' },
      { auteur: RELECTEUR, corps: `VERDICT: A CORRIGER\n${SHA}`, date: '2026-11-06T11:00:00Z' },
    ];
    refuse(prVerte({ commentaires }), 'dernier verdict');
    // A CORRIGER puis OK plus récent : accepté
    const inverse = [
      { auteur: RELECTEUR, corps: `VERDICT: A CORRIGER\n${ANCIEN}`, date: '2026-11-06T09:00:00Z' },
      commentaires[0],
    ];
    expect(decider(prVerte({ commentaires: inverse }), OPTIONS).fusionner).toBe(true);
  });
  it('refuse-sans-identite-relecteur', () => {
    refuse(prVerte(), 'identité du relecteur', {});
    refuse(prVerte(), 'identité du relecteur', { relecteurs: ['A_RENSEIGNER_PAR_WILL'] });
    refuse(prVerte(), 'identité du relecteur', { relecteurs: [] });
  });
  it('refuse-etiquette-relu-par-auteur', () => {
    const evenements = [{ evenement: 'labeled', etiquette: 'relu', acteur: 'auteur-fictif', date: '2026-11-06T10:01:00Z' }];
    refuse(prVerte({ evenements }), 'relu');
    refuse(prVerte({ evenements: [{ ...evenements[0], acteur: 'tiers-fictif' }] }), 'relu');
  });
  it('refuse-fork', () => {
    refuse(prVerte({ fork: true }), 'fork');
    refuse(prVerte({ fork: undefined }), 'fork');
  });
  it('refuse-branche-hors-forme', () => {
    for (const branche of ['main', 'lot-1/L01-T02', 'lot-01/L01-T02-bis', 'lot-01/L02-T02', 'x/lot-01/L01-T02', 'lot-01/L01-T02\n']) {
      refuse(prVerte({ branche }), 'branche hors forme');
    }
  });
  it('chemins-sensibles-egaux-a-lisezmoi', () => {
    const texte = readFileSync(new URL('../../../pilotage/LISEZMOI.md', import.meta.url), 'utf8');
    const section = texte.split(/^## Fusion\s*$/m)[1].split(/^## /m)[0];
    const phrase = section.split('sont fusionnées par Will seul')[0];
    const attendus = [...phrase.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((x) => x !== 'sensible: oui');
    expect(attendus.length).toBeGreaterThan(10);
    expect([...CHEMINS_SENSIBLES].sort()).toEqual([...attendus].sort());
  });
});

describe('portier : ligne de calibrage', () => {
  it('une ligne à 6 colonnes sans point-virgule dans les raisons', () => {
    const l = ligneCalibrage({ date: '2026-11-06T10:00:00Z', pr: '7', fiche: 'L01-T02', fusionner: false, raisons: ['a;b', 'c\nd'], minutes: 3 });
    expect(l.split(';')).toHaveLength(6);
    expect(l).toBe('2026-11-06T10:00:00Z;7;L01-T02;refus;a b | c d;3');
  });
});
