import { describe, expect, it } from 'vitest';
import { empreinteChainee, empreinteInitiale } from '../canonique.js';
import { ajouterEntree, ajouterLot, teteInitiale, type Brouillon, type EntreeJournal } from '../chaine.js';
import { verifierChaine } from '../verifier.js';

const T0 = '2026-01-05T08:00:00.000Z';
const N = 1000;
const MILIEU = 500;
const brouillon = (i: number, societeId = 'A'): Brouillon => ({
  societeId,
  horodatage: T0,
  acteur: 'marie@exemple.fr',
  canal: 'clic',
  evenement: 'ecriture.creee',
  motif: `saisie ${i}`,
  apres: { ligne: i },
});
const lot = ajouterLot(teteInitiale('A', T0), Array.from({ length: N }, (_, i) => brouillon(i)));
const base = (): EntreeJournal[] => structuredClone(lot.entrees);
const sansEmpreinte = (e: EntreeJournal) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== 'empreinte')) as Omit<EntreeJournal, 'empreinte'>;
const params = { societeId: 'A', creeLe: T0 };
const rompu = (defaut: string, sequence: number) => ({ ok: false, defaut, sequence, evenement: 'audit.chaine_rompue' });
const tete = (sequence: number) => ({ sequence, empreinte: sequence === 0 ? empreinteInitiale('A', T0) : lot.entrees[sequence - 1]!.empreinte });

