import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { creerFauxPlanificateur } from '../../../../packages/noyau/src/exploitation/planificateur.js';
import { SQL, controlerCoherence, creerDepotMemoire, creerDepotSql, gabaritRequete, inscrireControleQuotidien, limiteEffective, reconstruire, type EntreeBase, type PortSql, type TypeIndex } from '../domaines/recherche-base.js';

const TOUS: TypeIndex[] = ['piece', 'ecriture', 'tiers', 'commentaire'];
const migration = readFileSync(new URL('../base/migrations/093-index-recherche.sql', import.meta.url), 'utf8');
const source = readFileSync(new URL('../domaines/recherche-base.ts', import.meta.url), 'utf8');
const garde = (await import(new URL('../../../../outils/gardes/migrations.mjs', import.meta.url).href)) as { analyserMigration: (t: string, n: string) => unknown[]; analyserNoms: (n: string[]) => unknown[] };
const entree = (o: Partial<EntreeBase> & { objetId: string }): EntreeBase => ({
  type: 'piece', titre: 'Facture', texte: '', lien: `/pieces/${o.objetId}`, date: '2026-01-15', exerciceId: null, montantsCentimes: [], siren: null, sensible: false, ...o });
const trouver = async (d: ReturnType<typeof creerDepotMemoire>, s: string, q: string): Promise<string[]> => (await d.chercher(s, q, { typesAutorises: TOUS })).map((e) => e.objetId);
const idx = async (d: ReturnType<typeof creerDepotMemoire>, ...l: [string, Partial<EntreeBase> & { objetId: string }][]): Promise<void> => { for (const [s, e] of l) await d.indexer(s, entree(e)); };
const cle = { type: 'piece', objetId: 'p1' } as const;
/** Port qui note chaque appel (gabarit et paramètres). */
const espion = () => {
  const appels: { sql: string; params: readonly unknown[] }[] = [];
  const port: PortSql = { async executer(sql, params) { appels.push({ sql, params }); return []; } };
  return { appels, port };
};
describe('migration 093', () => {
  it('passe la garde, est additive et rejouable', () => {
    expect(garde.analyserMigration(migration, '093-index-recherche.sql')).toEqual([]);
    expect(garde.analyserNoms(['090-profil.sql', '093-index-recherche.sql'])).toEqual([]);
    expect(migration.match(/CREATE (UNIQUE )?INDEX/g)?.length).toBe(migration.match(/CREATE (UNIQUE )?INDEX IF NOT EXISTS/g)?.length);
    for (const m of [/CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public/, /to_tsvector\('french', a_compta\.sans_accent/, /USING GIN \(vecteur\)/, /societe_id text NOT NULL/, /PRIMARY KEY \(societe_id, type, objet_id\)/, /CREATE TABLE IF NOT EXISTS a_compta\.index_recherche/]) expect(migration).toMatch(m);
  });
});
describe('requêtes toujours paramétrées', () => {
  it('aucun gabarit SQL ne reçoit de valeur par concaténation', () => {
    for (const texte of Object.values(SQL)) { expect(texte).not.toMatch(/\$\{|'\s*\+|\+\s*'/); expect(texte).not.toMatch(/=\s*'/); }
    expect(source).not.toMatch(/executer\(`[^`]*\$\{|executer\([^,)]*\+/);
  });
  it('le texte cherché ne passe que par les paramètres, nettoyé', async () => {
    const { port, appels } = espion();
    await creerDepotSql(port).chercher('s1', "x'; DROP TABLE a_compta.index_recherche; --", { typesAutorises: TOUS });
    expect(appels).toHaveLength(1);
    expect(Object.values(SQL)).toContain(appels[0]?.sql);
    expect(appels[0]?.params[2]).toBe('x & drop & table & a & compta & index & recherche:*');
    expect([gabaritRequete(['facture', 'peint']), gabaritRequete(["l'atelier"])]).toEqual(['facture & peint:*', 'l & atelier:*']);
  });
  it('isolation SQL : chaque gabarit filtre par société, société appelante en premier paramètre', async () => {
    for (const g of [SQL.retirer, SQL.cles, SQL.chercher]) expect(g).toContain('societe_id = $1');
    expect(SQL.indexer).toMatch(/VALUES \(\$1,[\s\S]*ON CONFLICT \(societe_id, type, objet_id\)/);
    const { port, appels } = espion();
    const d = creerDepotSql(port);
    await d.indexer('s7', entree({ objetId: 'p1' })); await d.retirer('s7', cle); await d.cles('s7'); await d.chercher('s7', 'loyer', { typesAutorises: TOUS });
    expect(appels.map((a) => a.params[0])).toEqual(['s7', 's7', 's7', 's7']);
  });
});
describe('dépôt en mémoire', () => {
  it('trouve sans accent ni casse, dernier mot en préfixe', async () => {
    const d = creerDepotMemoire();
    await idx(d, ['s1', { objetId: 'p1', titre: 'Électricité de février' }]);
    for (const [q, att] of [['electri', ['p1']], ['FEVRIER electricite', ['p1']], ['plomberie', []]] as const) expect(await trouver(d, 's1', q)).toEqual(att);
  });
  it('plusieurs mots : ET, un seul mot présent ne suffit pas', async () => {
    const d = creerDepotMemoire();
    await idx(d, ['s1', { objetId: 'p1', titre: 'Loyer atelier' }]);
    expect([await trouver(d, 's1', 'loyer garage'), await trouver(d, 's1', 'loyer atelier')]).toEqual([[], ['p1']]);
  });
  it('isolation : une société ne voit jamais l\'autre', async () => {
    const d = creerDepotMemoire();
    await idx(d, ['s1', { objetId: 'p1', titre: 'Loyer atelier' }], ['s2', { objetId: 'p2', titre: 'Loyer garage' }]);
    expect([await trouver(d, 's1', 'loyer'), await trouver(d, 's2', 'loyer'), await trouver(d, 's3', 'loyer')]).toEqual([['p1'], ['p2'], []]);
  });
  it('permissions : seuls les types autorisés sont rendus', async () => {
    const d = creerDepotMemoire();
    await idx(d, ['s1', { objetId: 'p1', titre: 'Loyer' }], ['s1', { objetId: 'c1', type: 'commentaire', titre: 'Loyer' }]);
    expect((await d.chercher('s1', 'loyer', { typesAutorises: ['piece'], types: ['piece', 'commentaire'] })).map((e) => e.objetId)).toEqual(['p1']);
  });
  it('pièce devenue sensible retirée avant la réponse suivante', async () => {
    const d = creerDepotMemoire();
    await idx(d, ['s1', { objetId: 'p1', titre: 'Bulletin de salaire' }]);
    const avant = await trouver(d, 's1', 'bulletin');
    await d.retirer('s1', cle);
    expect([avant, await trouver(d, 's1', 'bulletin')]).toEqual([['p1'], []]);
  });
  it('le retrait SQL est attendu avant de rendre la main', async () => {
    let finir: () => void = () => undefined; let rendu = false;
    const port: PortSql = { executer: () => new Promise((ok) => { finir = () => ok([]); }) };
    const p = creerDepotSql(port).retirer('s1', cle).then(() => { rendu = true; });
    await new Promise((r) => setTimeout(r, 5));
    expect(rendu).toBe(false);
    finir(); await p;
    expect(rendu).toBe(true);
  });
  it('une ré-indexation marquée sensible retire la ligne (mémoire et SQL)', async () => {
    const d = creerDepotMemoire();
    await idx(d, ['s1', { objetId: 'p1', titre: 'Bulletin' }], ['s1', { objetId: 'p1', titre: 'Bulletin', sensible: true }]);
    const { port, appels } = espion();
    await creerDepotSql(port).indexer('s1', entree({ objetId: 'p1', sensible: true }));
    expect([await trouver(d, 's1', 'bulletin'), appels.map((a) => a.sql)]).toEqual([[], [SQL.retirer]]);
  });
  it('montant exact et SIREN', async () => {
    const d = creerDepotMemoire();
    await idx(d, ['s1', { objetId: 'e1', type: 'ecriture', titre: 'VT 1', montantsCentimes: [123456] }], ['s1', { objetId: 't1', type: 'tiers', titre: 'Atelier Fictif', siren: '123456782' }]);
    expect([await trouver(d, 's1', '1 234,56 €'), await trouver(d, 's1', '1234,57'), await trouver(d, 's1', '123 456 782')]).toEqual([['e1'], [], ['t1']]);
  });
  it('limite : bornée, NaN, Infinity et non entiers ramenés au défaut', async () => {
    expect([undefined, NaN, Infinity, -Infinity, 2.5, -3, 0, 1, 20, 99999].map(limiteEffective)).toEqual([10, 10, 10, 10, 10, 1, 1, 1, 20, 20]);
    const d = creerDepotMemoire();
    for (let i = 0; i < 30; i++) await idx(d, ['s1', { objetId: `p${i}`, titre: 'Loyer' }]);
    for (const [limite, attendu] of [[undefined, 10], [-1, 1], [NaN, 10], [1000, 20]] as const) {
      const f = { typesAutorises: TOUS, ...(limite === undefined ? {} : { limite }) };
      const { port, appels } = espion();
      await creerDepotSql(port).chercher('s1', 'loyer', f);
      expect([(await d.chercher('s1', 'loyer', f)).length, appels[0]?.params[5]]).toEqual([attendu, attendu]);
    }
  });
  it('requête invalide refusée', () => expect(creerDepotMemoire().chercher('s1', 'a', { typesAutorises: TOUS })).rejects.toMatchObject({ code: 'requete_invalide' }));
});
describe('reconstruction et cohérence', () => {
  it('reconstruction idempotente, retire les restes', async () => {
    const d = creerDepotMemoire();
    await idx(d, ['s1', { objetId: 'reste' }]);
    const src = [entree({ objetId: 'p1' }), entree({ objetId: 'p2' })];
    await reconstruire(d, 's1', src);
    const une = await d.cles('s1');
    await reconstruire(d, 's1', src);
    expect(await d.cles('s1')).toEqual(une);
    expect(une.map((c) => c.objetId).sort()).toEqual(['p1', 'p2']);
  });
  it('reconstruction n\'indexe pas une pièce sensible et la retire si elle y était', async () => {
    const d = creerDepotMemoire();
    await idx(d, ['s1', { objetId: 'p2' }]);
    const src = [entree({ objetId: 'p1' }), entree({ objetId: 'p2', sensible: true })];
    await reconstruire(d, 's1', src);
    expect((await d.cles('s1')).map((c) => c.objetId)).toEqual(['p1']);
    expect(await controlerCoherence(d, 's1', src)).toEqual({ manquants: [], orphelins: [] });
  });
  it('contrôle quotidien planifié en UTC, signale seulement un nombre', async () => {
    const d = creerDepotMemoire();
    await idx(d, ['s1', { objetId: 'orphelin' }]);
    const src = new Map([['s1', [entree({ objetId: 'p1' })]]]);
    expect(await controlerCoherence(d, 's1', src.get('s1') ?? [])).toEqual({ manquants: [cle], orphelins: [{ type: 'piece', objetId: 'orphelin' }] });
    const { planificateur, avancerJusqua } = creerFauxPlanificateur();
    const signaux: [string, number][] = [];
    inscrireControleQuotidien(planificateur, d, async () => src, (s, n) => signaux.push([s, n]));
    expect([(await avancerJusqua('2026-03-01T03:00:00Z')).map((r) => r.etat), signaux]).toEqual([['fait'], [['s1', 2]]]);
  });
  it('p95 sous 500 ms sur 5 000 pièces (dépôt en mémoire)', async () => {
    const d = creerDepotMemoire();
    for (let i = 0; i < 5000; i++) await idx(d, ['s1', { objetId: `p${i}`, titre: `Facture fournisseur ${i}`, texte: `Peinture atelier lot ${i % 50}` }]);
    const durees: number[] = [];
    for (let i = 0; i < 40; i++) { const t = performance.now(); await d.chercher('s1', 'peintur atel', { typesAutorises: TOUS }); durees.push(performance.now() - t); }
    expect(durees.sort((a, b) => a - b)[Math.floor(durees.length * 0.95)]).toBeLessThan(500);
  });
});
