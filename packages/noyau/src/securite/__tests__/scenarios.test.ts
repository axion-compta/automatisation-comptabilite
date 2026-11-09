import { describe, expect, it } from 'vitest';
import { JEU_SECURITE } from '../../../../donnees-fictives/src/securite.js';
import { ajouterEntree, ajouterLot, teteInitiale, type Brouillon, type EntreeJournal } from '../../journal/chaine.js';
import { verifierSansSecret } from '../../journal/filtre.js';
import { verifierChaine } from '../../journal/verifier.js';
import { poserArret, reprendre, estCoupe } from '../arret.js';
import { autoriser, type ContexteAutorisation } from '../autoriser.js';
import { capacites } from '../capacites.js';
import { exigerNiveau } from '../connexion.js';
import { verifierDebits } from '../debit.js';
import { detecterExportMassif, evenementEtatAcces } from '../evenements.js';
import { verifierAccesExpert, type AccesExpert } from '../expert.js';
import { dateComptable, observerHorloge } from '../horloge.js';
import { caseMatrice, MATRICE_PROPOSEE } from '../matrice.js';
import { signalementsAPurger } from '../signalements.js';
import { lireDansSociete, REPONSE_INTROUVABLE, verifierSocieteDeLaRequete } from '../societe.js';
import { ACTIONS, ACTIONS_ECRITURE, ROLES, estAction, estPermission, estRaison, estRole, type Action, type Role } from '../types.js';

const personne = (id: string) => JEU_SECURITE.personnes.find((p) => p.id === id)!;
const ctx = (id: string, extra: Partial<ContexteAutorisation> = {}): ContexteAutorisation => {
  const p = personne(id);
  return { role: p.role as Role, permissions: p.permissions, demande5: false, separationTaches: false, personneId: p.id, ...extra };
};
const raisons = (c: ContexteAutorisation, actions: readonly Action[]) => actions.map((a) => autoriser(c, a));
const refus = (raison: string) => ({ permis: false, raison });
const [MS, JOUR_MS, T0] = [1000, 86400000, '2026-03-01T10:00:00.000Z'];
const ms = (s: string) => Date.parse(s);

describe('jeu fictif de sécurité', () => {
  it('rôles-et-permissions-connus-du-noyau', () => {
    expect(JEU_SECURITE.personnes).toHaveLength(ROLES.length);
    for (const p of JEU_SECURITE.personnes) {
      expect(estRole(p.role)).toBe(true);
      for (const perm of p.permissions) expect(estPermission(perm)).toBe(true);
    }
    expect(estRole('inconnu')).toBe(false);
    expect(estPermission('compta-inconnue')).toBe(false);
  });
});

