import { describe, expect, it } from 'vitest';
import type { Message } from '../depot.js';
import { creerIndexRechercheMemoire } from '../recherche.js';

const A = 'societe-a';
const B = 'societe-b';
const msg = (id: string, texte: string, societeId = A, conversationId = 'conv-1', le = '2026-03-01T10:00:00.000Z'): Message =>
  ({ id, societeId, conversationId, parentId: null, role: 'personne', texte, le });
const ids = (r: readonly { messageId: string }[]): string[] => r.map((x) => x.messageId);

describe('recherche dans les conversations', () => {
  it('trouve-un-mot', () => {
    const i = creerIndexRechercheMemoire();
    i.indexer(msg('m1', 'Facture du fournisseur Dupré'));
    i.indexer(msg('m2', 'Rien à voir ici', A, 'conv-2'));
    i.indexer(msg('m3', 'Autre facture fournisseur', A, 'conv-3', '2026-03-02T10:00:00.000Z'));
    i.indexer(msg('m4', 'Dupré a appelé', A, 'conv-4', '2026-03-03T10:00:00.000Z'));
    const r = i.rechercher(A, 'facture');
    expect(ids(r)).toEqual(['m3', 'm1']);
    expect(r[0]).toEqual({ messageId: 'm3', conversationId: 'conv-3', le: '2026-03-02T10:00:00.000Z' });
    expect(ids(i.rechercher(A, 'facture fournisseur dupré'))).toEqual(['m1']);
    // Tous les mots sont requis : m4 contient « dupré » sans « facture », m3 l'inverse.
    expect(ids(i.rechercher(A, 'dupré facture'))).toEqual(['m1']);
    expect(ids(i.rechercher(A, 'facture dupré'))).toEqual(['m1']);
    expect(i.rechercher(A, 'inexistant')).toEqual([]);
    expect(ids(i.rechercher(A, 'facture', 1))).toEqual(['m3']);
  });

  it('accents-et-pluriels', () => {
    const i = creerIndexRechercheMemoire();
    i.indexer(msg('m1', 'Les Écritures comptables du mois'));
    i.indexer(msg('m2', 'Un journal des achats'));
    expect(ids(i.rechercher(A, 'ecriture'))).toEqual(['m1']);
    expect(ids(i.rechercher(A, 'ÉCRITURES'))).toEqual(['m1']);
    expect(ids(i.rechercher(A, 'journaux'))).toEqual([]);
    expect(ids(i.rechercher(A, 'comptable'))).toEqual(['m1']);
  });

  it('autre-societe-invisible', () => {
    const i = creerIndexRechercheMemoire();
    i.indexer(msg('a1', 'secret fictif alpha', A));
    i.indexer(msg('b1', 'secret fictif beta', B, 'conv-b'));
    expect(ids(i.rechercher(A, 'secret'))).toEqual(['a1']);
    expect(ids(i.rechercher(B, 'secret'))).toEqual(['b1']);
    expect(i.rechercher(A, 'beta')).toEqual([]);
    expect(i.rechercher(B, 'alpha')).toEqual([]);
    expect(i.rechercher('societe-c', 'secret')).toEqual([]);
    expect(i.rechercher('', 'secret')).toEqual([]);
  });

  it('requete-vide', () => {
    const i = creerIndexRechercheMemoire();
    i.indexer(msg('m1', 'bonjour'));
    expect(i.rechercher(A, '')).toEqual([]);
    expect(i.rechercher(A, '   ')).toEqual([]);
    expect(i.rechercher(A, '?! …')).toEqual([]);
    expect(i.rechercher(A, 'bonjour', 0)).toEqual([]);
  });

  it('temps-sur-mille-conversations', () => {
    const i = creerIndexRechercheMemoire();
    for (let c = 0; c < 1000; c++) {
      for (let k = 0; k < 5; k++) {
        i.indexer(msg(`m-${c}-${k}`, `message ${k} de la conversation ${c} sur le dossier ${c % 50}`, c % 2 === 0 ? A : B, `conv-${c}`));
      }
    }
    const debut = performance.now();
    const r = i.rechercher(A, 'dossier 8 conversation');
    const duree = performance.now() - debut;
    expect(r.length).toBeGreaterThan(0);
    expect(duree).toBeLessThan(200);
  });
});
