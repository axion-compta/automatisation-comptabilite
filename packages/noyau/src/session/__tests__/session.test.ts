import { describe, expect, it } from 'vitest';
import {
  choisirOrganisation, ErreurSession, exigerNouvelleConnexion, exigerPermission, exigerPersonne,
  verifierSession, type Session,
} from '../port.js';
import { creerFauxSessions } from '../memoire.js';
import { suiteSession } from './suite-session.js';

const NOW = 5000000;
const REG = { reauthMaxMs: 600000, attenteApresRecuperationMs: 900000 };
const secondes = (ms: number) => Math.trunc(ms * 0.001);
const brut = (extra: Record<string, unknown> = {}) => ({
  personneId: 'personne-fictive-1', nature: 'personne', organisationId: 'org-fictive-1',
  organisations: ['org-fictive-1', 'org-fictive-2'], societeId: 'societe-fictive-1',
  societes: ['societe-fictive-1', 'societe-fictive-2'], roles: ['utilisateur'],
  permissions: ['compta-lire'], revendications: { acr: 'mfa', authTime: secondes(NOW - 2000) }, ...extra,
});
const session = (extra: Record<string, unknown> = {}): Session => verifierSession(brut(extra));
const code = (f: () => unknown) => {
  try { f(); } catch (e) { return e instanceof ErreurSession ? e.code : 'autre'; }
  return 'aucune';
};

suiteSession('faux en mémoire', creerFauxSessions);

describe('session : validation et gardes', () => {
  it('role-inconnu-refuse', () => {
    expect(code(() => verifierSession(brut({ roles: ['superviseur'] })))).toBe('session_invalide');
    expect(code(() => verifierSession(brut({ permissions: ['compta-tout'] })))).toBe('session_invalide');
    expect(code(() => verifierSession(brut({ roles: [] })))).toBe('session_invalide');
    expect(code(() => verifierSession(brut({ champInconnu: 1 })))).toBe('session_invalide');
    expect(code(() => verifierSession(null))).toBe('session_invalide');
    expect(code(() => verifierSession(brut({ nature: 'robot' })))).toBe('session_invalide');
    expect(Object.isFrozen(session())).toBe(true);
  });
  it('societe-hors-liste-refusee', () => {
    expect(code(() => verifierSession(brut({ societeId: 'societe-fictive-9' })))).toBe('session_invalide');
    expect(code(() => verifierSession(brut({ organisationId: 'org-fictive-9' })))).toBe('session_invalide');
    expect(code(() => verifierSession(brut({ societes: [] })))).toBe('session_invalide');
  });
  it('permission-manquante', () => {
    expect(exigerPermission(session(), 'compta-lire')).toEqual({ ok: true });
    expect(exigerPermission(session(), 'compta-cloturer')).toEqual({ ok: false, raison: 'permission_manquante' });
  });
  it('compte-de-service-refuse', () => {
    expect(exigerPersonne(session())).toEqual({ ok: true });
    expect(exigerPersonne(session({ nature: 'service' }))).toEqual({ ok: false, raison: 'compte_de_service' });
  });
  it('nouvelle-connexion-recente-acceptee', () => {
    expect(exigerNouvelleConnexion(session(), 'exporter_fec', NOW, REG)).toEqual({ ok: true });
    expect(exigerNouvelleConnexion(null, 'ordinaire', NOW, REG)).toEqual({ ok: false, raison: 'non_authentifie' });
  });
  it('nouvelle-connexion-trop-ancienne-refusee', () => {
    const vieille = session({ revendications: { acr: 'mfa', authTime: secondes(NOW - REG.reauthMaxMs - 2000) } });
    expect(exigerNouvelleConnexion(vieille, 'exporter_fec', NOW, REG)).toEqual({ ok: false, raison: 'reauthentification_requise' });
    expect(exigerNouvelleConnexion(vieille, 'ordinaire', NOW, REG)).toEqual({ ok: true });
  });
  it('recuperation-recente-refusee', () => {
    expect(exigerNouvelleConnexion(session(), 'changer_cle', NOW, REG, NOW - 1000)).toEqual({ ok: false, raison: 'recuperation_recente' });
    expect(exigerNouvelleConnexion(session(), 'changer_cle', NOW, REG, NOW - REG.attenteApresRecuperationMs)).toEqual({ ok: true });
  });
  it('sans-mfa-refuse', () => {
    const s = session({ revendications: { authTime: secondes(NOW - 2000) } });
    expect(exigerNouvelleConnexion(s, 'ordinaire', NOW, REG)).toEqual({ ok: false, raison: 'mfa_requis' });
  });
  it('organisation-non-membre-refusee', () => {
    const s = choisirOrganisation(session(), 'org-fictive-2', ['societe-fictive-7', 'societe-fictive-8']);
    expect(s.organisationId).toBe('org-fictive-2');
    expect(s.societeId).toBe('societe-fictive-7');
    expect(s.societes).toEqual(['societe-fictive-7', 'societe-fictive-8']);
    expect(Object.isFrozen(s)).toBe(true);
    expect(code(() => choisirOrganisation(session(), 'org-fictive-9', ['societe-fictive-7']))).toBe('organisation_refusee');
    expect(code(() => choisirOrganisation(session(), 'org-fictive-2', []))).toBe('organisation_refusee');
  });
});
