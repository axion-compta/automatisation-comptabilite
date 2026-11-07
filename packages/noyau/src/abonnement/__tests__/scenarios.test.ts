// Scénarios T-ABO-1 à T-ABO-16 de la spec 07 rejoués bout à bout sur les fonctions pures. Données fictives.
import { describe, expect, it } from 'vitest';
import { enregistrerAccuse, enregistrerRemise, peutDemanderEffacement, relancesDues } from '../fin-contrat.js';
import type { ParametresFinContrat } from '../fin-contrat.js';
import { autoriser } from '../garde.js';
import { leverGel, poserGel } from '../gel.js';
import { demanderPalier } from '../paliers.js';
import type { Palier } from '../paliers.js';
import { compterPiecesTraitees } from '../compteur.js';
import { orienterPiece, reprendre } from '../pieces.js';
import type { PieceEnAttente } from '../pieces.js';
import { etatQuota, libererAttenteVolume, plafondTechniqueAtteint } from '../quota.js';
import { nouvellesAlertes } from '../seuils.js';
import { contenuBanniere } from '../etats.js';
import { recevoirEtatVoulu } from '../transitions.js';
import type { ContexteReception, EtatAccesCourant } from '../transitions.js';
import { ETATS_ACCES, ErreurAbonnement, ajouterJours } from '../types.js';
import type { EtatAcces, EtatVoulu, EvenementJournal, FinContrat } from '../types.js';

// Constantes de scénario (valeurs de la spec, jamais répétées dans les cas).
const VOLUME = 100;
const SEUIL_BPS = 7000;
const JOUR_RAPPEL = 23;
const JOURS_ATTENTE = 30;
const RELANCES = [7, 14, 30];
const NB_PIECES_PAUSE = 20;
const NB_JOURS_BOUCLE = 60;
const MOIS = '2026-03';
const AUJOURDHUI = '2026-03-01';
const H = '2026-03-01T09:00:00Z';
const EMPREINTE = 'a'.repeat(64);
const AUTRE_EMPREINTE = 'b'.repeat(64);
const PARAMS: ParametresFinContrat = {
  joursAvantEffacement: JOURS_ATTENTE, joursRappelAvantEffacement: JOUR_RAPPEL, joursRelancesSansAccuse: RELANCES,
};
const CTX: ContexteReception = { horodatage: H, aujourdhui: AUJOURDHUI, source: 'console', auteur: 'Axion Test', branche: true };
const voulu = (etat: EtatVoulu['etat'], version: number): EtatVoulu => ({ etat, version, arretEnvois: false });
const FIN0: FinContrat = {
  dateFin: null, remisLe: null, manifesteEmpreinte: null, accuseLe: null, accusePar: null,
  gelModule: { actif: false, motif: null, posePar: null, poseLe: null }, gelConsole: false,
};
const OPTIONS = { plafondTechniqueAtteint: false, enAttenteVolume: false };

function pieces(n: number): PieceEnAttente[] {
  return Array.from({ length: n }, (_, i) => ({
    id: 'p' + String(i), societe: 'A', empreinte: i.toString(16).padStart(64, '0'),
    recueLe: '2026-01-' + String(10 + (n - i)).padStart(2, '0') + 'T08:00:00Z',
  }));
}

// Remise puis accusé le 1er mars (client X).
function accuse(): FinContrat {
  const r = enregistrerRemise(FIN0, { manifesteEmpreinte: EMPREINTE, horodatage: '2026-02-28T10:00:00Z' });
  return enregistrerAccuse(r.fin, { empreinteRecue: EMPREINTE, auteur: 'Admin X', horodatage: H }).fin;
}

