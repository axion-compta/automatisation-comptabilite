import { describe, expect, it } from 'vitest';
import { verifierRequeteSociete } from '../securite/societe.js';
import type { Session } from '../../../../packages/noyau/src/session/port.js';
import { cheminSociete } from '../../../../packages/contrat/src/prefixe-routes.js';

const session: Session = {
  personneId: 'pers-1', nature: 'personne', organisationId: 'org-a', organisations: ['org-a'],
  societeId: 'soc-1', societes: ['soc-1', 'soc-2'], roles: ['administrateur'], permissions: ['compta-lire'],
  revendications: { acr: 'mfa', authTime: 1 },
};
const chemin = (s: string, reste = '/ecritures') => cheminSociete(reste).replace('{s}', s);
const base = { session, chemin: chemin('soc-1'), societesDuCorps: [] as string[] };

describe('vérification commune de la société', () => {
  it('sans-session-401', () => {
    expect(verifierRequeteSociete({ ...base, session: null })).toEqual({
      ok: false, statut: 401, corps: { code: 'non_authentifie' },
    });
  });

  it('C02-autre-societe-404-meme-corps', () => {
    const inconnue = verifierRequeteSociete({ ...base, chemin: chemin('soc-9') });
    const sansPrefixe = verifierRequeteSociete({ ...base, chemin: '/ecritures' });
    const objetAutre = verifierRequeteSociete({ ...base, objet: { societeId: 'soc-2', id: 'x' } });
    expect(inconnue).toEqual({ ok: false, statut: 404, corps: { code: 'introuvable' } });
    expect(sansPrefixe).toEqual(inconnue);
    expect(objetAutre).toEqual(inconnue);
  });

  it('C04-corps-autre-societe-400', () => {
    const attendu = { ok: false, statut: 400, corps: { code: 'societe_unique' } };
    expect(verifierRequeteSociete({ ...base, societesDuCorps: ['soc-2'] })).toEqual(attendu);
    expect(verifierRequeteSociete({ ...base, societesDuCorps: ['soc-1', 'soc-9'] })).toEqual(attendu);
    // chemin d'une société de la personne mais pas celle de la session : mélange.
    expect(verifierRequeteSociete({ ...base, chemin: chemin('soc-2') })).toEqual(attendu);
    expect(verifierRequeteSociete({ ...base, societesDuCorps: ['soc-1'] })).toEqual({ ok: true, societeId: 'soc-1' });
  });

  it('C05-inexistant-et-autre-meme-reponse', () => {
    const inexistant = verifierRequeteSociete({ ...base, objet: null });
    const autre = verifierRequeteSociete({ ...base, objet: { societeId: 'soc-9', id: 'y' } });
    expect(autre).toEqual(inexistant);
    expect(JSON.stringify(autre)).toBe(JSON.stringify(inexistant));
    expect(inexistant).toEqual({ ok: false, statut: 404, corps: { code: 'introuvable' } });
    const mien = { societeId: 'soc-1', id: 'z' };
    expect(verifierRequeteSociete({ ...base, objet: mien })).toEqual({ ok: true, societeId: 'soc-1', objet: mien });
  });
});
