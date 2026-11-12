import { describe, expect, it } from 'vitest';
import { appliquerRoles, recupererAdministrateur, type MembreRole } from '../dernier-admin.js';
import { ErreurSecurite } from '../types.js';

const T = '2026-11-12T10:00:00.000Z';
const m = (personneId: string, role: MembreRole['role'], actif = true): MembreRole => ({ personneId, role, actif });
const un = [m('alice@exemple.fr', 'administrateur'), m('bruno@exemple.fr', 'utilisateur')];
const deux = [m('alice@exemple.fr', 'administrateur'), m('carla@exemple.fr', 'administrateur'), m('bruno@exemple.fr', 'utilisateur')];
const demande = (p: Record<string, unknown> = {}) => ({
  demandeur: 'axion-1@exemple.fr', role: 'personnel_axion', beneficiaire: 'bruno@exemple.fr',
  motif: 'Dernier administrateur parti, demande reçue', reference: 'DEM-0001', canal: 'clic', horodatage: T, ...p,
}) as never;

describe('securite/dernier-admin', () => {
  it('retrograder-le-dernier-administrateur-refuse', () => {
    expect(appliquerRoles(un, [{ personneId: 'alice@exemple.fr', role: 'utilisateur' }]))
      .toEqual({ ok: false, raison: 'dernier_administrateur' });
    // Tout ou rien : un autre changement valide du même lot n'est pas appliqué.
    const r = appliquerRoles(un, [{ personneId: 'bruno@exemple.fr', role: 'comptable' }, { personneId: 'alice@exemple.fr', role: 'lecture' }]);
    expect(r).toEqual({ ok: false, raison: 'dernier_administrateur' });
    // Dans le même lot, promouvoir un autre administrateur rend la rétrogradation permise.
    const ok = appliquerRoles(un, [{ personneId: 'alice@exemple.fr', role: 'utilisateur' }, { personneId: 'bruno@exemple.fr', role: 'administrateur' }]);
    expect(ok).toMatchObject({ ok: true });
  });

  it('retrait-du-dernier-administrateur-refuse', () => {
    expect(appliquerRoles(un, [{ personneId: 'alice@exemple.fr', actif: false }]))
      .toEqual({ ok: false, raison: 'dernier_administrateur' });
    // Un administrateur déjà inactif ne compte pas.
    const inactif = [m('alice@exemple.fr', 'administrateur'), m('carla@exemple.fr', 'administrateur', false)];
    expect(appliquerRoles(inactif, [{ personneId: 'alice@exemple.fr', actif: false }]))
      .toEqual({ ok: false, raison: 'dernier_administrateur' });
    // Réactiver puis retirer l'autre : un administrateur actif reste.
    expect(appliquerRoles(inactif, [{ personneId: 'carla@exemple.fr', actif: true }, { personneId: 'alice@exemple.fr', actif: false }]))
      .toMatchObject({ ok: true });
    expect(appliquerRoles([], [])).toEqual({ ok: false, raison: 'dernier_administrateur' });
  });

  it('deux-administrateurs-un-retrograde-permis', () => {
    const r = appliquerRoles(deux, [{ personneId: 'alice@exemple.fr', role: 'comptable' }]);
    expect(r).toEqual({
      ok: true,
      etat: [m('alice@exemple.fr', 'comptable'), m('carla@exemple.fr', 'administrateur'), m('bruno@exemple.fr', 'utilisateur')],
    });
    expect(appliquerRoles(un, [])).toMatchObject({ ok: true });
    expect(appliquerRoles(un, [{ personneId: 'bruno@exemple.fr', actif: false }])).toMatchObject({ ok: true });
    expect(() => appliquerRoles(un, [{ personneId: 'inconnu@exemple.fr', role: 'lecture' }])).toThrow(ErreurSecurite);
    expect(() => appliquerRoles(un, [{ personneId: 'bruno@exemple.fr', role: 'roi' as never }])).toThrow(ErreurSecurite);
  });

  it('recuperation-sans-motif-refusee', () => {
    for (const p of [{ motif: '' }, { motif: '   ' }, { reference: '' }, { reference: '  ' }]) {
      expect(recupererAdministrateur(demande(p), un)).toMatchObject({ permis: false, raison: 'entree_invalide' });
    }
    for (const role of ['administrateur', 'utilisateur', 'lecture', 'comptable', 'invite_externe']) {
      expect(recupererAdministrateur(demande({ role }), un)).toMatchObject({ permis: false, raison: 'role_insuffisant' });
    }
  });

  it('recuperation-par-le-chat-refusee', () => {
    for (const canal of ['chat', 'voix']) {
      expect(recupererAdministrateur(demande({ canal }), un)).toMatchObject({ permis: false, raison: 'role_insuffisant' });
    }
    for (const canal of ['clic', 'import', 'api', 'systeme']) {
      expect(recupererAdministrateur(demande({ canal }), un)).toMatchObject({ permis: true });
    }
    expect(() => recupererAdministrateur(demande({ canal: 'telepathie' }), un)).toThrow(ErreurSecurite);
  });

  it('recuperation-tracee', () => {
    const r = recupererAdministrateur(demande(), [m('alice@exemple.fr', 'administrateur', false), m('bruno@exemple.fr', 'utilisateur', false)]);
    expect(r).toEqual({
      permis: true,
      etat: [m('alice@exemple.fr', 'administrateur', false), m('bruno@exemple.fr', 'administrateur', true)],
      ligne: {
        evenement: 'securite.administrateur_recupere', demandeur: 'axion-1@exemple.fr', beneficiaire: 'bruno@exemple.fr',
        motif: 'Dernier administrateur parti, demande reçue', reference: 'DEM-0001', horodatage: T,
      },
    });
    expect(() => recupererAdministrateur(demande({ beneficiaire: 'inconnu@exemple.fr' }), un)).toThrow(ErreurSecurite);
  });

  it('etat-recu-non-modifie', () => {
    const etat = deux.map((x) => ({ ...x }));
    const avant = JSON.stringify(etat);
    const changements = [{ personneId: 'alice@exemple.fr', role: 'lecture' as const }];
    const copieCh = JSON.stringify(changements);
    const r = appliquerRoles(etat, changements);
    appliquerRoles(etat, [{ personneId: 'alice@exemple.fr', actif: false }, { personneId: 'carla@exemple.fr', actif: false }]);
    recupererAdministrateur(demande(), etat);
    expect(JSON.stringify(etat)).toBe(avant);
    expect(JSON.stringify(changements)).toBe(copieCh);
    if (r.ok) expect(r.etat).not.toBe(etat);
  });
});
