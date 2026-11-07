import { describe, expect, it } from 'vitest';
import { cleDePiece, orienterPiece, reprendre } from '../pieces.js';
import type { PieceEnAttente } from '../pieces.js';
import { ETATS_ACCES, ErreurAbonnement } from '../types.js';
import type { EtatAcces } from '../types.js';

const LIBRE = { plafondTechniqueAtteint: false, enAttenteVolume: false };
const emp = (c: string): string => c.repeat(64);
const piece = (id: string, c: string, heure: number, societe = 'Societe Test'): PieceEnAttente => ({
  id,
  societe,
  empreinte: emp(c),
  recueLe: '2030-01-01T' + String(heure).padStart(2, '0') + ':00:00Z',
});
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurAbonnement ? e.code : 'autre';
  }
  return undefined;
};

describe('orientation et reprise des pièces', () => {
  it('pause-vingt-pieces-en-attente', () => {
    const res = Array.from({ length: 20 }, () => orienterPiece('LECTURE_SEULE', LIBRE));
    expect(res.filter((r) => r.orientation === 'en_attente' && r.cause === 'etat_acces')).toHaveLength(20);
    expect(res.filter((r) => r.orientation === 'refusee')).toHaveLength(0);
    expect(orienterPiece('SUSPENDU', LIBRE)).toEqual({ orientation: 'en_attente', cause: 'etat_acces' });
    expect(orienterPiece('ACTIF', LIBRE)).toEqual({ orientation: 'traiter', cause: null });
    expect(orienterPiece('ESSAI', LIBRE)).toEqual({ orientation: 'traiter', cause: null });
    expect(orienterPiece('DELAI_DE_GRACE', LIBRE)).toEqual({ orientation: 'traiter', cause: null });
  });

  it('reprise-ordre-d-arrivee-sans-doublon', () => {
    const file = Array.from({ length: 20 }, (_, i) => piece('p' + String(19 - i).padStart(2, '0'), String.fromCharCode(97 + (19 - i) % 6), 19 - i));
    const copie = JSON.stringify(file);
    const r = reprendre(file, new Set());
    expect(JSON.stringify(file)).toBe(copie);
    expect(r.aTraiter.map((p) => p.recueLe)).toEqual([...r.aTraiter.map((p) => p.recueLe)].sort());
    expect(r.aTraiter[0]?.id).toBe('p00');
    expect(r.aTraiter).toHaveLength(6);
    expect(r.doublons).toHaveLength(14);
    expect(r.aTraiter.length + r.doublons.length).toBe(file.length);
    expect(r.resume).toEqual({ piecesTraitees: 6 });
    const unique = Array.from({ length: 20 }, (_, i) => ({ ...piece('q' + String(19 - i).padStart(2, '0'), 'a', 0), empreinte: (19 - i).toString(16).padStart(2, '0').repeat(32), recueLe: '2030-01-01T00:00:' + String(19 - i).padStart(2, '0') + 'Z' }));
    const u = reprendre(unique, new Set());
    expect(u.aTraiter.map((p) => p.id)).toEqual(Array.from({ length: 20 }, (_, i) => 'q' + String(i).padStart(2, '0')));
    expect(u.doublons).toEqual([]);
    expect(u.resume.piecesTraitees).toBe(20);
    const formes = (id: string, c: string, t: string): PieceEnAttente => ({ ...piece(id, c, 0), recueLe: '2030-01-01T10:00:' + t });
    const m = reprendre([formes('tard', 'a', '00.500Z'), formes('tot', 'a', '00Z'), formes('b', 'b', '00.95Z'), formes('a', 'b', '00.9Z')], new Set());
    expect(m.aTraiter.map((p) => p.id)).toEqual(['tot', 'a']);
    expect(m.doublons).toEqual(['tard', 'b']);
  });

  it('resilie-refusee-meme-sous-plafond', () => {
    for (const o of [LIBRE, { plafondTechniqueAtteint: true, enAttenteVolume: true }]) {
      expect(orienterPiece('RESILIE', o)).toEqual({ orientation: 'refusee', cause: 'contrat_termine' });
    }
  });

  it('priorite-etat-avant-plafond-avant-volume', () => {
    const tout = { plafondTechniqueAtteint: true, enAttenteVolume: true };
    expect(orienterPiece('SUSPENDU', tout).cause).toBe('etat_acces');
    expect(orienterPiece('LECTURE_SEULE', tout).cause).toBe('etat_acces');
    expect(orienterPiece('ACTIF', tout)).toEqual({ orientation: 'en_attente', cause: 'plafond_technique' });
    expect(orienterPiece('ACTIF', { plafondTechniqueAtteint: false, enAttenteVolume: true })).toEqual({ orientation: 'en_attente', cause: 'volume' });
    expect(code(() => orienterPiece('' as EtatAcces, LIBRE))).toBe('etat_voulu_invalide');
    expect(ETATS_ACCES).toHaveLength(6);
  });

  it('meme-empreinte-deux-societes-pas-doublon', () => {
    const file = [piece('a', 'a', 1, 'Societe Un'), piece('b', 'a', 2, 'Societe Deux')];
    const r = reprendre(file, new Set());
    expect(r.aTraiter.map((p) => p.id)).toEqual(['a', 'b']);
    expect(r.doublons).toEqual([]);
    expect(cleDePiece('S', emp('a'))).toBe('S:' + emp('a'));
    expect(cleDePiece('S', emp('a'))).not.toBe(cleDePiece('T', emp('a')));
  });

  it('doublon-dans-la-file-et-deja-traite', () => {
    const file = [piece('c', 'b', 3), piece('a', 'a', 1), piece('b', 'a', 2), piece('d', 'c', 2)];
    const r = reprendre(file, new Set([cleDePiece('Societe Test', emp('c'))]));
    expect(r.aTraiter.map((p) => p.id)).toEqual(['a', 'c']);
    expect(r.doublons.sort()).toEqual(['b', 'd']);
    expect(r.aTraiter.length + r.doublons.length).toBe(file.length);
    const egal = reprendre([piece('z', 'a', 1), piece('y', 'b', 1)], new Set());
    expect(egal.aTraiter.map((p) => p.id)).toEqual(['y', 'z']);
  });

  it('file-vide-resume-zero', () => {
    expect(reprendre([], new Set())).toEqual({ aTraiter: [], doublons: [], resume: { piecesTraitees: 0 } });
  });

  it('horodatage-ou-empreinte-invalide-refuse', () => {
    const ok = piece('a', 'a', 1);
    expect(code(() => reprendre([{ ...ok, empreinte: 'xyz' }], new Set()))).toBe('empreinte_invalide');
    expect(code(() => reprendre([{ ...ok, recueLe: '2030-13-01T00:00:00Z' }], new Set()))).toBe('horodatage_invalide');
    expect(code(() => reprendre([{ ...ok, id: '' }], new Set()))).toBe('parametre_invalide');
    expect(code(() => reprendre([{ ...ok, societe: '' }], new Set()))).toBe('parametre_invalide');
  });
});
