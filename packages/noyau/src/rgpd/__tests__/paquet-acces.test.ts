import { describe, expect, it } from 'vitest';
import { lireManifeste, verifierManifeste, empreinteSha256 } from '../../documents/empreinte.js';
import { paquetAcces } from '../paquet-acces.js';
import { ErreurRgpd } from '../types.js';

type Entree = Parameters<typeof paquetAcces>[0];
const LE = '2026-03-01T10:00:00Z';
const modele = (n: number): string => `Pièces exclues : ${n}`;
const piece = (id: string, autres = false) => ({ id, extension: 'pdf', octets: new Uint8Array([1, 2, 3, id.length]), autresPersonnes: autres });
const base = (o: Partial<Entree> = {}): Entree => ({
  demandeId: 'd1', type: 'acces', le: LE, modele,
  occurrences: [{ source: 'tiers', id: 't1' }],
  donnees: [{ source: 'tiers', id: 't1', champs: { ville: 'Exempleville', ref: 'X1' } }],
  pieces: [], inclureAutresPersonnes: false, ...o,
});
const noms = (p: { fichiers: { nom: string }[] }): string[] => p.fichiers.map((f) => f.nom);
const texte = (p: ReturnType<typeof paquetAcces>, nom: string): string => new TextDecoder().decode(p.fichiers.find((f) => f.nom === nom)?.octets);
const code = (a: () => unknown): string | undefined => {
  try { a(); } catch (e) { return e instanceof ErreurRgpd ? e.code : 'autre'; }
  return undefined;
};

describe('paquet-acces', () => {
  it('t-exp-7-douze-pieces-et-csv', () => {
    const pieces = Array.from({ length: 12 }, (_, i) => piece(`p${i}`));
    const p = paquetAcces(base({ pieces }));
    expect(noms(p).filter((n) => n.startsWith('piece-'))).toHaveLength(12);
    expect(noms(p)).toContain('piece-p0.pdf');
    expect(noms(p)).toContain('donnees.csv');
    expect(noms(p)).not.toContain('donnees.jsonl');
    expect(p.evenements.filter((e) => e.type === 'personne.acces_produit')).toHaveLength(1);
    expect(p.evenements).toHaveLength(1);
    expect(texte(p, 'donnees.csv')).toContain('Exempleville');
  });

  it('portabilite-ajoute-jsonl', () => {
    const p = paquetAcces(base({ type: 'portabilite', donnees: [{ source: 'tiers', id: 't1', champs: { z: '1', a: '2' } }] }));
    expect(texte(p, 'donnees.jsonl')).toBe('{"a":"2","id":"t1","source":"tiers","z":"1"}\n');
    expect(p.evenements[0]?.type).toBe('personne.portabilite_produite');
  });

  it('manifeste-verifie', () => {
    const p = paquetAcces(base({ pieces: [piece('a'), piece('b')] }));
    const sans = p.fichiers.filter((f) => f.nom !== 'MANIFESTE.sha256');
    expect(verifierManifeste(p.manifeste, sans).ok).toBe(true);
    expect(texte(p, 'MANIFESTE.sha256')).toBe(p.manifeste);
    expect(p.empreinteManifeste).toBe(empreinteSha256(p.manifeste));
    expect(lireManifeste(p.manifeste).map((l) => l.nom)).toContain('a-savoir.txt');
    const abime = sans.map((f) => (f.nom === 'piece-a.pdf' ? { ...f, octets: new Uint8Array([9]) } : f));
    expect(verifierManifeste(p.manifeste, abime).modifies).toEqual(['piece-a.pdf']);
  });

  it('autres-personnes-exclues-par-defaut', () => {
    const p = paquetAcces(base({ pieces: [piece('a'), piece('b', true), piece('c', true)] }));
    expect(noms(p).filter((n) => n.startsWith('piece-'))).toEqual(['piece-a.pdf']);
    expect(texte(p, 'a-savoir.txt')).toBe(modele(2));
    expect(p.evenements.some((e) => e.type === 'personne.autres_personnes_incluses')).toBe(false);
  });

  it('case-cochee-incluses-et-journalisee', () => {
    const p = paquetAcces(base({ pieces: [piece('a'), piece('b', true)], inclureAutresPersonnes: true }));
    expect(noms(p)).toContain('piece-b.pdf');
    expect(texte(p, 'a-savoir.txt')).toBe(modele(0));
    expect(p.evenements.map((e) => e.type)).toEqual(['personne.acces_produit', 'personne.autres_personnes_incluses']);
    expect(p.evenements.every((e) => e.demandeId === 'd1' && e.horodatage === LE)).toBe(true);
  });

  it('donnee-hors-occurrences-ignoree', () => {
    const p = paquetAcces(base({
      donnees: [
        { source: 'tiers', id: 't1', champs: { ville: 'Dedans' } },
        { source: 'tiers', id: 't2', champs: { ville: 'Dehors' } },
        { source: 'pieces', id: 't1', champs: { ville: 'AutreSource' } },
      ],
    }));
    const csv = texte(p, 'donnees.csv');
    expect(csv).toContain('Dedans');
    expect(csv).not.toContain('Dehors');
    expect(csv).not.toContain('AutreSource');
  });

  it('evenements-sans-contenu', () => {
    const p = paquetAcces(base({
      type: 'portabilite', inclureAutresPersonnes: true, pieces: [piece('a', true)],
      donnees: [{ source: 'tiers', id: 't1', champs: { nom: 'Camille Exemple', email: 'camille@exemple.fr' } }],
    }));
    const json = JSON.stringify(p.evenements);
    expect(json).not.toContain('Camille');
    expect(json).not.toContain('@exemple.fr');
    expect(p.evenements[0]?.donnees).toEqual({ demande: 'd1', fichiers: noms(p).length });
  });

  it('aucune-occurrence-paquet-minimal', () => {
    const p = paquetAcces(base({ occurrences: [], donnees: [{ source: 'tiers', id: 't1', champs: { ville: 'X' } }] }));
    const csv = texte(p, 'donnees.csv').replace('﻿', '');
    expect(csv).toBe('"source";"id"\r\n');
    expect(verifierManifeste(p.manifeste, p.fichiers.filter((f) => f.nom !== 'MANIFESTE.sha256')).ok).toBe(true);
  });

  it('extension-et-entrees-refusees', () => {
    for (const extension of ['PDF', '', 'a.b', 'abcdefghi', '../x']) {
      expect(code(() => paquetAcces(base({ pieces: [{ ...piece('a'), extension }] })))).toBe('valeur_interdite');
    }
    expect(code(() => paquetAcces(base({ pieces: [{ ...piece('a'), extension: 'abcdefgh' }] })))).toBeUndefined();
    expect(code(() => paquetAcces(base({ le: 'hier' })))).toBe('horodatage_invalide');
    expect(code(() => paquetAcces(base({ pieces: [piece('a/b')] })))).toBe('valeur_interdite');
  });
});
