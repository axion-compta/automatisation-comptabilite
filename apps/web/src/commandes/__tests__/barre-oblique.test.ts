// Fiche L05-T51 : commandes « / » déterministes, sans modèle.
import { describe, expect, it } from 'vitest';
import { NOMS_OUTILS } from '../../../../../packages/contrat/src/chat/outils.js';
import { destinations } from '../aller.js';
import { analyser, COMMANDES, suggestions } from '../barre-oblique.js';

const NOMS = ['importer', 'valider-lot', 'rapprocher', 'vue', 'annuler', 'exporter', 'aide'];
const parNom = (nom: string) => COMMANDES.find((c) => c.nom === nom);

describe('barre oblique', () => {
  it('sept-commandes', () => {
    expect(COMMANDES.map((c) => c.nom).sort()).toEqual([...NOMS].sort());
    expect(new Set(COMMANDES.map((c) => c.nom)).size).toBe(COMMANDES.length);
    expect(parNom('aller')).toBeUndefined();
  });

  it('outils-declares-ou-destination', () => {
    for (const c of COMMANDES) {
      if (c.outil !== undefined) expect(NOMS_OUTILS).toContain(c.outil);
      else expect(destinations.map((d) => d.id)).toContain(c.destination);
    }
    expect(COMMANDES.some((c) => c.outil !== undefined)).toBe(true);
    expect(COMMANDES.some((c) => c.outil === undefined)).toBe(true);
  });

  it('analyse-avec-arguments', () => {
    expect(analyser('/vue ecritures 2030')).toEqual({ commande: parNom('vue'), arguments: ['ecritures', '2030'] });
    expect(analyser('/aide')).toEqual({ commande: parNom('aide'), arguments: [] });
    expect(analyser('/exporter Fec')).toEqual({ commande: parNom('exporter'), arguments: ['Fec'] });
  });

  it('casse-et-espaces', () => {
    expect(analyser('  /VUE    plan \t 2030  ')).toEqual({ commande: parNom('vue'), arguments: ['plan', '2030'] });
    expect(analyser('/Valider-Lot')).toEqual({ commande: parNom('valider-lot'), arguments: [] });
  });

  it('commande-inconnue', () => {
    expect(analyser('/zzz a b')).toEqual({ inconnue: 'zzz' });
    expect(analyser('/Vu')).toEqual({ inconnue: 'vu' });
    expect(analyser('/vue2')).toEqual({ inconnue: 'vue2' });
  });

  it('sans-barre-null', () => {
    for (const s of ['vue', 'bonjour /vue', 'ouvre la banque', '.vue', '\\vue']) expect(analyser(s)).toBeNull();
    for (const s of [undefined, null, 3, Number.NaN, Infinity, {}]) expect(analyser(s as unknown as string)).toBeNull();
  });

  it('aller-non-capture', () => {
    for (const s of ['/aller banque', '/ALLER', '/aller']) expect(analyser(s)).toBeNull();
  });

  it('suggestions-triees', () => {
    expect(suggestions('').map((c) => c.nom)).toEqual([...NOMS].sort());
    expect(suggestions('/').map((c) => c.nom)).toEqual([...NOMS].sort());
    expect(suggestions('/V').map((c) => c.nom)).toEqual(['valider-lot', 'vue']);
    expect(suggestions('e').map((c) => c.nom)).toEqual(['exporter']);
    expect(suggestions('/zzz')).toEqual([]);
    expect(suggestions(undefined as unknown as string)).toEqual([]);
    expect(suggestions('/vue ').map((c) => c.nom)).toEqual([]);
  });

  it('saisie-vide-ou-barre-seule', () => {
    for (const s of ['', ' ', '\t\n']) expect(analyser(s)).toBeNull();
    for (const s of ['/', '/   ', '  /']) expect(analyser(s)).toEqual({ inconnue: '' });
  });
});
