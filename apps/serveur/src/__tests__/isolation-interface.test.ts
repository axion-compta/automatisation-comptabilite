import { describe, expect, it } from 'vitest';
import {
  controler, entetesCache, masquer, societeDuChemin, TEXTE_MASQUE,
  type AccesExpert, type Cible, type Demande, type Dependances,
} from '../domaines/isolation-interface.js';
import { creerFauxSessions } from '../../../../packages/noyau/src/session/memoire.js';
import type { Session } from '../../../../packages/noyau/src/session/port.js';
import type { Permission, Role } from '../../../../packages/noyau/src/securite/types.js';
import { cheminSociete } from '../../../../packages/contrat/src/prefixe-routes.js';

const MAINTENANT = 1_000_000;
const TOUT: Permission[] = ['compta-lire', 'compta-valider', 'compta-exporter', 'compta-pieces-sensibles'];
const session = (roles: Role[], permissions: Permission[], p: Partial<Session> = {}): Session => ({
  personneId: 'pers-1', nature: 'personne', organisationId: 'org-a', organisations: ['org-a'],
  societeId: 'soc-1', societes: ['soc-1', 'soc-2'], roles, permissions,
  revendications: { acr: 'mfa', authTime: MAINTENANT / 1000 }, ...p,
});
const SESSIONS = {
  admin: session(['administrateur'], TOUT),
  lecteur: session(['lecture'], ['compta-lire']),
  sans: session(['utilisateur'], ['compta-saisir']),
  expert: session(['invite_externe'], ['compta-lire']),
  autre: session(['administrateur'], TOUT, { personneId: 'pers-2' }),
  ancienne: session(['administrateur'], TOUT, { revendications: { acr: 'mfa', authTime: 1 } }),
};
const CIBLES: Record<string, Cible> = {
  mienne: { id: 'mienne', societeId: 'soc-1', organisationId: 'org-a' },
  soeur: { id: 'soeur', societeId: 'soc-2', organisationId: 'org-a' },
  etrangere: { id: 'etrangere', societeId: 'soc-9', organisationId: 'org-z' },
};
function monter(acces: AccesExpert | null = { etat: 'actif', perimetre: ['exercices'] }): Dependances {
  return {
    sessions: creerFauxSessions(SESSIONS),
    cibles: { trouver: async (id) => CIBLES[id] ?? null },
    experts: { lire: async () => acces },
    reglages: { reauthMaxMs: 600_000, attenteApresRecuperationMs: 600_000 },
    maintenantMs: () => MAINTENANT + 1,
  };
}
const q = (reference: string | null, extra: Partial<Demande> = {}): Demande => ({ reference, action: 'lire', ...extra });
const code = async (d: Dependances, demande: Demande) => {
  const v = await controler(d, demande);
  return v.ok ? 'ok' : `${v.statut}:${v.corps.code}`;
};

describe('isolation : session et société', () => {
  it('sans session ou session inconnue : 401, jamais de lecture', async () => {
    expect(await code(monter(), q(null))).toBe('401:non_authentifie');
    expect(await code(monter(), q('inconnue'))).toBe('401:non_authentifie');
  });
  it('société du chemin : seule celle de la session passe', async () => {
    const d = monter();
    expect(await code(d, q('admin', { chemin: cheminSociete('/alertes').replace('{s}', 'soc-1') }))).toBe('ok');
    expect(await code(d, q('admin', { chemin: cheminSociete('/alertes').replace('{s}', 'soc-2') }))).toBe('400:societe_unique');
    expect(await code(d, q('admin', { chemin: '/autre/chemin' }))).toBe('400:societe_unique');
    expect(societeDuChemin(cheminSociete('/x').replace('{s}', ''))).toBeNull();
  });
  it('objet d’une autre société du même client : 400 societe_unique', async () => {
    expect(await code(monter(), q('admin', { cibleId: 'soeur' }))).toBe('400:societe_unique');
    expect(await code(monter(), q('admin', { cibleId: 'mienne' }))).toBe('ok');
  });
  it('objet d’un autre client ou inexistant : 404 au MÊME corps', async () => {
    const d = monter();
    const a = await controler(d, q('admin', { cibleId: 'etrangere' }));
    const b = await controler(d, q('admin', { cibleId: 'inexistante' }));
    expect(a).toEqual(b);
    expect(a).toEqual({ ok: false, statut: 404, corps: { code: 'introuvable' } });
  });
  it('un autre client ne voit jamais l’objet d’un client : même 404 pour sa propre session', async () => {
    const d = { ...monter(), sessions: creerFauxSessions({ x: session(['administrateur'], TOUT, { organisationId: 'org-z', organisations: ['org-z'] }) }) };
    expect(await code(d, q('x', { cibleId: 'mienne' }))).toBe('404:introuvable');
  });
});

