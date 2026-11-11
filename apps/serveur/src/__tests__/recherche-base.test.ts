import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { creerFauxPlanificateur } from '../../../../packages/noyau/src/exploitation/planificateur.js';
import {
  SQL, controlerCoherence, creerDepotMemoire, creerDepotSql, gabaritRequete, inscrireControleQuotidien, reconstruire,
  type EntreeBase, type PortSql, type TypeIndex,
} from '../domaines/recherche-base.js';

const TOUS: TypeIndex[] = ['piece', 'ecriture', 'tiers', 'commentaire'];
const migration = readFileSync(new URL('../base/migrations/093-index-recherche.sql', import.meta.url), 'utf8');
const source = readFileSync(new URL('../domaines/recherche-base.ts', import.meta.url), 'utf8');
const garde = (await import(new URL('../../../../outils/gardes/migrations.mjs', import.meta.url).href)) as {
  analyserMigration: (t: string, n: string) => unknown[];
  analyserNoms: (n: string[]) => unknown[];
};
const entree = (o: Partial<EntreeBase> & { objetId: string }): EntreeBase => ({
  type: 'piece', titre: 'Facture', texte: '', lien: `/pieces/${o.objetId}`, date: '2026-01-15', exerciceId: null, montantsCentimes: [], siren: null, ...o,
});
const trouver = async (d: ReturnType<typeof creerDepotMemoire>, s: string, q: string): Promise<string[]> =>
  (await d.chercher(s, q, { typesAutorises: TOUS })).map((e) => e.objetId);