describe('droits', () => {
  it('C06', () => {
    const six: Action[] = ['deposer', 'saisir', 'valider', 'lever_majeur', 'cloturer', 'parametrer'];
    expect(raisons(ctx('lec-a'), six)).toEqual(six.map(() => refus('role_lecture')));
    expect(autoriser(ctx('lec-a'), 'lire')).toEqual({ permis: true });
  });
  it('C07', () => {
    expect(autoriser(ctx('dir-a'), 'lever_majeur', { gravite: 'majeur' })).toEqual({ permis: true });
    expect(autoriser(ctx('dir-a'), 'lever_majeur', { gravite: 'bloquant' })).toEqual(refus('role_insuffisant'));
  });
  it('C09', () => {
    const cinq: Action[] = ['deposer', 'saisir', 'valider', 'lever_majeur', 'cloturer'];
    const toutes = personne('adms-a').permissions;
    expect(raisons(ctx('axion-1', { permissions: toutes }), cinq)).toEqual(cinq.map(() => refus('personnel_axion_lecture_seule')));
    expect(autoriser(ctx('axion-1'), 'lire')).toEqual({ permis: true });
  });
  it('C12', () => {
    const a = JEU_SECURITE.accesExperts[0]!;
    const acces: AccesExpert = {
      societeId: a.societeId, personneId: a.personneId, mode: 'lecture_commentaire', expireLe: `${a.echeance}T00:00:00.000Z`,
      perimetre: { exercices: [a.exercice], journaux: [...a.journaux], comptesBancaires: [] },
    };
    expect(verifierAccesExpert(acces, { action: 'lire', journal: 'VTE' }, T0)).toEqual(refus('perimetre_expert'));
    expect(verifierAccesExpert(acces, { action: 'lire', journal: 'ACH' }, T0)).toEqual({ permis: true });
  });
  it('C13', () => {
    const acces: AccesExpert = {
      societeId: 'A', personneId: 'inv-a', mode: 'lecture_commentaire', expireLe: T0,
      perimetre: { exercices: ['2026'], journaux: ['ACH'], comptesBancaires: [] },
    };
    expect(verifierAccesExpert(acces, { action: 'lire' }, new Date(ms(T0) + 1).toISOString()))
      .toEqual({ permis: false, raison: 'acces_expire', evenement: 'securite.acces_expert_expire' });
    expect(verifierAccesExpert(acces, { action: 'lire' }, new Date(ms(T0) - 1).toISOString())).toEqual({ permis: true });
  });
  it('C17', () => {
    const rep = raisons(ctx('exp-a', { permissions: [] }), ACTIONS);
    expect(rep).toHaveLength(ACTIONS.length);
    expect(rep.every((r) => !r.permis && r.raison === 'role_insuffisant')).toBe(true);
    expect(autoriser(ctx('exp-a', { permissions: ['console-comptable'] }), 'lire')).toEqual(refus('role_insuffisant'));
  });
  it('C24', () => {
    const mode = { id: 'saisie_seule', actionsRetirees: ['cloturer', 'valider'] as Action[], raison: 'mode_saisie_seule' as const };
    const c = ctx('adms-a', { mode });
    for (const a of ['cloturer', 'valider'] as const) expect(autoriser(c, a)).toEqual(refus('mode_saisie_seule'));
    expect(autoriser(c, 'saisir')).toEqual({ permis: true });
    expect(autoriser(ctx('adms-a'), 'cloturer')).toEqual({ permis: true });
  });
  it('C25', () => {
    const lignes = capacites(ctx('lec-a'));
    expect(lignes).toHaveLength(ACTIONS.length);
    expect(lignes.filter((l) => !l.permis).length).toBeGreaterThanOrEqual(10);
    for (const l of lignes.filter((x) => !x.permis)) expect(estRaison(l.raison)).toBe(true);
    for (const l of lignes) expect(l.permis).toBe(autoriser(ctx('lec-a'), l.action).permis);
  });
  it('T-ROL-1', () => {
    const toutes = personne('adms-a').permissions;
    let n = 0;
    for (const action of ACTIONS) {
      expect(estAction(action)).toBe(true);
      for (const role of ROLES) {
        for (const demande5 of [false, true]) {
          const cellule = MATRICE_PROPOSEE[action][role];
          const attendu = typeof cellule === 'string' ? cellule : demande5 ? cellule.siDemande5 : 'N';
          expect(caseMatrice(role, action, { demande5 })).toBe(attendu);
        }
        const c = caseMatrice(role, action, { demande5: false });
        const d = autoriser({ role, permissions: toutes, demande5: false, separationTaches: false, personneId: 'x' }, action);
        if (c === 'N') expect(d.permis).toBe(false);
        if (c === 'O') expect(d).toEqual({ permis: true });
        n += 1;
      }
    }
    expect(n).toBe(84);
  });
  it('T-ROL-2', () => {
    expect(raisons(ctx('exp-a', { permissions: ['console-comptable', 'autre'] }), ACTIONS).every((r) => !r.permis)).toBe(true);
    expect(autoriser(ctx('exp-a'), 'exporter')).toEqual({ permis: true });
  });
  it('T-ROL-3', () => {
    const actif = ctx('dir-a', { separationTaches: true });
    expect(autoriser(actif, 'valider', { auteurId: 'dir-a' })).toEqual(refus('separation_taches'));
    expect(autoriser(actif, 'valider', { auteurId: 'adms-a' })).toEqual({ permis: true });
    expect(autoriser(ctx('dir-a'), 'valider', { auteurId: 'dir-a' })).toEqual({ permis: true });
  });
  it('T-ROL-5', () => {
    const avant = ctx('exp-a', { permissions: personne('adms-a').permissions });
    expect(autoriser(avant, 'cloturer')).toEqual(refus('role_insuffisant'));
    expect(autoriser({ ...avant, demande5: true }, 'cloturer')).toEqual({ permis: true });
    expect(ACTIONS_ECRITURE).not.toContain('lire');
  });
});

