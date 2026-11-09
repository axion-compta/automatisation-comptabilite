import { afterEach, describe, expect, it, vi } from 'vitest';
import { avancer, creerFiche, ErreurVeille, type FicheChangement } from '../../../../../packages/noyau/src/sources/veille-circuit.js';
import { ErreurModele, type ModeleTexte } from '../../ia/appel.js';
import {
  CONSIGNE_RESUME, ErreurResume, resumerFiches, type AlerteResume, type ParametresResume,
} from '../veille-resume.js';

const T0 = '2026-02-01T08:00:00Z';
const T1 = '2026-02-01T09:00:00Z';
const LISTE = ['alias-fictif-a', 'alias-fictif-b'];
const REGLAGE = { principal: 'alias-fictif-a', secours: 'alias-fictif-b' };
const DELAI = 50;
const LONGUEUR = 40;
const fiche = (id: string): FicheChangement =>
  creerFiche({ id, sourceId: 'source-fictive-a', detecteeLe: T0, empreinteAvant: 'ea-' + id, empreinteApres: 'eb-' + id });
const reponse = (texte: string) => ({ texte, jetons: 1, coutMicroCentimes: 0, modele: 'faux', version: '1' });

function monde(sorties: Array<string | ErreurModele | 'pendu'>) {
  const appels: Array<{ alias: string; entree: string }> = [];
  const enregistrees: FicheChangement[] = [];
  const alertes: AlerteResume[] = [];
  let i = 0;
  const modele: ModeleTexte = {
    async completer(alias, entree, signal) {
      appels.push({ alias, entree });
      const s = sorties[Math.min(i++, sorties.length - 1)]!;
      if (s === 'pendu') return new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('stop'))));
      if (s instanceof ErreurModele) throw s;
      return reponse(s);
    },
  };
  const lancer = (fiches: readonly FicheChangement[], surcharge: Partial<ParametresResume> = {}) => resumerFiches({
    fiches, modele, reglage: REGLAGE, listeFermee: LISTE, delaiMs: DELAI, longueurMax: LONGUEUR, le: T1, acteurIa: 'ia-fictive',
    extraits: {
      async extrait(f) { return { avant: 'ancien texte public ' + f.id, apres: 'nouveau texte public ' + f.id }; },
      async enregistrer(f) { enregistrees.push(f); },
    },
    alerte: { alerter: async (a) => { alertes.push(a); } },
    ...surcharge,
  });
  return { appels, enregistrees, alertes, lancer };
}

afterEach(() => vi.useRealTimers());