describe('isolation : rôles', () => {
  it('reporter et ignorer exigent compta-valider', async () => {
    for (const action of ['reporter', 'ignorer'] as const) {
      expect(await code(monter(), q('lecteur', { action }))).toBe('403:role_lecture');
      expect(await code(monter(), q('sans', { action }))).toBe('403:role_insuffisant');
      expect(await code(monter(), q('admin', { action }))).toBe('ok');
    }
  });
  it('exporter exige compta-exporter', async () => {
    expect(await code(monter(), q('lecteur', { action: 'exporter' }))).toBe('403:role_insuffisant');
    expect(await code(monter(), q('admin', { action: 'exporter' }))).toBe('ok');
  });
  it('export : connexion trop ancienne ou hors MFA refusée', async () => {
    expect(await code(monter(), q('ancienne', { action: 'exporter' }))).toBe('401:reauthentification_requise');
    const d = { ...monter(), sessions: creerFauxSessions({ m: session(['administrateur'], TOUT, { revendications: {} }) }) };
    expect(await code(d, q('m', { action: 'exporter' }))).toBe('401:mfa_requis');
  });
});

describe('isolation : expert invité', () => {
  it('son périmètre seulement', async () => {
    const d = monter({ etat: 'actif', perimetre: ['exercices', 'journaux', 'comptes_bancaires'] });
    for (const ressource of ['exercices', 'journaux', 'comptes_bancaires'] as const) expect(await code(d, q('expert', { ressource }))).toBe('ok');
    expect(await code(d, q('expert', { ressource: 'autre' }))).toBe('403:perimetre_expert');
    expect(await code(d, q('expert'))).toBe('403:perimetre_expert');
    expect(await code(monter(), q('expert', { ressource: 'journaux' }))).toBe('403:perimetre_expert');
  });
  it('révoqué, expiré ou inconnu : refusé à chaque lecture', async () => {
    const ressource = 'exercices' as const;
    expect(await code(monter({ etat: 'revoque', perimetre: [ressource] }), q('expert', { ressource }))).toBe('403:acces_revoque');
    expect(await code(monter(null), q('expert', { ressource }))).toBe('403:acces_revoque');
    expect(await code(monter({ etat: 'expire', perimetre: [ressource] }), q('expert', { ressource }))).toBe('403:acces_expire');
    let etat: AccesExpert['etat'] = 'actif';
    const d = { ...monter(), experts: { lire: async () => ({ etat, perimetre: [ressource] }) } };
    expect(await code(d, q('expert', { ressource }))).toBe('ok');
    etat = 'revoque';
    expect(await code(d, q('expert', { ressource }))).toBe('403:acces_revoque');
  });
});

describe('isolation : masquage des pièces sensibles', () => {
  const lignes = [{ id: 'p1', libelle: 'Facture A' }, { id: 'p2', libelle: 'Bulletin fictif', sensible: true }];
  it('sans compta-pieces-sensibles : exclue de la recherche, masquée ailleurs', () => {
    expect(masquer(SESSIONS.lecteur, lignes, 'recherche').map((e) => e.id)).toEqual(['p1']);
    for (const mode of ['alerte', 'export'] as const) {
      expect(masquer(SESSIONS.lecteur, lignes, mode)[1] ?? null).toEqual({ id: 'p2', libelle: TEXTE_MASQUE, sensible: true });
    }
  });
  it('avec la permission : tout visible ; l’entrée n’est jamais modifiée', () => {
    expect(masquer(SESSIONS.admin, lignes, 'recherche')).toEqual(lignes);
    masquer(SESSIONS.lecteur, lignes, 'export');
    expect(lignes[1]?.libelle).toBe('Bulletin fictif');
  });
  it('appliqué à chaque lecture : la perte de permission masque aussitôt', () => {
    expect(masquer(SESSIONS.admin, lignes, 'alerte')[1]?.libelle).toBe('Bulletin fictif');
    expect(masquer({ ...SESSIONS.admin, permissions: ['compta-lire'] }, lignes, 'alerte')[1]?.libelle).toBe(TEXTE_MASQUE);
  });
  it('liste vide', () => expect(masquer(SESSIONS.lecteur, [], 'recherche')).toEqual([]));
});

describe('isolation : ETag et cache par personne', () => {
  const corps = '{"a":1}';
  it('en-têtes privés', () => {
    const h = entetesCache(SESSIONS.admin, corps);
    expect(h['Cache-Control']).toBe('private, no-cache');
    expect(h.Vary).toBe('Authorization');
    expect(h.ETag).toMatch(/^"[0-9a-f]{64}"$/);
  });
  it('stable pour la même personne, différent selon personne, permissions, société et corps', () => {
    const base = entetesCache(SESSIONS.admin, corps).ETag;
    expect(entetesCache({ ...SESSIONS.admin }, corps).ETag).toBe(base);
    expect(entetesCache({ ...SESSIONS.admin, permissions: [...TOUT].reverse() }, corps).ETag).toBe(base);
    for (const autre of [SESSIONS.autre, { ...SESSIONS.admin, permissions: ['compta-lire'] as Permission[] }, { ...SESSIONS.admin, societeId: 'soc-2' }]) {
      expect(entetesCache(autre, corps).ETag).not.toBe(base);
    }
    expect(entetesCache(SESSIONS.admin, '{"a":2}').ETag).not.toBe(base);
  });
});