describe('isolation logique', () => {
  const objetB = { societeId: 'soc-b', id: 'o-1' };
  const objetC = { societeId: 'soc-c', id: 'o-2' };
  const session = (extra: Partial<Parameters<typeof verifierSocieteDeLaRequete>[0]> = {}) => ({
    societeSession: 'soc-a', societesDuCorps: [], societesDeLaPersonne: ['soc-a'], ...extra,
  });
  it('C02', () => {
    expect(lireDansSociete(objetB, 'soc-a')).toBe(REPONSE_INTROUVABLE);
    expect(lireDansSociete(objetB, 'soc-b')).toBe(objetB);
  });
  it('C04', () => {
    expect(verifierSocieteDeLaRequete(session({ societeChemin: 'soc-b' }))).toEqual({ ok: false, raison: 'societe_unique' });
    expect(verifierSocieteDeLaRequete(session({ societesDuCorps: ['soc-a', 'soc-b'] }))).toEqual({ ok: false, raison: 'societe_unique' });
    expect(verifierSocieteDeLaRequete(session({ societeChemin: 'soc-a' }))).toEqual({ ok: true, societeId: 'soc-a' });
  });
  it('C05', () => {
    const autre = lireDansSociete(objetB, 'soc-a');
    const inexistant = lireDansSociete(undefined, 'soc-a');
    expect(autre).toEqual(inexistant);
    expect(JSON.stringify(autre)).toBe(JSON.stringify(inexistant));
  });
  it('C11', () => {
    expect(lireDansSociete(objetC, 'soc-a')).toBe(REPONSE_INTROUVABLE);
    expect(verifierSocieteDeLaRequete(session({ societeSession: 'soc-c' }))).toEqual({ ok: false, raison: 'societe_unique' });
    expect(verifierSocieteDeLaRequete(session({ societeSession: '' }))).toEqual({ ok: false, raison: 'non_authentifie' });
  });
  it('C19', () => {
    const taches = [objetB, objetC, { societeId: 'soc-a', id: 'o-3' }];
    const vues = taches.map((t) => lireDansSociete(t, 'soc-a'));
    expect(vues.filter((v) => v === REPONSE_INTROUVABLE)).toHaveLength(2);
    expect(vues[2]).toBe(taches[2]);
  });
});

