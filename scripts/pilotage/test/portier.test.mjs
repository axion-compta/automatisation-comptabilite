import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHEMINS_SENSIBLES, arretPresent, decider, estAJour, estSensible, ligneCalibrage } from '../portier.mjs';

const SHA = 'a'.repeat(40);
const ANCIEN = 'b'.repeat(40);
const RELECTEUR = 'relecteur-fictif';
const OPTIONS = { relecteurs: [RELECTEUR] };
const FICHE = '---\nid: L01-T02\nstatut: a_faire\nsensible: non\ntests_requis: oui\n---\nCorps\n';
const T = '2026-11-06T10:00:00Z';
const com = (corps, extra = {}) => ({ auteur: RELECTEUR, corps, date: T, edite: false, ...extra });
const fic = (chemin, extra = {}) => ({ chemin, additions: 1, suppressions: 0, etat: 'added', ...extra });

// PR de référence : tout est vert. Chaque test en dégrade UNE seule chose.
function prVerte(modif = {}) {
  return {
    arret: false, etat: 'OPEN', brouillon: false, base: 'main', fork: false, branche: 'lot-01/L01-T02',
    headRefOid: SHA, auteur: 'auteur-fictif', etiquettes: ['relu'], verifier: 'SUCCESS', aJour: true,
    fichiers: [
      fic('apps/web/src/a.ts', { additions: 40, suppressions: 5, etat: 'modified' }),
      fic('apps/web/src/__tests__/a.test.ts', { additions: 60 }),
      fic('pilotage/fiches/L01-T02.md', { suppressions: 1, etat: 'modified' }),
      fic('pilotage/journal/L01-T02.md', { additions: 6 }),
    ],
    diffDependances: false, fiche: { id: 'L01-T02', sensible: 'non', tests_requis: 'oui' },
    ficheBase: FICHE, ficheTete: FICHE.replace('statut: a_faire', 'statut: fait'),
    commentaires: [com(`Relu.\nVERDICT: OK\n${SHA}`)],
    evenements: [{ evenement: 'labeled', etiquette: 'relu', acteur: RELECTEUR, date: '2026-11-06T10:01:00Z' }],
    ...modif,
  };
}
const refuse = (pr, motif, options = OPTIONS) => {
  const d = decider(pr, options);
  expect(d.fusionner).toBe(false);
  expect(d.raisons.join(' | ')).toContain(motif);
};
const avecFichier = (f) => ({ fichiers: [...prVerte().fichiers, f] });
const verdictSeul = (c) => ({ commentaires: [c] });
const fusionne = (modif, options = OPTIONS) => expect(decider(prVerte(modif), options).fusionner).toBe(true);

