import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ParametresFinContrat } from '../../abonnement/fin-contrat.js';
import type { FinContrat } from '../../abonnement/types.js';
import type { Session } from '../../session/port.js';
import {
  creerEspace, ErreurMiseEnService, geler, inviter, supprimer, suspendre,
  type Contexte, type Espace, type EtatMiseEnService, type Resultat,
} from '../operations.js';

const SERVICE = { nature: 'service', personneId: 'svc-console' } as unknown as Session;
const PERSONNE = { nature: 'personne', personneId: 'pers-1' } as unknown as Session;
const P: ParametresFinContrat = { joursAvantEffacement: 30, joursRappelAvantEffacement: 23, joursRelancesSansAccuse: [7, 14] };
const CTX: Contexte = { horodatage: '2031-05-10T08:00:00Z', aujourdhui: '2031-05-10', longueurMaxMotif: 200, parametresFin: P };
const VIDE: EtatMiseEnService = { organisations: {}, cles: {} };
const code = (f: () => unknown) => { try { f(); } catch (e) { return e instanceof ErreurMiseEnService ? e.code : 'autre'; } return undefined; };
const cree = (id = 'dupont', cle = 'cle-creation-1'): Resultat => creerEspace({ cle, identifiant: id }, VIDE, SERVICE, CTX);
const espace = (r: Resultat, id = 'dupont'): Espace => r.etat.organisations[id] as Espace;
const avecFin = (r: Resultat, fin: Partial<FinContrat>): EtatMiseEnService => ({
  ...r.etat, organisations: { dupont: { ...espace(r), fin: { ...espace(r).fin, ...fin } } },
});
const remis = { remisLe: '2031-01-01T08:00:00Z', manifesteEmpreinte: 'a'.repeat(64) };
const accuse = { ...remis, accuseLe: '2031-01-02T08:00:00Z', accusePar: 'client' };

