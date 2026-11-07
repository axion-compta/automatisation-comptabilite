import { describe, expect, it } from 'vitest';
import { SORTES_AGENT, niveauxPermisAgent, verifierOutil, type EntreeOutil } from '../gardien-sortie.js';

const base: EntreeOutil = {
  outil: 'lire_ecriture',
  niveauOutil: 'L',
  sorteAgent: 'specialiste',
  outilsPermisAgent: ['lire_ecriture', 'classer_ecriture', 'appliquer', 'outil_i'],
  roleLectureSeule: false,
};
const verif = (patch: Partial<Record<keyof EntreeOutil, unknown>>) => verifierOutil({ ...base, ...patch } as EntreeOutil);
const REFUS_LISTE = { permis: false, code: 'outil_hors_liste' };
const REFUS_DROIT = { permis: false, code: 'droit_insuffisant' };

describe('gardien-sortie', () => {
  it('outil-permis', () => {
    expect(verif({})).toEqual({ permis: true });
    expect(verif({ outil: 'classer_ecriture', niveauOutil: 'B' })).toEqual({ permis: true });
    expect(verif({ sorteAgent: 'chat', outil: 'classer_ecriture', niveauOutil: 'B' })).toEqual({ permis: true });
    expect(verif({ sorteAgent: 'directeur' })).toEqual({ permis: true });
    expect(SORTES_AGENT).toEqual(['chat', 'specialiste', 'chef_pole', 'directeur', 'lecteur']);
    expect(niveauxPermisAgent('chat')).toEqual(['L', 'B']);
    expect(niveauxPermisAgent('specialiste')).toEqual(['L', 'B']);
  });
  it('outil-absent-de-la-liste', () => {
    expect(verif({ outil: 'autre_outil' })).toEqual(REFUS_LISTE);
    expect(verif({ outil: 'LIRE_ECRITURE' })).toEqual(REFUS_LISTE);
    expect(verif({ outil: '' })).toEqual(REFUS_LISTE);
  });
  it('appliquer-toujours-refuse', () => {
    for (const outil of ['appliquer', 'Appliquer', 'APPLIQUER', ' appliquer ']) {
      for (const sorteAgent of SORTES_AGENT) {
        expect(verif({ outil, sorteAgent, niveauOutil: 'B', outilsPermisAgent: [outil] }), `${outil}/${sorteAgent}`).toEqual(REFUS_LISTE);
      }
    }
  });
  it('niveau-i-toujours-refuse', () => {
    for (const sorteAgent of SORTES_AGENT) {
      expect(verif({ outil: 'outil_i', niveauOutil: 'I', sorteAgent })).toEqual(REFUS_LISTE);
    }
    expect(verif({ outil: 'outil_m', niveauOutil: 'M', outilsPermisAgent: ['outil_m'] })).toEqual(REFUS_DROIT);
  });
  it('chef-de-pole-lecture-seulement', () => {
    expect(niveauxPermisAgent('chef_pole')).toEqual(['L']);
    expect(niveauxPermisAgent('directeur')).toEqual(['L']);
    for (const sorteAgent of ['chef_pole', 'directeur']) {
      expect(verif({ sorteAgent, outil: 'classer_ecriture', niveauOutil: 'B' })).toEqual(REFUS_DROIT);
      expect(verif({ sorteAgent })).toEqual({ permis: true });
    }
  });
  it('lecteur-sans-outil', () => {
    expect(niveauxPermisAgent('lecteur')).toEqual([]);
    expect(verif({ sorteAgent: 'lecteur' })).toEqual(REFUS_DROIT);
    expect(verif({ sorteAgent: 'inconnue' })).toEqual(REFUS_DROIT);
    expect(niveauxPermisAgent('inconnue' as never)).toEqual([]);
  });
  it('role-lecture-seule-refuse', () => {
    expect(verif({ roleLectureSeule: true, outil: 'classer_ecriture', niveauOutil: 'B' })).toEqual(REFUS_DROIT);
    expect(verif({ roleLectureSeule: true })).toEqual({ permis: true });
    expect(verif({ roleLectureSeule: 'oui' })).toEqual(REFUS_DROIT);
    expect(verif({ roleLectureSeule: undefined })).toEqual(REFUS_DROIT);
  });
  it('liste-vide', () => {
    expect(verif({ outilsPermisAgent: [] })).toEqual(REFUS_LISTE);
    expect(verif({ outilsPermisAgent: undefined })).toEqual(REFUS_LISTE);
    expect(verif({ outilsPermisAgent: 'lire_ecriture' })).toEqual(REFUS_LISTE);
  });
  it('niveau-inconnu-refuse', () => {
    for (const niveauOutil of ['', 'X', undefined, null, 'l', 3]) {
      expect(verif({ niveauOutil }), String(niveauOutil)).toEqual(REFUS_LISTE);
    }
  });
});