describe('portier : décision', () => {
  it('fusionne-tout-vert', () => {
    expect(decider(prVerte(), OPTIONS)).toEqual({ fusionner: true, raisons: [] });
  });
  it('refuse-verifier-rouge', () => refuse(prVerte({ verifier: 'FAILURE' }), 'verifier'));
  it('refuse-branche-pas-a-jour', () => refuse(prVerte({ aJour: false }), 'pas à jour'));
  it('refuse-sans-tests', () => {
    refuse(prVerte({ fichiers: prVerte().fichiers.filter((f) => !f.chemin.includes('test')) }), 'tests requis');
    for (const faux of ['docs/test/x.md', 'apps/test/data.json', 'apps/a.test.md']) { // seuls les fichiers .test/.spec comptent
      refuse(prVerte({ fichiers: [...prVerte().fichiers.filter((f) => !f.chemin.includes('test')), fic(faux)] }), 'tests requis');
    }
  });
  it('refuse-tests-requis-absent-ou-invalide', () => {
    for (const tests_requis of [undefined, '', 'Oui', 'peut-etre']) {
      refuse(prVerte({ fiche: { id: 'L01-T02', sensible: 'non', tests_requis }, fichiers: [prVerte().fichiers[0]] }), 'tests_requis');
    }
    fusionne({ fiche: { id: 'L01-T02', sensible: 'non', tests_requis: 'non' }, fichiers: [prVerte().fichiers[0]] });
  });
  it('refuse-plus-de-400-lignes', () => {
    refuse(prVerte(avecFichier(fic('apps/web/src/b.ts', { additions: 400 }))), '400 lignes');
    refuse(prVerte(avecFichier(fic('apps/web/src/b.ts', { additions: 300 }))), '400 lignes'); // 112 + 300
    fusionne(avecFichier(fic('apps/web/src/b.ts', { additions: 200 })));
    refuse(prVerte({ fichiers: [fic('apps/x.test.ts', { additions: 'beaucoup' })] }), '400 lignes');
  });
  it('refuse-dependance-ajoutee', () => {
    refuse(prVerte({ diffDependances: true }), 'dépendance');
    refuse(prVerte({ diffDependances: undefined }), 'dépendance');
    refuse(prVerte(avecFichier(fic('packages/x/package.json'))), 'dépendance');
  });
  it('refuse-chemin-sensible', () => {
    const sensibles = ['.github/workflows/ci.yml', '.GitHub/x', 'scripts/verifier.mjs', 'outils/gardes/a.mjs', 'scripts/pilotage/portier.mjs', 'pilotage/LISEZMOI.md',
      'pilotage/fiches/L09-T09.md', 'pilotage/journal/L09-T09.md', 'x/../pilotage/ARRET', 'sous/dossier/LICENSE', 'pnpm-lock.yaml',
      'CLAUDE.md', 'sous/CLAUDE.md', '.claude/settings.json', 'a/.claude/x.md', '.gitleaksignore', '.gitattributes',
      'vitest.config.ts', 'apps/web/vitest.config.mts', 'stryker.conf.json', 'stryker.config.mjs'];
    for (const chemin of sensibles) refuse(prVerte(avecFichier(fic(chemin))), 'chemin sensible');
    refuse(prVerte(avecFichier(fic('apps/z.ts', { ancien: '.github/CODEOWNERS', additions: 0 }))), 'chemin sensible');
    for (const ok of ['apps/web/src/a.ts', 'docs/claude.md.txt', 'apps/vitest-utils.ts']) expect(estSensible(ok)).toBe(false);
  });
  it('refuse-fiche-sensible', () => {
    refuse(prVerte({ fiche: { id: 'L01-T02', sensible: 'oui', tests_requis: 'oui' } }), 'fiche sensible');
    refuse(prVerte({ fiche: { id: 'L01-T02', tests_requis: 'oui' } }), 'fiche sensible');
    refuse(prVerte({ fiche: undefined }), 'fiche');
  });
  it('refuse-fiche-modifiee-hors-statut', () => {
    const fait = FICHE.replace('statut: a_faire', 'statut: fait');
    refuse(prVerte({ ficheTete: fait.replace('Corps', 'Autre corps') }), 'fiche modifiée');
    refuse(prVerte({ ficheTete: FICHE.replace('sensible: non', 'sensible: oui') }), 'fiche modifiée');
    refuse(prVerte({ ficheTete: undefined }), 'fiche modifiée');
  });
  it('refuse-sans-verdict-ok', () => {
    refuse(prVerte({ commentaires: [] }), 'aucun verdict');
    refuse(prVerte(verdictSeul(com(`verdict: ok ${SHA}`))), 'dernier verdict');
    refuse(prVerte(verdictSeul(com(`> VERDICT: OK ${SHA}`))), 'dernier verdict');
  });
  it('refuse-verdict-dans-bloc-de-code-ou-ligne-douteuse', () => {
    refuse(prVerte(verdictSeul(com(`Cité :\n\`\`\`\nVERDICT: OK\n\`\`\`\n${SHA}`))), 'aucun verdict');
    refuse(prVerte(verdictSeul(com(`~~~\nVERDICT: OK\n${SHA}`))), 'aucun verdict'); // bloc non fermé
    refuse(prVerte(verdictSeul(com(`VERDICT: OK\n\`\`\`\n${SHA}\n\`\`\``))), 'headRefOid actuel');
    refuse(prVerte(verdictSeul(com(`VERDICT: OK\nverdict final : à revoir\n${SHA}`))), 'dernier verdict');
    refuse(prVerte(verdictSeul(com(`VERDICT: OK mais non\n${SHA}`))), 'dernier verdict');
    fusionne(verdictSeul(com(`\`\`\`\nVERDICT: A CORRIGER\n\`\`\`\nVERDICT: OK\n${SHA}`)));
  });
  it('refuse-verdict-edite', () => {
    refuse(prVerte(verdictSeul(com(`VERDICT: OK\n${SHA}`, { edite: true }))), 'édité');
    refuse(prVerte(verdictSeul(com(`VERDICT: OK\n${SHA}`, { edite: undefined }))), 'édité');
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
  it('refuse-etiquette-bloque', () => refuse(prVerte({ etiquettes: ['relu', 'bloque'] }), 'étiquette interdite : bloque'));
  it('refuse-etiquette-a-corriger', () => refuse(prVerte({ etiquettes: ['relu', 'a-corriger'] }), 'étiquette interdite : a-corriger'));
  it('refuse-etiquette-sensible-a-fusionner', () => refuse(prVerte({ etiquettes: ['relu', 'sensible-a-fusionner'] }), 'étiquette interdite : sensible-a-fusionner'));
  it('refuse-etiquette-echec', () => {
    for (const e of ['echec-1', 'echec-2', 'echec-']) refuse(prVerte({ etiquettes: ['relu', e] }), `étiquette interdite : ${e}`);
  });
  it('refuse-verdict-autre-auteur', () => {
    const corps = `VERDICT: OK\n${SHA}`;
    refuse(prVerte(verdictSeul(com(corps, { auteur: 'auteur-fictif' }))), 'aucun verdict', { relecteurs: ['auteur-fictif'] });
    refuse(prVerte(verdictSeul(com(corps, { auteur: 'inconnu-fictif' }))), 'aucun verdict');
    refuse(prVerte(verdictSeul(com(corps, { auteur: 'Auteur-Fictif' }))), 'aucun verdict', { relecteurs: ['auteur-fictif'] });
  });
  it('compare-les-identites-sans-suffixe-bot', () => {
    const evenements = [{ evenement: 'labeled', etiquette: 'relu', acteur: `${RELECTEUR}[bot]`, date: '2026-11-06T10:01:00Z' }];
    fusionne({ evenements });
    fusionne({ ...verdictSeul(com(`VERDICT: OK\n${SHA}`, { auteur: `${RELECTEUR}[bot]` })) });
    fusionne({}, { relecteurs: [`${RELECTEUR}[bot]`] });
    refuse(prVerte({ auteur: `${RELECTEUR}[bot]` }), 'aucun verdict'); // l'auteur reste exclu malgré le suffixe
  });
  it('refuse-verdict-avant-dernier-commit', () => {
    refuse(prVerte(verdictSeul(com(`VERDICT: OK\n${ANCIEN}`))), 'headRefOid actuel');
    refuse(prVerte(verdictSeul(com('VERDICT: OK'))), 'headRefOid actuel');
    refuse(prVerte({ headRefOid: 'abc' }), 'headRefOid invalide');
  });
  it('refuse-verdict-ok-puis-a-corriger', () => {
    const ok = com(`VERDICT: OK\n${SHA}`);
    refuse(prVerte({ commentaires: [ok, com(`VERDICT: A CORRIGER\n${SHA}`, { date: '2026-11-06T11:00:00Z' })] }), 'dernier verdict');
    fusionne({ commentaires: [com(`VERDICT: A CORRIGER\n${ANCIEN}`, { date: '2026-11-06T09:00:00Z' }), ok] }); // A CORRIGER puis OK récent
  });
  it('refuse-sans-identite-relecteur', () => {
    for (const options of [{}, { relecteurs: ['A_RENSEIGNER_PAR_WILL'] }, { relecteurs: [] }]) refuse(prVerte(), 'identité du relecteur', options);
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
    for (const branche of ['main', 'lot-1/L01-T02', 'lot-01/L01-T02-bis', 'lot-01/L02-T02', 'x/lot-01/L01-T02', 'lot-01/L01-T02\n']) refuse(prVerte({ branche }), 'branche hors forme');
  });
  it('a-jour-exige-un-zero-strict', () => {
    for (const bon of ['0', '0\n']) expect(estAJour(bon)).toBe(true);
    for (const mauvais of ['', '\n', 'null\n', '3', '-0', '0x0', undefined]) expect(estAJour(mauvais)).toBe(false);
  });
  it('arret-lu-sans-doute-possible', () => {
    const exec = ({ fetch = 0, rev = 0, cat = 128 }) => (c) => ({ fetch, 'rev-parse': rev, 'cat-file': cat })[c];
    expect(arretPresent(exec({}))).toBe(false); // seul cas « absent » : fetch 0, origin/main présent, cat-file 128
    for (const cas of [{ cat: 0 }, { cat: 1 }, { cat: 129 }, { cat: null }, { fetch: 128 }, { rev: 128 }]) expect(arretPresent(exec(cas))).toBe(true);
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
    const l = ligneCalibrage({ date: T, pr: '7', fiche: 'L01-T02', fusionner: false, raisons: ['a;b', 'c\nd'], minutes: 3 });
    expect(l.split(';')).toHaveLength(6);
    expect(l).toBe(`${T};7;L01-T02;refus;a b | c d;3`);
  });
});