describe('connexion', () => {
  const reglages = { reauthMaxMs: 7 * MS, attenteApresRecuperationMs: 9 * MS };
  const maintenantS = 5000;
  const maintenantMs = maintenantS * MS;
  const mfa = (ecartS: number) => ({ acr: 'mfa', authTime: maintenantS - ecartS });

  it('C14', () => {
    expect(exigerNiveau(mfa(8), 'cloturer', maintenantMs, reglages)).toEqual({ ok: false, raison: 'reauthentification_requise' });
    expect(exigerNiveau(mfa(6), 'cloturer', maintenantMs, reglages)).toEqual({ ok: true });
  });
  it('T-CNX-2', () => {
    for (const op of ['ordinaire', 'cloturer'] as const) {
      expect(exigerNiveau({ acr: 'pwd', authTime: maintenantS }, op, maintenantMs, reglages)).toEqual({ ok: false, raison: 'mfa_requis' });
    }
    expect(exigerNiveau(undefined, 'ordinaire', maintenantMs, reglages)).toEqual({ ok: false, raison: 'non_authentifie' });
    expect(exigerNiveau(mfa(99), 'ordinaire', maintenantMs, reglages)).toEqual({ ok: true });
  });
  it('T-CNX-3', () => {
    expect(exigerNiveau(mfa(7), 'exporter_fec', maintenantMs, reglages)).toEqual({ ok: true });
    expect(exigerNiveau(mfa(0), 'exporter_fec', maintenantMs, reglages, maintenantMs - 8 * MS)).toEqual({ ok: false, raison: 'recuperation_recente' });
    expect(exigerNiveau(mfa(0), 'exporter_fec', maintenantMs, reglages, maintenantMs - 9 * MS)).toEqual({ ok: true });
  });
});

describe('dates', () => {
  it('T-ISO-3', () => {
    expect(dateComptable('2026-12-31T22:30:00Z', 'Europe/Paris')).toBe('2026-12-31');
    expect(dateComptable('2026-12-31T23:30:00+01:00', 'Europe/Paris')).toBe('2026-12-31');
    expect(dateComptable('2026-06-30T22:30:00Z', 'Europe/Paris')).toBe('2026-07-01');
    expect(() => dateComptable('2026-12-31T22:30:00Z', 'Pays/Inconnu')).toThrow();
  });
  it('T-ISO-5', () => {
    const [maintenant, tolerance] = [90 * JOUR_MS, 2 * JOUR_MS];
    const vue = { plusGrandInstantMs: maintenant };
    expect(observerHorloge(vue, maintenant - 30 * JOUR_MS, tolerance)).toEqual({ bloque: true, alerte: true, vue });
    expect(observerHorloge(vue, maintenant - tolerance, tolerance).bloque).toBe(false);
    expect(() => observerHorloge(vue, Number.NaN, tolerance)).toThrow();
  });
});

describe('journal', () => {
  const brouillon = (i: number, societeId = 'A'): Brouillon => ({
    societeId, horodatage: T0, acteur: 'marie@exemple.fr', canal: 'clic', evenement: 'ecriture.creee', motif: `saisie ${i}`, apres: { ligne: i },
  });
  const params = { societeId: 'A', creeLe: T0 };

  it('T-JRN-1', () => {
    const [total, milieu] = [1000, 500];
    const lot = ajouterLot(teteInitiale('A', T0), Array.from({ length: total }, (_, i) => brouillon(i)));
    const base = (): EntreeJournal[] => structuredClone(lot.entrees);
    expect(verifierChaine(base(), params)).toEqual({ ok: true, tete: lot.tete });
    const [modifiee, supprimee, inseree] = [base(), base(), base()] as [EntreeJournal[], EntreeJournal[], EntreeJournal[]];
    modifiee[milieu] = { ...modifiee[milieu]!, motif: 'altéré' };
    supprimee.splice(milieu, 1);
    inseree.splice(milieu, 0, structuredClone(inseree[milieu - 1]!));
    const defauts = [modifiee, supprimee, inseree].map((e) => {
      const r = verifierChaine(e, params);
      return r.ok ? 'aucun' : r.defaut;
    });
    expect(defauts).toEqual(['modifiee', 'supprimee', 'inseree']);
  });
  it('T-JRN-3', () => {
    const nombre = 50;
    let tete = teteInitiale('A', T0);
    const sequences: number[] = [];
    for (let i = 0; i < nombre; i += 1) {
      const r = ajouterEntree(tete, brouillon(i));
      sequences.push(r.entree.sequence);
      tete = r.tete;
    }
    expect(sequences).toEqual(Array.from({ length: nombre }, (_, i) => i + 1));
    expect(new Set(sequences).size).toBe(nombre);
  });
  it('T-JRN-6', () => {
    const etats = ['e1', 'e2', 'e3', 'e4', 'e5'];
    const evenements = etats.slice(1).map((nouveau, i) => evenementEtatAcces({ ancien: etats[i]!, nouveau, source: 'console', auteur: 'adms-a', horodatage: T0 }));
    expect(evenements).toHaveLength(4);
    expect(evenements.every((e) => e.evenement === 'acces.etat_change')).toBe(true);
    expect(evenements.map((e) => e.donnees.nouveau)).toEqual(['e2', 'e3', 'e4', 'e5']);
    expect(detecterExportMassif([1, 2, 3], 4, { nombreMax: 2, fenetreMs: 10 })).toBe(true);
  });
  it('T-JRN-7', () => {
    const iban = ['FR76', '1234', '5678', '9012', '3456', '7890', '123'].join(' ');
    const jeton = ['eyJabc', 'def', 'ghi'].join('.');
    const cas = [{ apres: { compte: iban } }, { apres: { entete: jeton } }, { apres: { motdepasse: 'x' } }];
    for (const c of cas) {
      expect(verifierSansSecret(c).length).toBeGreaterThan(0);
      expect(() => ajouterEntree(teteInitiale('A', T0), { ...brouillon(0), ...c })).toThrow();
    }
    expect(verifierSansSecret({ apres: { ligne: 1 } })).toEqual([]);
  });
});