describe('journal : vérificateur indépendant', () => {
  it('mille-entrees-intactes-ok', () => {
    const entrees = base();
    const copie = structuredClone(entrees);
    expect(lot.entrees).toHaveLength(N);
    expect(verifierChaine(entrees, params)).toEqual({ ok: true, tete: lot.tete });
    expect(verifierChaine(entrees, { ...params, teteSignee: tete(N) })).toEqual({ ok: true, tete: lot.tete });
    expect(verifierChaine(entrees, { ...params, teteSignee: tete(MILIEU) }).ok).toBe(true);
    expect(entrees).toEqual(copie);
  });

  it('ligne-modifiee-detectee', () => {
    const e = base();
    e[MILIEU - 1] = { ...e[MILIEU - 1]!, motif: 'autre motif' };
    expect(verifierChaine(e, params)).toEqual(rompu('modifiee', MILIEU));
    const f = base();
    f[MILIEU - 1] = { ...f[MILIEU - 1]!, empreinte: 'b'.repeat(64) };
    expect(verifierChaine(f, params)).toEqual(rompu('modifiee', MILIEU));
    // contenu et empreinte falsifiés ensemble : le maillon suivant casse
    const g = base();
    const contenu = sansEmpreinte({ ...g[MILIEU - 1]!, motif: 'truqué' });
    g[MILIEU - 1] = { ...contenu, empreinte: empreinteChainee(contenu.empreintePrecedente, contenu) };
    expect(verifierChaine(g, params)).toEqual(rompu('modifiee', MILIEU + 1));
    const h = base();
    h[0] = { ...h[0]!, empreintePrecedente: 'c'.repeat(64) };
    expect(verifierChaine(h, params)).toEqual(rompu('modifiee', 1));
    // lien falsifié mais empreinte recalculée en cohérence : le lien est vérifié à part
    const c1 = sansEmpreinte({ ...base()[0]!, empreintePrecedente: 'c'.repeat(64) });
    expect(verifierChaine([{ ...c1, empreinte: empreinteChainee(empreinteInitiale('A', T0), c1) }], params)).toEqual(rompu('modifiee', 1));
  });

  it('entrees-abimees-detectees', () => {
    for (const mauvais of [null, 'x', 7, undefined]) {
      expect(verifierChaine([mauvais as unknown as EntreeJournal], params)).toEqual(rompu('modifiee', 1));
    }
    for (const seq of [Number.NaN, Infinity, 0.5, '1', undefined]) {
      const e = base();
      e[0] = { ...e[0]!, sequence: seq as unknown as number };
      expect(verifierChaine(e, params)).toEqual(rompu('modifiee', 1));
    }
    const flottant = base();
    flottant[0] = { ...flottant[0]!, apres: { ligne: 1.5 } };
    expect(verifierChaine(flottant, params)).toEqual(rompu('modifiee', 1));
    expect(() => verifierChaine('x' as unknown as EntreeJournal[], params)).toThrowError();
    expect(() => verifierChaine([], { societeId: '', creeLe: T0 })).toThrowError();
    expect(() => verifierChaine([], { societeId: 'A', creeLe: '' })).toThrowError();
  });

  it('ligne-supprimee-detectee', () => {
    const e = base();
    e.splice(MILIEU - 1, 1);
    expect(verifierChaine(e, params)).toEqual(rompu('supprimee', MILIEU));
    const debut = base();
    debut.shift();
    expect(verifierChaine(debut, params)).toEqual(rompu('supprimee', 1));
    const fin = base();
    fin.pop();
    expect(verifierChaine(fin, { ...params, teteSignee: tete(N) })).toEqual(rompu('fin_tronquee', N - 1));
  });

  it('ligne-inseree-detectee', () => {
    const avant = ajouterLot(teteInitiale('A', T0), Array.from({ length: MILIEU - 1 }, (_, i) => brouillon(i)));
    const valide = ajouterEntree(avant.tete, brouillon(0)).entree;
    const e = base();
    e.splice(MILIEU - 1, 0, valide);
    expect(verifierChaine(e, params)).toEqual(rompu('inseree', MILIEU));
    const doublon = base();
    doublon.splice(MILIEU, 0, structuredClone(doublon[MILIEU - 1]!));
    expect(verifierChaine(doublon, params)).toEqual(rompu('inseree', MILIEU));
    const apres = base();
    apres.push({ ...apres[N - 1]!, sequence: N + 1 });
    expect(verifierChaine(apres, params)).toEqual(rompu('modifiee', N + 1));
  });

  it('ordre-inverse-detecte', () => {
    expect(verifierChaine(base().reverse(), params).ok).toBe(false);
    const e = base();
    [e[1], e[2]] = [e[2]!, e[1]!];
    expect(verifierChaine(e, params)).toEqual(rompu('supprimee', 2));
    const trois = base().slice(0, 3);
    [trois[0], trois[1]] = [trois[1]!, trois[0]!];
    expect(verifierChaine(trois, params).ok).toBe(false);
  });

  it('fin-tronquee-detectee', () => {
    const coupe = base().slice(0, 900);
    expect(verifierChaine(coupe, { ...params, teteSignee: tete(N) })).toEqual(rompu('fin_tronquee', 900));
    expect(verifierChaine(coupe, params).ok).toBe(true);
    expect(verifierChaine([], { ...params, teteSignee: tete(1) })).toEqual(rompu('fin_tronquee', 0));
  });

  it('tete-divergente-detectee', () => {
    const fausse = { sequence: N, empreinte: 'd'.repeat(64) };
    expect(verifierChaine(base(), { ...params, teteSignee: fausse })).toEqual(rompu('tete_divergente', N));
    expect(verifierChaine(base(), { ...params, teteSignee: { sequence: MILIEU, empreinte: 'd'.repeat(64) } })).toEqual(
      rompu('tete_divergente', MILIEU),
    );
    expect(verifierChaine(base(), { ...params, teteSignee: { sequence: MILIEU, empreinte: tete(N).empreinte } }).ok).toBe(false);
    for (const s of [Number.NaN, Infinity, -1, 1.5, '3', undefined]) {
      const teteSignee = { sequence: s as unknown as number, empreinte: tete(N).empreinte };
      expect(verifierChaine(base(), { ...params, teteSignee })).toEqual(rompu('tete_divergente', N));
    }
    expect(verifierChaine(base(), { ...params, teteSignee: null as unknown as { sequence: number; empreinte: string } })).toEqual(rompu('tete_divergente', N));
  });

  it('autre-societe-detectee', () => {
    const e = base();
    const etrangere = ajouterEntree(teteInitiale('B', T0), brouillon(0, 'B')).entree;
    e[MILIEU - 1] = { ...etrangere, sequence: MILIEU };
    expect(verifierChaine(e, params)).toEqual(rompu('societe_melangee', MILIEU));
    const b = ajouterLot(teteInitiale('B', T0), [brouillon(0, 'B')]);
    expect(verifierChaine(b.entrees, params)).toEqual(rompu('societe_melangee', 1));
    expect(verifierChaine(b.entrees, { societeId: 'B', creeLe: T0 })).toEqual({ ok: true, tete: b.tete });
    expect(verifierChaine(base(), { societeId: 'C', creeLe: T0 }).ok).toBe(false);
    expect(verifierChaine(base(), { societeId: 'A', creeLe: '2026-02-01T00:00:00.000Z' })).toEqual(rompu('modifiee', 1));
  });

  it('vide-ok', () => {
    const initiale = { societeId: 'A', sequence: 0, empreinte: empreinteInitiale('A', T0) };
    expect(verifierChaine([], params)).toEqual({ ok: true, tete: initiale });
    expect(verifierChaine([], { ...params, teteSignee: tete(0) })).toEqual({ ok: true, tete: initiale });
    expect(verifierChaine([], { ...params, teteSignee: { sequence: 0, empreinte: 'e'.repeat(64) } })).toEqual(
      rompu('tete_divergente', 0),
    );
  });
});
