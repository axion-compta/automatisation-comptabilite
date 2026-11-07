import { describe, expect, it } from 'vitest';
import { normaliserEmail, normaliserIban, normaliserNom, rechercherPersonne, type Collections } from '../recherche-personne.js';
import { ErreurRgpd } from '../types.js';

const vide = (): Collections => ({ tiers: [], pieces: [], ecritures: [], conversations: [] });
function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurRgpd ? e.code : 'autre';
  }
  return undefined;
}
function ibanFictif(): string {
  const base = 'FR76' + '3000'.repeat(2) + '1'.repeat(11) + '2'.repeat(2);
  return base;
}

describe('recherche-personne', () => {
  it('t-exp-7-douze-pieces', () => {
    const c = vide();
    for (let i = 0; i < 30; i++) {
      c.pieces.push({ id: `p${String(i).padStart(2, '0')}`, texteLu: i < 12 ? `Facture de Camille Exemple n°${i}` : `Facture de Société Exemple n°${i}` });
    }
    const r = rechercherPersonne({ nom: 'Camille Exemple' }, c);
    expect(r).toHaveLength(12);
    expect(r.every((x) => x.source === 'pieces' && x.par === 'nom')).toBe(true);
    expect(r.map((x) => x.id)).toEqual(Array.from({ length: 12 }, (_, i) => `p${String(i).padStart(2, '0')}`));
  });

  it('nom-sans-casse-ni-accent', () => {
    const c = vide();
    c.tiers.push({ id: 't1', nom: 'Hélène Éxemple-Dupont' });
    c.ecritures.push({ id: 'e1', libelle: "Remboursement d'HELENE EXEMPLE DUPONT, avril" });
    expect(rechercherPersonne({ nom: 'helene exemple dupont' }, c).map((x) => x.id)).toEqual(['e1', 't1']);
    expect(normaliserNom("  Jean--Éric   D'Exemple ")).toBe('jean eric d exemple');
  });

  it('mot-entier-seulement', () => {
    const c = vide();
    c.pieces.push({ id: 'a', texteLu: 'Client Martineau' }, { id: 'b', texteLu: 'Client Martin' }, { id: 'c', texteLu: 'Dumartin' });
    expect(rechercherPersonne({ nom: 'Martin' }, c).map((x) => x.id)).toEqual(['b']);
  });

  it('email-exact-sur-le-tiers', () => {
    const c = vide();
    c.tiers.push({ id: 't1', nom: 'Un', email: ' Camille@Exemple.fr ' }, { id: 't2', nom: 'Deux', email: 'camille@exemple.fr' + '.x' });
    c.conversations.push({ id: 'v1', texte: 'Écrire à CAMILLE@exemple.fr demain' });
    const r = rechercherPersonne({ email: 'camille@exemple.fr' }, c);
    expect(r).toEqual([{ source: 'conversations', id: 'v1', par: 'email' }, { source: 'tiers', id: 't1', par: 'email' }]);
    expect(normaliserEmail('  A@Exemple.fr ')).toBe('a@exemple.fr');
  });

  it('iban-avec-ou-sans-espaces', () => {
    const iban = ibanFictif();
    const espace = iban.replace(/(.{4})/g, '$1 ').trim();
    const c = vide();
    c.tiers.push({ id: 't1', nom: 'Un', iban: espace.toLowerCase() });
    c.pieces.push({ id: 'p1', texteLu: `Virement vers ${espace}` });
    c.ecritures.push({ id: 'e1', libelle: 'sans rapport' });
    expect(rechercherPersonne({ iban }, c).map((x) => `${x.source}:${x.id}`)).toEqual(['pieces:p1', 'tiers:t1']);
    expect(rechercherPersonne({ iban: espace }, c)).toHaveLength(2);
    expect(normaliserIban(' fr76 30 ')).toBe('FR7630');
  });

  it('un-objet-une-fois', () => {
    const c = vide();
    c.tiers.push({ id: 't1', nom: 'Camille Exemple', email: 'camille@exemple.fr' });
    c.pieces.push({ id: 'p1', texteLu: 'Camille Exemple camille@exemple.fr' });
    const r = rechercherPersonne({ nom: 'Camille Exemple', email: 'camille@exemple.fr' }, c);
    expect(r).toEqual([{ source: 'pieces', id: 'p1', par: 'nom' }, { source: 'tiers', id: 't1', par: 'nom' }]);
    const r2 = rechercherPersonne({ email: 'camille@exemple.fr', iban: ibanFictif() }, c);
    expect(r2.map((x) => x.par)).toEqual(['email', 'email']);
  });

  it('recherche-vide-refusee', () => {
    const c = vide();
    expect(code(() => rechercherPersonne({}, c))).toBe('recherche_vide');
    expect(code(() => rechercherPersonne({ nom: '   ', email: ' ', iban: '  ' }, c))).toBe('recherche_vide');
    expect(code(() => rechercherPersonne({ nom: '' }, c))).toBe('recherche_vide');
  });

  it('nom-trop-court-refuse', () => {
    const c = vide();
    expect(code(() => rechercherPersonne({ nom: 'Al' }, c))).toBe('recherche_trop_courte');
    expect(code(() => rechercherPersonne({ nom: ' É- ' }, c))).toBe('recherche_trop_courte');
    expect(code(() => rechercherPersonne({ nom: 'Léa' }, c))).toBeUndefined();
  });

  it('caracteres-speciaux-sans-danger', () => {
    const c = vide();
    c.pieces.push({ id: 'p1', texteLu: 'Texte (a) avec [a-z]+ et .* dedans' }, { id: 'p2', texteLu: 'rien' });
    expect(code(() => rechercherPersonne({ nom: '[a-z]+' }, c))).toBeUndefined();
    expect(rechercherPersonne({ email: '.*' }, c).map((x) => x.id)).toEqual(['p1']);
    expect(rechercherPersonne({ email: '(' }, c).map((x) => x.id)).toEqual(['p1']);
    expect(rechercherPersonne({ iban: '[A-Z]+' }, c)).toEqual([{ source: 'pieces', id: 'p1', par: 'iban' }]);
    expect(rechercherPersonne({ nom: 'a.b*c' }, c)).toEqual([]);
  });
});