describe('incidents et signalements', () => {
  it('T-SEC-3', () => {
    const demande = { cle: 'personne-1', limite: 5, fenetreMs: 60 * MS };
    let etat = {};
    for (let i = 0; i < 5; i += 1) {
      const r = verifierDebits(etat, [demande], i * MS);
      expect(r.accepte).toBe(true);
      etat = r.etat;
    }
    expect(verifierDebits(etat, [demande], 5 * MS)).toMatchObject({ accepte: false, reessayerApresMs: 55 * MS });
    expect(verifierDebits(etat, [{ ...demande, cle: 'personne-2' }], 5 * MS).accepte).toBe(true);
  });
  it('T-SEC-7', () => {
    const r = poserArret({ societes: {} }, { societeId: 'A' }, 'adms-a', T0);
    expect(estCoupe(r.drapeaux, 'A', 'api')).toBe(true);
    expect(estCoupe(r.drapeaux, 'B', 'api')).toBe(false);
    const rep = reprendre(r.drapeaux, { societeId: 'A' }, { id: 'adms-a', role: 'administrateur' }, T0);
    expect(rep.ok && rep.evenement.type).toBe('securite.reprise');
    expect(reprendre(r.drapeaux, { societeId: 'A' }, { id: 'dir-a', role: 'utilisateur' }, T0)).toEqual({ ok: false, raison: 'role_insuffisant' });
  });
  it('T-SUP-2', () => {
    const fenetre = 3 * JOUR_MS;
    const maintenant = ms(T0);
    const s = (id: string, ecart: number) => ({ id, creeLe: maintenant - ecart });
    const r = signalementsAPurger([s('vieux', fenetre + JOUR_MS), s('limite', fenetre), s('recent', JOUR_MS), { id: 'x', creeLe: 'illisible' }], maintenant, fenetre);
    expect(r).toEqual({ aPurger: ['vieux'], illisibles: ['x'] });
    expect(() => signalementsAPurger([], maintenant, undefined)).toThrow();
  });
});

// Cas NON rejoués ici (identité, base ou serveur réels requis) :
// C01, C03, C10, C15, C16, C18, C20 à C23, T-CNX-1, T-CNX-4 à 7, T-ISO-1, 2, 4, 6,
// T-JRN-2, 4, 5, T-SEC-1, 2, 4 à 6, 8, T-SUP-1, 3 : portés par les fiches bloquées (L06-T42 et suivantes).
