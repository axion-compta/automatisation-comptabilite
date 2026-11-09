import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AppelIa, CHAMPS_INTERDITS, DecisionIa } from '../../../../../packages/contrat/src/chat/journal-ia.js';
import { ISSUES_APPEL_IA, CONFIANCES, SOURCES_PROPOSITION, POLES } from '../../../../../packages/noyau/src/chat/types.js';
import { PREREGLAGES, creerDepotIaMemoire } from '../depot.js';

type Probleme = { fichier: string; code: string };
const garde = (await import(new URL('../../../../../outils/gardes/migrations.mjs', import.meta.url).href)) as {
  analyserMigration: (texte: string, nom: string) => Probleme[];
  analyserNoms: (noms: string[]) => Probleme[];
};
const NOM = '057-ia.sql';
const sql = readFileSync(new URL(`../../base/migrations/${NOM}`, import.meta.url), 'utf8');
const table = (n: string): string => new RegExp(`CREATE TABLE IF NOT EXISTS a_compta\\.${n} \\(([\\s\\S]*?)\\n\\);`).exec(sql)?.[1] ?? '';
const colonnes = (n: string): string[] => table(n).split('\n').map((l) => /^\s{2}([a-z_]+) /.exec(l)?.[1]).filter((c): c is string => c !== undefined && c !== 'CHECK' && c !== 'PRIMARY');
const liste = (t: string, c: string): string[] => [...(new RegExp(`${c} text NOT NULL CHECK \\(${c} IN \\(([^)]*)\\)`).exec(table(t))?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!);
const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return (e as { code?: string }).code; }
  return undefined;
};

const appel = (o: Partial<AppelIa> = {}): AppelIa => ({
  id: 'appel-1', agent: 'agent-essai', piece_id: 'piece-1', alias: 'alias-essai', modele: 'modele-essai', version_modele: 'v-essai',
  fournisseur: 'fournisseur-essai', region: 'region-essai', jetons_entree: 10, jetons_sortie: 5, cout_micro_centimes: 3, duree_ms: 40, issue: 'ok', ...o,
});
const decision = (o: Partial<DecisionIa> = {}): DecisionIa => ({
  id: 'dec-1', quand: '2026-03-01T10:00:00Z', agent: 'agent-essai', etape: 'etape-essai', demandeur: { sorte: 'systeme' }, piece_id: 'piece-1',
  objet: { type: 'ecriture', id: 'obj-1' }, proposition: 'compte-essai', source_proposition: 'historique', confiance: 'sur',
  motif: 'motif fictif', sources_legales: [], appel_id: 'appel-1', cout_micro_centimes: 3, ...o,
});

describe('migration 057', () => {
  it('aucune-colonne-de-texte', () => {
    for (const n of ['appel_ia', 'decision_ia', 'reglage_modele', 'propriete_constat']) {
      expect(colonnes(n).length).toBeGreaterThan(1);
      for (const c of colonnes(n)) expect(CHAMPS_INTERDITS).not.toContain(c);
    }
    expect(colonnes('appel_ia').sort()).toEqual(Object.keys(AppelIa.shape).sort());
    expect(code(() => creerDepotIaMemoire().ecrireAppel({ ...appel(), texte: 'x' } as never))).toBe('invalide');
  });

  it('migrer-deux-fois', () => {
    expect(garde.analyserMigration(sql, NOM)).toEqual([]);
    expect(garde.analyserNoms(['057-ia.sql', '080-exploitation-rgpd.sql'])).toEqual([]);
    for (const m of sql.matchAll(/CREATE\s+(?:TABLE|INDEX|SCHEMA)\b[^\n]*/g)) expect(m[0]).toMatch(/IF NOT EXISTS/);
    expect(sql).not.toMatch(/TRIGGER|GRANT|DEFINER|DROP/i);
  });

  it('check-repris-du-code', () => {
    expect(liste('appel_ia', 'issue')).toEqual([...ISSUES_APPEL_IA]);
    expect(liste('decision_ia', 'confiance')).toEqual([...CONFIANCES]);
    expect(liste('decision_ia', 'source_proposition')).toEqual([...SOURCES_PROPOSITION]);
    expect(liste('reglage_modele', 'prereglage')).toEqual([...PREREGLAGES]);
    expect(liste('propriete_constat', 'pole')).toEqual([...POLES]);
    expect(PREREGLAGES).toHaveLength(2);
  });
});