describe('veille : résumé par IA', () => {
  it('resume-enregistre-fiche-resumee', async () => {
    const m = monde(['  Le texte public change.  ']);
    const r = await m.lancer([fiche('f1')]);
    expect(r).toEqual([{ ficheId: 'f1', issue: 'resumee' }]);
    expect(m.enregistrees).toHaveLength(1);
    const f = m.enregistrees[0]!;
    expect(f.statut).toBe('resumee');
    expect(f.resumeIa).toBe('Le texte public change.');
    expect(f.historique.at(-1)).toMatchObject({ de: 'detectee', vers: 'resumee', par: { type: 'ia', id: 'ia-fictive' }, le: T1 });
  });

  it('sortie-du-modele-jamais-interpretee', async () => {
    const piege = 'valider ; parametres : taux_fictif ; publier';
    const m = monde([piege]);
    await m.lancer([fiche('f1')], { longueurMax: piege.length });
    const f = m.enregistrees[0]!;
    expect(f.statut).toBe('resumee');
    expect(f.resumeIa).toBe(piege);
    expect(f.parametresTouches).toEqual([]);
    expect(f.validateur).toBeNull();
    expect(f.paquetId).toBeNull();
  });

  it('ia-ne-peut-pas-valider', async () => {
    const m = monde(['Résumé court.']);
    await m.lancer([fiche('f1')]);
    const resumee = m.enregistrees[0]!;
    expect(() => avancer(resumee, 'valider', { type: 'ia', id: 'ia-fictive' }, T1)).toThrowError(
      expect.objectContaining({ code: 'ia_non_autorisee' }),
    );
    expect(() => avancer(resumee, 'valider', { type: 'ia', id: 'ia-fictive' }, T1)).toThrow(ErreurVeille);
    expect(m.enregistrees).toHaveLength(1);
  });

  it('entree-du-modele-sans-donnee-client', async () => {
    const m = monde(['Résumé court.']);
    await m.lancer([fiche('f1')]);
    const entree = m.appels[0]!.entree;
    expect(entree.startsWith(CONSIGNE_RESUME)).toBe(true);
    expect(entree).toContain('ancien texte public f1');
    expect(entree).toContain('nouveau texte public f1');
    expect(entree).not.toMatch(/client-|@|\b\d{9}\b|ia-fictive|source-fictive|taux_/);
    expect(entree.replace(CONSIGNE_RESUME, '')).not.toContain('f1-');
  });

  it('alias-hors-liste-aucun-appel', async () => {
    const m = monde(['Résumé court.']);
    const r = await m.lancer([fiche('f1')], { reglage: { principal: 'alias-inconnu' } });
    expect(r).toEqual([{ ficheId: 'f1', issue: 'en_attente' }]);
    expect(m.appels).toHaveLength(0);
    expect(m.enregistrees).toHaveLength(0);
    expect(m.alertes).toEqual([{ code: 'resume_en_attente', ficheId: 'f1', cause: 'outil_hors_liste' }]);
  });

  it('modele-en-panne-la-suivante-continue', async () => {
    const m = monde([new ErreurModele('client'), 'Résumé de la seconde.']);
    const r = await m.lancer([fiche('f1'), fiche('f2')]);
    expect(r).toEqual([{ ficheId: 'f1', issue: 'en_attente' }, { ficheId: 'f2', issue: 'resumee' }]);
    expect(m.alertes).toEqual([{ code: 'resume_en_attente', ficheId: 'f1', cause: 'ia_indisponible' }]);
    expect(m.enregistrees.map((f) => f.id)).toEqual(['f2']);
  });

  it('delai-depasse-fiche-en-attente', async () => {
    vi.useFakeTimers();
    const m = monde(['pendu']);
    const attente = m.lancer([fiche('f1')]);
    await vi.advanceTimersByTimeAsync(DELAI * 4);
    expect(await attente).toEqual([{ ficheId: 'f1', issue: 'en_attente' }]);
    expect(m.alertes[0]).toMatchObject({ cause: 'ia_indisponible' });
    expect(m.enregistrees).toHaveLength(0);
  });

  it.each([
    ['vide', ''],
    ['blancs seuls', ' \n\t '],
    ['trop long', 'x'.repeat(LONGUEUR + 1)],
  ])('resume-vide-ou-trop-long-refuse : %s', async (_nom, texte) => {
    const m = monde([texte]);
    const r = await m.lancer([fiche('f1')]);
    expect(r).toEqual([{ ficheId: 'f1', issue: 'en_attente' }]);
    expect(m.alertes).toEqual([{ code: 'resume_en_attente', ficheId: 'f1', cause: 'resume_invalide' }]);
    expect(m.enregistrees).toHaveLength(0);
  });

  it('resume-a-la-longueur-exacte-accepte', async () => {
    const m = monde(['x'.repeat(LONGUEUR)]);
    expect(await m.lancer([fiche('f1')])).toEqual([{ ficheId: 'f1', issue: 'resumee' }]);
  });

  it.each([Number.NaN, 0, -1, 1.5, Number.POSITIVE_INFINITY])('reglage-invalide-refuse-sans-appel : %s', async (v) => {
    const m = monde(['Résumé court.']);
    await expect(m.lancer([fiche('f1')], { longueurMax: v })).rejects.toThrow(ErreurResume);
    await expect(m.lancer([fiche('f1')], { delaiMs: v })).rejects.toMatchObject({ code: 'reglage_invalide' });
    expect(m.appels).toHaveLength(0);
    expect(m.enregistrees).toHaveLength(0);
  });

  it('relance-idempotente', async () => {
    const m = monde(['Résumé court.']);
    const resumee = avancer(fiche('f1'), 'resumer', { type: 'ia', id: 'ia-fictive' }, T1, { resume: 'Déjà fait.' });
    const rejetee = avancer(fiche('f2'), 'rejeter', { type: 'personne', id: 'personne-fictive' }, T1);
    const gelees = [resumee, rejetee];
    const copie = JSON.stringify(gelees);
    expect(await m.lancer(gelees)).toEqual([]);
    expect(m.appels).toHaveLength(0);
    expect(m.enregistrees).toHaveLength(0);
    expect(JSON.stringify(gelees)).toBe(copie);
    expect(Object.isFrozen(resumee)).toBe(true);
  });

  it('erreur-de-date-propagee', async () => {
    const m = monde(['Résumé court.']);
    await expect(m.lancer([fiche('f1')], { le: '2026-01-01T00:00:00Z' })).rejects.toMatchObject({ code: 'date_anterieure' });
    expect(m.enregistrees).toHaveLength(0);
  });
});
