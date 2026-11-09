import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ErreurDepotChat, creerDepotChatMemoire, type Message, type PropositionStockee } from '../depot.js';

type Probleme = { fichier: string; code: string };
const garde = (await import(new URL('../../../../../outils/gardes/migrations.mjs', import.meta.url).href)) as {
  analyserMigration: (texte: string, nom: string) => Probleme[];
  analyserNoms: (noms: string[]) => Probleme[];
};
const NOM = '081-chat.sql';
const sql = readFileSync(new URL(`../../base/migrations/${NOM}`, import.meta.url), 'utf8');
const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return (e as ErreurDepotChat).code; }
  return undefined;
};

const A = 'societe-a';
const B = 'societe-b';
const T0 = '2026-03-01T10:00:00.000Z';
const msg = (id: string, parentId: string | null, le = T0, societeId = A): Message =>
  ({ id, societeId, conversationId: 'conv-1', parentId, role: 'personne', texte: 'texte fictif', le });
const prop = (o: Partial<PropositionStockee> = {}): PropositionStockee =>
  ({ id: 'prop-1', societeId: A, conversationId: 'conv-1', etat: 'proposee', avant: { v: 1 }, apres: { v: 2 }, cibles: ['ecr-1'], expireLe: '2026-03-01T11:00:00.000Z', ...o });
const depot = () => {
  const d = creerDepotChatMemoire();
  d.creerConversation({ id: 'conv-1', societeId: A, creeLe: T0 });
  return d;
};

describe('migration 081', () => {
  it('migrer-deux-fois', () => {
    expect(garde.analyserMigration(sql, NOM)).toEqual([]);
    expect(garde.analyserNoms([NOM])).toEqual([]);
    for (const m of sql.matchAll(/CREATE\s+(?:TABLE|INDEX|SCHEMA)\b[^\n]*/g)) expect(m[0]).toMatch(/IF NOT EXISTS/);
    expect(sql.match(/CREATE TABLE/g)).toHaveLength(5);
  });

  it('aucun-delete-dans-la-migration', () => {
    expect(sql).not.toMatch(/\b(DELETE|DROP|TRUNCATE|TRIGGER|EXECUTE)\b/i);
  });

  it('societe-et-parent-dans-le-schema', () => {
    for (const t of ['conversation', 'message', 'etape', 'preference', 'proposition_chat']) {
      const corps = new RegExp(`a_compta\\.${t} \\(([\\s\\S]*?)\\n\\);`).exec(sql)?.[1] ?? '';
      expect(corps).toMatch(/societe_id text NOT NULL/);
    }
    expect(sql).toMatch(/parent_id text,/);
  });
});

describe('depot du chat', () => {
  it('conversation-liee-a-une-societe', () => {
    const d = depot();
    expect(d.lireConversation(A, 'conv-1')?.societeId).toBe(A);
    expect(d.lireConversation(B, 'conv-1')).toBeUndefined();
    expect(code(() => d.ajouterMessage(msg('m-b', null, T0, B)))).toBe('inconnu');
    expect(code(() => d.creerConversation({ id: 'conv-1', societeId: A, creeLe: T0 }))).toBe('doublon');
  });

  it('branches-par-parent', () => {
    const d = depot();
    d.ajouterMessage(msg('racine', null));
    d.ajouterMessage(msg('b2', 'racine', '2026-03-01T10:00:02.000Z'));
    d.ajouterMessage(msg('b1', 'racine', '2026-03-01T10:00:01.000Z'));
    d.ajouterMessage(msg('suite', 'b1', '2026-03-01T10:00:03.000Z'));
    expect(d.enfants(A, 'conv-1', null).map((m) => m.id)).toEqual(['racine']);
    expect(d.enfants(A, 'conv-1', 'racine').map((m) => m.id)).toEqual(['b1', 'b2']);
    expect(d.enfants(A, 'conv-1', 'b1').map((m) => m.id)).toEqual(['suite']);
    expect(d.enfants(B, 'conv-1', 'racine')).toEqual([]);
    expect(code(() => d.ajouterMessage(msg('orphelin', 'absent')))).toBe('inconnu');
    expect(code(() => d.ajouterMessage(msg('racine', null)))).toBe('doublon');
  });

  it('etapes-par-message', () => {
    const d = depot();
    d.ajouterMessage(msg('m1', null));
    d.ajouterEtape({ id: 'e1', societeId: A, messageId: 'm1', code: 'lecture', le: T0 });
    expect(d.etapes(A, 'm1').map((e) => e.code)).toEqual(['lecture']);
    expect(d.etapes(B, 'm1')).toEqual([]);
    expect(code(() => d.ajouterEtape({ id: 'e2', societeId: A, messageId: 'absent', code: 'x', le: T0 }))).toBe('inconnu');
  });

  it('preference-oubliee-non-utilisee', () => {
    const d = depot();
    d.poserPreference(A, 'cle-1', 'valeur-1');
    d.poserPreference(A, 'cle-2', 'valeur-2');
    d.poserPreference(B, 'cle-1', 'valeur-b');
    d.oublierPreference(A, 'cle-1');
    expect(d.preferencesUtilisables(A).map((p) => p.cle)).toEqual(['cle-2']);
    expect(d.preferencesUtilisables(B).map((p) => p.valeur)).toEqual(['valeur-b']);
    expect(code(() => d.oublierPreference(A, 'absente'))).toBe('inconnu');
  });

  it('application-atomique', () => {
    const d = depot();
    d.ajouterMessage(msg('m1', null));
    d.enregistrerProposition(prop());
    const echec = new Error('echec d ecriture');
    expect(() => d.appliquerAtomique(A, 'prop-1', T0, (tx) => {
      tx.ajouterEtape({ id: 'e1', societeId: A, messageId: 'm1', code: 'appliquer', le: T0 });
      throw echec;
    })).toThrow(echec);
    expect(d.lireProposition(A, 'prop-1')?.etat).toBe('proposee');
    expect(d.etapes(A, 'm1')).toEqual([]);

    const ok = d.appliquerAtomique(A, 'prop-1', T0, (tx) => tx.ajouterEtape({ id: 'e1', societeId: A, messageId: 'm1', code: 'appliquer', le: T0 }));
    expect(ok).toMatchObject({ etat: 'appliquee', appliqueLe: T0, avant: { v: 1 }, apres: { v: 2 }, cibles: ['ecr-1'] });
    expect(d.etapes(A, 'm1')).toHaveLength(1);
    expect(code(() => d.appliquerAtomique(A, 'prop-1', T0, () => undefined))).toBe('proposition_non_proposee');
    expect(code(() => d.appliquerAtomique(B, 'prop-1', T0, () => undefined))).toBe('inconnu');
  });

  it('lectures-en-copie', () => {
    const d = depot();
    d.enregistrerProposition(prop());
    const lue = d.lireProposition(A, 'prop-1');
    (lue as { etat: string }).etat = 'annulee';
    expect(d.lireProposition(A, 'prop-1')?.etat).toBe('proposee');
  });
});