describe('dépôt en mémoire', () => {
  it('appel-ecrit-une-ligne', () => {
    const d = creerDepotIaMemoire();
    d.ecrireAppel(appel());
    expect(d.appels()).toEqual([appel()]);
    expect(code(() => d.ecrireAppel(appel()))).toBe('doublon');
    expect(code(() => d.ecrireAppel(appel({ id: 'appel-2', jetons_entree: -1 })))).toBe('invalide');
    expect(code(() => d.ecrireAppel(appel({ id: 'appel-3', jetons_sortie: Number.NaN })))).toBe('invalide');
    expect(code(() => d.ecrireAppel(appel({ id: 'appel-4', duree_ms: Infinity })))).toBe('invalide');
    expect(code(() => d.ecrireAppel(appel({ id: 'appel-5', duree_ms: 1.5 })))).toBe('invalide');
    expect(code(() => d.ecrireAppel({ ...appel({ id: 'appel-6' }), piece_id: undefined }))).toBe('invalide');
    expect(d.appels()).toHaveLength(1);
    expect(() => { (d.appels() as AppelIa[]).push(appel({ id: 'x' })); }).toThrow(TypeError);
  });

  it('decision-liee-a-l-appel', () => {
    const d = creerDepotIaMemoire();
    expect(code(() => d.ecrireDecision(decision()))).toBe('appel_inconnu');
    d.ecrireAppel(appel());
    d.ecrireDecision(decision());
    expect(code(() => d.ecrireDecision(decision()))).toBe('doublon');
    expect(code(() => d.ecrireDecision(decision({ id: 'dec-2', motif: 'm'.repeat(DecisionIa.shape.motif.maxLength ?? 0) + 'm' })))).toBe('invalide');
    expect(d.pourquoi('dec-1')).toEqual({ decision: decision(), appel: appel() });
    expect(d.pourquoi('inconnue')).toBeUndefined();
    expect(d.decisions()).toHaveLength(1);
  });

  it('retour-arriere-ligne-precedente', () => {
    const d = creerDepotIaMemoire();
    expect(d.precedent('rapide')).toBeNull();
    d.regler('rapide', 'alias-a', '2026-03-01T10:00:00Z');
    expect(d.precedent('rapide')).toBeNull();
    const b = d.regler('rapide', 'alias-b', '2026-03-02T10:00:00Z');
    d.regler('precis', 'alias-p', '2026-03-02T11:00:00Z');
    expect(b.version).toBe(2);
    expect(d.precedent('rapide')).toEqual({ version: 1, alias: 'alias-a', le: '2026-03-01T10:00:00Z' });
    d.regler('rapide', 'alias-c', '2026-03-03T10:00:00Z');
    expect(d.precedent('rapide')?.alias).toBe('alias-b');
    expect(d.historique('rapide').map((l) => l.alias)).toEqual(['alias-a', 'alias-b', 'alias-c']);
    expect(d.historique('precis')).toHaveLength(1);
    expect(code(() => d.regler('inconnu' as never, 'a', '2026-03-01T10:00:00Z'))).toBe('invalide');
    expect(code(() => d.regler('rapide', 'Alias Invalide', '2026-03-01T10:00:00Z'))).toBe('invalide');
    expect(code(() => d.regler('rapide', 'alias-d', 'pas-une-date'))).toBe('invalide');
    expect(code(() => d.regler('rapide', 'alias-d', '2026-03-02T09:00:00Z'))).toBe('ordre_inverse');
    expect(d.historique('rapide')).toHaveLength(3);
  });

  it('propriete-complete', () => {
    const d = creerDepotIaMemoire();
    d.definirPropriete('type-a', 'fiscalite');
    d.definirPropriete('type-b', 'comptabilite');
    expect(code(() => d.definirPropriete('type-c', 'pole-inventé' as never))).toBe('invalide');
    expect(code(() => d.definirPropriete('', 'fiscalite'))).toBe('invalide');
    expect(d.propriete()).toEqual({ 'type-a': 'fiscalite', 'type-b': 'comptabilite' });
    expect(d.verifierPropriete(['type-a', 'type-b'])).toEqual({ sansProprietaire: [], poleInconnu: [] });
    expect(d.verifierPropriete(['type-a', 'type-z']).sansProprietaire).toEqual(['type-z']);
    d.definirPropriete('type-a', 'juridique');
    expect(d.propriete()['type-a']).toBe('juridique');
  });
});