describe('scénarios T-ABO', () => {
  it('T-ABO-1', () => {
    // Entrée : pause reçue, 20 pièces arrivent. Attendu : 20 en attente, 0 refusée.
    const r = recevoirEtatVoulu(null, voulu('pause', 1), CTX);
    const etat = (r.courant as EtatAccesCourant).etat;
    expect(etat).toBe('LECTURE_SEULE');
    const o = Array.from({ length: NB_PIECES_PAUSE }, () => orienterPiece(etat, OPTIONS));
    expect(o.filter((x) => x.orientation === 'en_attente')).toHaveLength(NB_PIECES_PAUSE);
    expect(o.filter((x) => x.orientation === 'refusee')).toHaveLength(0);
  });

  it('T-ABO-2', () => {
    // Entrée : reprise (actif) après la pause. Attendu : 20 traitées dans l'ordre d'arrivée, 0 doublon, 1 résumé.
    const pause = recevoirEtatVoulu(null, voulu('pause', 1), CTX);
    const r = recevoirEtatVoulu(pause.courant, voulu('actif', 2), CTX);
    expect(r.reprise).toBe(true);
    const file = pieces(NB_PIECES_PAUSE);
    const s = reprendre(file, new Set());
    expect(s.aTraiter).toHaveLength(NB_PIECES_PAUSE);
    expect(s.doublons).toHaveLength(0);
    const dates = s.aTraiter.map((p) => Date.parse(p.recueLe));
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
    expect(s.resume.piecesTraitees).toBe(NB_PIECES_PAUSE);
  });

  it('T-ABO-3', () => {
    // Entrée : 6 états × 2 exports (FEC, export complet). Attendu : 12 permis sur 12.
    const droits = ['export_fec', 'export_complet'];
    let permis = 0;
    for (const etat of ETATS_ACCES) {
      for (const fonction of droits) if (autoriser(etat, 'export', fonction, droits).permis) permis += 1;
    }
    expect(permis).toBe(ETATS_ACCES.length * droits.length);
  });

  it('T-ABO-4', () => {
    // Entrée : 4 transitions. Attendu : 4 événements, source et auteur remplis.
    const suite: EtatVoulu[] = [voulu('pause', 1), voulu('actif', 2), voulu('arrete', 3), voulu('actif', 4)];
    let courant: EtatAccesCourant | null = null;
    const evts: EvenementJournal[] = [];
    for (const v of suite) {
      const r: ReturnType<typeof recevoirEtatVoulu> = recevoirEtatVoulu(courant, v, CTX);
      courant = r.courant;
      evts.push(...r.evenements);
    }
    expect(evts).toHaveLength(suite.length);
    for (const e of evts) {
      expect(e.type).toBe('acces.etat_change');
      expect(e.donnees['source']).toBe('console');
      expect(e.donnees['auteur']).toBe('Axion Test');
    }
  });

  it('T-ABO-5', () => {
    // Entrée : version 7 reçue après la 8. Attendu : ignorée, 1 événement, état inchangé.
    const huit = recevoirEtatVoulu(null, voulu('pause', 8), CTX);
    const sept = recevoirEtatVoulu(huit.courant, voulu('actif', 7), CTX);
    expect(sept.courant).toEqual(huit.courant);
    expect(sept.evenements).toHaveLength(1);
    expect(sept.evenements[0]?.type).toBe('acces.version_ignoree');
  });

  it('T-ABO-6', () => {
    // Entrée : les 5 états non actifs. Attendu : bannière non nulle, aucun montant.
    const v = voulu('actif', 1);
    for (const etat of ETATS_ACCES.filter((e): e is EtatAcces => e !== 'ACTIF')) {
      const b = contenuBanniere(etat, v, false);
      expect(b).not.toBeNull();
      const texte = JSON.stringify(b).toLowerCase();
      for (const mot of ['montant', 'prix', '€']) expect(texte).not.toContain(mot);
    }
    expect(contenuBanniere('ACTIF', v, false)).toBeNull();
  });

  it('T-ABO-7', () => {
    // Entrée : palier de 100 pièces, 69 puis 70 puis 71. Attendu : 0, 1, aucune seconde alerte.
    const base = { compris: VOLUME, seuilsBps: [SEUIL_BPS], mois: MOIS, horodatage: H, objet: 'volume' as const };
    const a69 = nouvellesAlertes({ ...base, utilise: SEUIL_BPS / 100 - 1, dejaEmises: new Set() });
    expect(a69.alertes).toHaveLength(0);
    const a70 = nouvellesAlertes({ ...base, utilise: SEUIL_BPS / 100, dejaEmises: a69.dejaEmises });
    expect(a70.alertes).toHaveLength(1);
    const a71 = nouvellesAlertes({ ...base, utilise: SEUIL_BPS / 100 + 1, dejaEmises: a70.dejaEmises });
    expect(a71.alertes).toHaveLength(0);
  });

  it('T-ABO-8', () => {
    // Entrée : 100 pièces déjà traitées, mode continuer. Attendu : dépassé, pièce traitée, choix proposé.
    const q = etatQuota({ dejaTraitees: VOLUME, compris: VOLUME, comportement: 'continuer' });
    expect(q).toEqual({ depasse: true, enAttenteVolume: false, proposerChoix: true });
    expect(orienterPiece('ACTIF', { ...OPTIONS, enAttenteVolume: q.enAttenteVolume }).orientation).toBe('traiter');
    expect(etatQuota({ dejaTraitees: VOLUME - 1, compris: VOLUME }).depasse).toBe(false);
  });

  it('T-ABO-9', () => {
    // Entrée : même cas en mode attente. Attendu : en attente de volume, libérée au nouveau mois, ordre d'arrivée.
    const q = etatQuota({ dejaTraitees: VOLUME, compris: VOLUME, comportement: 'attente' });
    expect(q.enAttenteVolume).toBe(true);
    expect(orienterPiece('ACTIF', { ...OPTIONS, enAttenteVolume: q.enAttenteVolume })).toEqual({ orientation: 'en_attente', cause: 'volume' });
    const file = pieces(NB_PIECES_PAUSE);
    const l = libererAttenteVolume(file, new Set(), 'nouveau_mois');
    expect(l.aTraiter.map((p) => p.id)).toEqual([...file].reverse().map((p) => p.id));
    expect(libererAttenteVolume(file, new Set(), 'nouveau_palier').doublons).toHaveLength(0);
  });

  it('T-ABO-10', () => {
    // Entrée : une pièce relue 3 fois et un doublon refusé. Attendu : compteur = 1.
    const e = (type: 'proposition_prete' | 'relecture' | 'doublon_refuse', pieceId: string, h: string) => ({ pieceId, societe: 'A', type, horodatage: h });
    const evts = [
      e('proposition_prete', 'p1', '2026-03-02T08:00:00Z'), e('relecture', 'p1', '2026-03-03T08:00:00Z'),
      e('relecture', 'p1', '2026-03-04T08:00:00Z'), e('relecture', 'p1', '2026-03-05T08:00:00Z'),
      e('doublon_refuse', 'p2', '2026-03-06T08:00:00Z'),
    ];
    expect(compterPiecesTraitees(evts, MOIS).get('A')).toBe(1);
  });

  it('T-ABO-11', () => {
    // Entrée : consommation d'IA égale au plafond technique. Attendu : atteint, pièces en attente, état d'accès intact.
    const plafond = VOLUME;
    expect(plafondTechniqueAtteint(plafond - 1, plafond)).toBe(false);
    expect(plafondTechniqueAtteint(plafond, plafond)).toBe(true);
    expect(orienterPiece('ACTIF', { ...OPTIONS, plafondTechniqueAtteint: true })).toEqual({ orientation: 'en_attente', cause: 'plafond_technique' });
    expect(autoriser('ACTIF', 'lecture').permis).toBe(true);
    expect(autoriser('ACTIF', 'export').permis).toBe(true);
  });

  it('T-ABO-12', () => {
    // Entrée : demande du palier supérieur sans puis avec accord. Attendu : refus, puis 1 demande, 1 événement, palier inchangé.
    const paliers: Palier[] = [
      { code: 'compta-1', nomAffiche: 'Palier de 100 pièces', piecesParMois: VOLUME, societesMax: 2, fonctions: ['saisie'] },
      { code: 'compta-2', nomAffiche: 'Palier de 300 pièces', piecesParMois: VOLUME * 3, societesMax: 5, fonctions: ['saisie'] },
    ];
    const e = { codeActuel: 'compta-1', codeDemande: 'compta-2', paliers, auteur: 'Admin X', horodatage: H };
    expect(() => demanderPalier({ ...e, accord: false })).toThrow(ErreurAbonnement);
    const r = demanderPalier({ ...e, accord: true });
    expect(r.evenement.type).toBe('abonnement.palier_demande');
    expect(r.demande.codeDemande).toBe('compta-2');
    expect(r.palierEnVigueur).toBe('compta-1');
  });

  it('T-ABO-13', () => {
    // Entrée : remise avec une empreinte invalide. Attendu : refus ; le manifeste vérifié à 100 % attend le lot 05.
    for (const mauvaise of ['', 'xyz', 'A'.repeat(EMPREINTE.length), 'a'.repeat(EMPREINTE.length - 1)]) {
      expect(() => enregistrerRemise(FIN0, { manifesteEmpreinte: mauvaise, horodatage: H })).toThrow(ErreurAbonnement);
    }
  });
  it.todo('T-ABO-13 : attend l’export complet du lot 05');

  it('T-ABO-14', () => {
    // Entrée : accusé le 1er mars, aucun gel. Attendu : effacement refusé le 30, permis le 31 (J+30), pas avant.
    const fin = accuse();
    const echeance = ajouterJours(AUJOURDHUI, JOURS_ATTENTE);
    expect(echeance).toBe('2026-03-31');
    expect(peutDemanderEffacement(fin, ajouterJours(echeance, -1), PARAMS)).toEqual({ permis: false, raison: 'trop_tot' });
    expect(peutDemanderEffacement(fin, echeance, PARAMS)).toEqual({ permis: true, raison: null });
    expect(() => enregistrerAccuse(FIN0, { empreinteRecue: EMPREINTE, auteur: 'Admin X', horodatage: H })).toThrow(ErreurAbonnement);
    const r = enregistrerRemise(FIN0, { manifesteEmpreinte: EMPREINTE, horodatage: H });
    expect(() => enregistrerAccuse(r.fin, { empreinteRecue: AUTRE_EMPREINTE, auteur: 'Admin X', horodatage: H })).toThrow(ErreurAbonnement);
  });

  it('T-ABO-15', () => {
    // Entrée : gel posé avant l'échéance, levé après. Attendu : jamais permis avant l'échéance ni pendant le gel, permis après la levée.
    const opt = { motif: 'litige fictif', par: 'client' as const, auteur: 'Admin X', horodatage: H, longueurMaxMotif: NB_JOURS_BOUCLE * 2 };
    const gele = poserGel(accuse(), opt).fin;
    const echeance = ajouterJours(AUJOURDHUI, JOURS_ATTENTE);
    for (let i = 0; i <= NB_JOURS_BOUCLE; i += 1) {
      expect(peutDemanderEffacement(gele, ajouterJours(AUJOURDHUI, i), PARAMS).permis).toBe(false);
    }
    const leve = leverGel(gele, { ...opt, horodatage: '2026-04-05T10:00:00Z' }).fin;
    expect(peutDemanderEffacement(leve, ajouterJours(echeance, -1), PARAMS).permis).toBe(false);
    expect(peutDemanderEffacement(leve, '2026-04-05', PARAMS)).toEqual({ permis: true, raison: null });
    expect(peutDemanderEffacement({ ...accuse(), gelConsole: true }, echeance, PARAMS).raison).toBe('gel_actif');
  });

  it('T-ABO-16', () => {
    // Entrée : remise sans accusé pendant 60 jours. Attendu : jamais d'effacement, 3 relances exactement, puis transmission à Axion.
    const fin = enregistrerRemise(FIN0, { manifesteEmpreinte: EMPREINTE, horodatage: H }).fin;
    const envoyees: number[] = [];
    let transmis = false;
    for (let i = 0; i <= NB_JOURS_BOUCLE; i += 1) {
      const jour = ajouterJours(AUJOURDHUI, i);
      expect(peutDemanderEffacement(fin, jour, PARAMS).permis).toBe(false);
      const d = relancesDues(fin, jour, PARAMS, envoyees);
      envoyees.push(...d.relances);
      transmis = transmis || d.transmettreAAxion;
    }
    expect(envoyees).toEqual(RELANCES);
    expect(transmis).toBe(true);
  });

  it('aucun-texte-dans-le-noyau', () => {
    // Les codes rendus sont des identifiants [a-z_]+, jamais des phrases.
    const forme = /^[a-z_]+$/;
    for (const etat of ETATS_ACCES.filter((e) => e !== 'ACTIF')) {
      const b = contenuBanniere(etat, voulu('actif', 1), true);
      expect(b?.cause).toMatch(forme);
      expect(b?.consequence).toMatch(forme);
    }
    const raisons = [
      orienterPiece('RESILIE', OPTIONS).cause, orienterPiece('SUSPENDU', OPTIONS).cause,
      orienterPiece('ACTIF', { ...OPTIONS, plafondTechniqueAtteint: true }).cause,
      orienterPiece('ACTIF', { ...OPTIONS, enAttenteVolume: true }).cause,
      peutDemanderEffacement(FIN0, AUJOURDHUI, PARAMS).raison,
      peutDemanderEffacement(accuse(), AUJOURDHUI, PARAMS).raison,
      peutDemanderEffacement({ ...accuse(), gelConsole: true }, AUJOURDHUI, PARAMS).raison,
    ];
    for (const r of raisons) expect(r).toMatch(forme);
    const refus = autoriser('SUSPENDU', 'ecriture');
    expect(refus.permis === false && refus.raison).toMatch(forme);
    expect(() => demanderPalier({ accord: false } as never)).toThrow(/^[a-z_]+$/);
  });
});