describe('migration 093', () => {
  it('passe la garde, est additive et rejouable', () => {
    expect(garde.analyserMigration(migration, '093-index-recherche.sql')).toEqual([]);
    expect(garde.analyserNoms(['090-profil.sql', '093-index-recherche.sql'])).toEqual([]);
    expect(migration.match(/CREATE (UNIQUE )?INDEX/g)?.length).toBe(migration.match(/CREATE (UNIQUE )?INDEX IF NOT EXISTS/g)?.length);
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS a_compta\.index_recherche/);
  });
  it('plein texte français sans accents, GIN, clé par société', () => {
    for (const m of [/to_tsvector\('french', a_compta\.sans_accent/, /USING GIN \(vecteur\)/, /societe_id text NOT NULL/, /PRIMARY KEY \(societe_id, type, objet_id\)/]) expect(migration).toMatch(m);
  });
});
describe('requêtes toujours paramétrées', () => {
  it('aucun gabarit SQL ne reçoit de valeur par concaténation', () => {
    for (const texte of Object.values(SQL)) {
      expect(texte).not.toMatch(/\$\{|'\s*\+|\+\s*'/);
      expect(texte).not.toMatch(/=\s*'/);
    }
    expect(source).not.toMatch(/executer\(`[^`]*\$\{/);
    expect(source).not.toMatch(/executer\([^,)]*\+/);
  });
  it('le texte cherché ne passe que par les paramètres, nettoyé', async () => {
    const appels: { sql: string; params: readonly unknown[] }[] = [];
    const port: PortSql = { async executer(sql, params) { appels.push({ sql, params }); return []; } };
    await creerDepotSql(port).chercher('s1', "x'; DROP TABLE a_compta.index_recherche; --", { typesAutorises: TOUS });
    expect(appels).toHaveLength(1);
    expect(Object.values(SQL)).toContain(appels[0]?.sql);
    expect(appels[0]?.sql).not.toContain('DROP');
    expect(appels[0]?.params[2]).toBe('x & drop & table & acomptaindexrecherche:*');
    expect(gabaritRequete(['facture', 'peint'])).toBe('facture & peint:*');
  });
});
describe('dépôt en mémoire', () => {
  it('trouve sans accent ni casse, dernier mot en préfixe', async () => {
    const d = creerDepotMemoire();
    await d.indexer('s1', entree({ objetId: 'p1', titre: 'Électricité de février' }));
    expect(await trouver(d, 's1', 'electri')).toEqual(['p1']);
    expect(await trouver(d, 's1', 'FEVRIER electricite')).toEqual(['p1']);
    expect(await trouver(d, 's1', 'plomberie')).toEqual([]);
  });
  it('isolation : une société ne voit jamais l\'autre', async () => {
    const d = creerDepotMemoire();
    await d.indexer('s1', entree({ objetId: 'p1', titre: 'Loyer atelier' }));
    await d.indexer('s2', entree({ objetId: 'p2', titre: 'Loyer garage' }));
    expect(await trouver(d, 's1', 'loyer')).toEqual(['p1']);
    expect(await trouver(d, 's2', 'loyer')).toEqual(['p2']);
    expect(await trouver(d, 's3', 'loyer')).toEqual([]);
  });
  it('permissions : seuls les types autorisés sont rendus', async () => {
    const d = creerDepotMemoire();
    await d.indexer('s1', entree({ objetId: 'p1', titre: 'Loyer' }));
    await d.indexer('s1', entree({ objetId: 'c1', type: 'commentaire', titre: 'Loyer' }));
    const r = await d.chercher('s1', 'loyer', { typesAutorises: ['piece'], types: ['piece', 'commentaire'] });
    expect(r.map((e) => e.objetId)).toEqual(['p1']);
  });
  it('pièce devenue sensible retirée avant la réponse suivante', async () => {
    const d = creerDepotMemoire();
    await d.indexer('s1', entree({ objetId: 'p1', titre: 'Bulletin de salaire' }));
    expect(await trouver(d, 's1', 'bulletin')).toEqual(['p1']);
    await d.retirer('s1', { type: 'piece', objetId: 'p1' });
    expect(await trouver(d, 's1', 'bulletin')).toEqual([]);
  });
  it('le retrait SQL est attendu avant de rendre la main', async () => {
    const ordre: string[] = [];
    const port: PortSql = { async executer(sql) { await Promise.resolve(); ordre.push(sql === SQL.retirer ? 'retrait' : 'autre'); return []; } };
    await creerDepotSql(port).retirer('s1', { type: 'piece', objetId: 'p1' });
    ordre.push('reponse');
    expect(ordre).toEqual(['retrait', 'reponse']);
  });
  it('montant exact et SIREN', async () => {
    const d = creerDepotMemoire();
    await d.indexer('s1', entree({ objetId: 'e1', type: 'ecriture', titre: 'VT 1', montantsCentimes: [123456] }));
    await d.indexer('s1', entree({ objetId: 't1', type: 'tiers', titre: 'Atelier Fictif', siren: '123456782' }));
    expect(await trouver(d, 's1', '1 234,56 €')).toEqual(['e1']);
    expect(await trouver(d, 's1', '1234,57')).toEqual([]);
    expect(await trouver(d, 's1', '123 456 782')).toEqual(['t1']);
  });
  it('requête invalide refusée', async () => {
    await expect(creerDepotMemoire().chercher('s1', 'a', { typesAutorises: TOUS })).rejects.toMatchObject({ code: 'requete_invalide' });
  });
});
describe('reconstruction et cohérence', () => {
  it('reconstruction idempotente, retire les restes', async () => {
    const d = creerDepotMemoire();
    await d.indexer('s1', entree({ objetId: 'reste' }));
    const src = [entree({ objetId: 'p1' }), entree({ objetId: 'p2' })];
    await reconstruire(d, 's1', src);
    const une = await d.cles('s1');
    await reconstruire(d, 's1', src);
    expect(await d.cles('s1')).toEqual(une);
    expect(une.map((c) => c.objetId).sort()).toEqual(['p1', 'p2']);
  });
  it('contrôle quotidien planifié en UTC, signale seulement un nombre', async () => {
    const d = creerDepotMemoire();
    await d.indexer('s1', entree({ objetId: 'orphelin' }));
    const src = new Map([['s1', [entree({ objetId: 'p1' })]]]);
    expect(await controlerCoherence(d, 's1', src.get('s1') ?? [])).toEqual({
      manquants: [{ type: 'piece', objetId: 'p1' }], orphelins: [{ type: 'piece', objetId: 'orphelin' }],
    });
    const { planificateur, avancerJusqua } = creerFauxPlanificateur();
    const signaux: [string, number][] = [];
    inscrireControleQuotidien(planificateur, d, async () => src, (s, n) => signaux.push([s, n]));
    const rapports = await avancerJusqua('2026-03-01T03:00:00Z');
    expect(rapports.map((r) => r.etat)).toEqual(['fait']);
    expect(signaux).toEqual([['s1', 2]]);
  });
});
describe('performance', () => {
  it('p95 sous 500 ms sur 5 000 pièces (dépôt en mémoire)', async () => {
    const d = creerDepotMemoire();
    for (let i = 0; i < 5000; i++) await d.indexer('s1', entree({ objetId: `p${i}`, titre: `Facture fournisseur ${i}`, texte: `Peinture atelier lot ${i % 50}` }));
    const durees: number[] = [];
    for (let i = 0; i < 40; i++) { const t = performance.now(); await d.chercher('s1', 'peintur atel', { typesAutorises: TOUS }); durees.push(performance.now() - t); }
    durees.sort((a, b) => a - b);
    expect(durees[Math.floor(durees.length * 0.95)]).toBeLessThan(500);
  });
});