describe('mise-en-service/operations', () => {
  it('creer-espace-cree-organisation-et-base', () => {
    const r = cree();
    expect(r.rejoue).toBe(false);
    expect(r.retour).toEqual({ organisationId: 'dupont', base: 'cli_dupont' });
    expect(r.evenements.map((e) => e.type)).toEqual(['mise_en_service.espace_cree']);
    expect(espace(r).base).toBe('cli_dupont');
  });

  it('cle-invalide-table', () => {
    for (const cle of ['', 'court', 'a b c d e f g h', 'accentué-1234', 'a'.repeat(129), 'x;DROP-1234']) {
      expect(code(() => creerEspace({ cle, identifiant: 'dupont' }, VIDE, SERVICE, CTX))).toBe('cle_invalide');
    }
    for (const n of [8, 128]) expect(code(() => creerEspace({ cle: 'a'.repeat(n), identifiant: 'dupont' }, VIDE, SERVICE, CTX))).toBeUndefined();
  });

  it('rejeu-meme-cle-meme-contenu', () => {
    const r = cree();
    const b = creerEspace({ cle: 'cle-creation-1', identifiant: 'dupont' }, r.etat, SERVICE, { ...CTX, horodatage: '2031-06-01T08:00:00Z' });
    expect([b.rejoue, b.evenements, b.retour, b.etat]).toEqual([true, [], r.retour, r.etat]);
  });

  it('cle-reutilisee-contenu-different-ou-autre-operation', () => {
    const r = cree();
    expect(code(() => creerEspace({ cle: 'cle-creation-1', identifiant: 'martin' }, r.etat, SERVICE, CTX))).toBe('cle_reutilisee');
    expect(code(() => suspendre({ cle: 'cle-creation-1', organisationId: 'dupont' }, r.etat, SERVICE, CTX))).toBe('cle_reutilisee');
  });

  it('cle-proto-ne-pollue-rien', () => {
    const r = creerEspace({ cle: '__proto__', identifiant: 'dupont' }, VIDE, SERVICE, CTX);
    expect(Object.hasOwn(r.etat.cles, '__proto__')).toBe(true);
    expect(creerEspace({ cle: '__proto__', identifiant: 'dupont' }, r.etat, SERVICE, CTX).rejoue).toBe(true);
    expect(({} as Record<string, unknown>)['organisations']).toBeUndefined();
  });

  it('deja-existant-autre-cle-aucune-seconde-base', () => {
    const r = cree();
    expect(code(() => creerEspace({ cle: 'cle-creation-2', identifiant: 'dupont' }, r.etat, SERVICE, CTX))).toBe('deja_existant');
    expect(Object.keys(r.etat.organisations)).toEqual(['dupont']);
  });

  it('identifiant-invalide-table', () => {
    for (const identifiant of ['x;DROP', 'Dupont', '', 'a-b', 'a_b', 'é', 'a'.repeat(41), ' dupont']) {
      expect(code(() => creerEspace({ cle: 'cle-creation-9', identifiant }, VIDE, SERVICE, CTX))).toBe('identifiant_invalide');
    }
    expect(espace(cree('a'.repeat(40)), 'a'.repeat(40)).base).toBe('cli_' + 'a'.repeat(40));
  });

  it('suspendre-pause-arret-envois-via-recevoir-etat-voulu', () => {
    const r = suspendre({ cle: 'cle-suspendre-1', organisationId: 'dupont' }, cree().etat, SERVICE, CTX);
    const e = espace(r);
    expect(e.voulu).toEqual({ etat: 'pause', version: 1, arretEnvois: true });
    expect(e.acces?.etat).toBe('LECTURE_SEULE');
    expect(r.evenements.map((x) => x.type)).toEqual(['acces.etat_change', 'mise_en_service.suspension_demandee']);
    expect(espace(suspendre({ cle: 'cle-suspendre-2', organisationId: 'dupont' }, r.etat, SERVICE, CTX)).voulu?.version).toBe(2);
    expect(code(() => suspendre({ cle: 'cle-suspendre-3', organisationId: 'absent' }, r.etat, SERVICE, CTX))).toBe('espace_inconnu');
  });

  it('geler-pose-le-gel-sans-changer-lacces-et-bloque-leffacement', () => {
    const base = avecFin(cree(), accuse);
    const sus = suspendre({ cle: 'cle-suspendre-1', organisationId: 'dupont' }, base, SERVICE, CTX);
    const g = geler({ cle: 'cle-geler-0001', organisationId: 'dupont', motif: 'litige fictif' }, sus.etat, SERVICE, CTX);
    expect(espace(g).fin.gelModule).toMatchObject({ actif: true, motif: 'litige fictif', posePar: 'svc-console' });
    expect([espace(g).acces, g.evenements.map((x) => x.type)]).toEqual([espace(sus).acces, ['fin_contrat.gel_pose']]);
    const s = supprimer({ cle: 'cle-supprimer-1', organisationId: 'dupont' }, g.etat, SERVICE, { ...CTX, aujourdhui: '2032-01-01' });
    expect(s.retour).toEqual({ permis: false, raison: 'gel_actif' });
    expect(code(() => geler({ cle: 'cle-geler-0002', organisationId: 'dupont', motif: 'bis' }, g.etat, SERVICE, CTX))).toBe('autre');
  });

  it('supprimer-une-raison-de-refus-par-test', () => {
    const cas: Array<[Partial<FinContrat>, string, string]> = [
      [{}, '2032-01-01', 'pas_de_remise'],
      [remis, '2032-01-01', 'pas_d_accuse'],
      [{ ...accuse, gelConsole: true }, '2032-01-01', 'gel_actif'],
      [accuse, '2031-01-10', 'trop_tot'],
    ];
    for (const [fin, aujourdhui, raison] of cas) {
      const etat = avecFin(cree(), fin);
      const r = supprimer({ cle: 'cle-supprimer-1', organisationId: 'dupont' }, etat, SERVICE, { ...CTX, aujourdhui });
      expect(r.retour).toEqual({ permis: false, raison });
      expect([r.evenements, r.etat]).toEqual([[], etat]);
    }
  });

  it('supprimer-permis-planifie-sans-effacer-et-rejoue', () => {
    const etat = avecFin(cree(), accuse);
    const ctx = { ...CTX, aujourdhui: '2032-01-01' };
    const r = supprimer({ cle: 'cle-supprimer-1', organisationId: 'dupont' }, etat, SERVICE, ctx);
    expect(r.retour).toEqual({ permis: true, raison: null });
    expect(r.evenements.map((x) => x.type)).toEqual(['mise_en_service.effacement_demande']);
    expect(espace(r).effacementDemandeLe).toBe(ctx.horodatage);
    expect(r.etat.organisations['dupont']).toBeDefined();
    const b = supprimer({ cle: 'cle-supprimer-1', organisationId: 'dupont' }, r.etat, SERVICE, ctx);
    expect([b.rejoue, b.evenements]).toEqual([true, []]);
  });

  it('inviter-enregistre-sans-envoyer', () => {
    const d = { cle: 'cle-inviter-001', organisationId: 'dupont', personne: 'lea@exemple.fr', role: 'comptable' };
    const r = inviter(d, cree().etat, SERVICE, CTX);
    expect(espace(r).invitations).toEqual([{ personne: 'lea@exemple.fr', role: 'comptable' }]);
    expect(r.evenements.map((x) => x.type)).toEqual(['mise_en_service.invitation_enregistree']);
    expect(inviter(d, r.etat, SERVICE, CTX).rejoue).toBe(true);
    expect(code(() => inviter({ ...d, cle: 'cle-inviter-002', role: 'roi' }, r.etat, SERVICE, CTX))).toBe('role_invalide');
    expect(code(() => inviter({ ...d, cle: 'cle-inviter-003', personne: ' ' }, r.etat, SERVICE, CTX))).toBe('personne_invalide');
  });

  it('session-de-personne-refusee-partout', () => {
    const etat = cree().etat, o = 'dupont';
    const appels = [
      () => creerEspace({ cle: 'cle-creation-7', identifiant: 'martin' }, etat, PERSONNE, CTX),
      () => inviter({ cle: 'cle-inviter-007', organisationId: o, personne: 'a@exemple.fr', role: 'comptable' }, etat, PERSONNE, CTX),
      () => suspendre({ cle: 'cle-suspendre-7', organisationId: o }, etat, PERSONNE, CTX),
      () => geler({ cle: 'cle-geler-0007', organisationId: o, motif: 'm' }, etat, PERSONNE, CTX),
      () => supprimer({ cle: 'cle-supprimer-7', organisationId: o }, etat, PERSONNE, CTX),
    ];
    for (const appel of appels) expect(code(appel)).toBe('compte_de_personne');
  });

  it('source-sans-mots-interdits', () => {
    const src = readFileSync(new URL('../operations.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(new RegExp(['pr' + 'ix', 'str' + 'ipe', '€'].join('|'), 'i'));
    expect(src).not.toMatch(/inscri|register|signup|password|oubli/i);
  });
});
