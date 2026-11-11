import { describe, expect, it } from 'vitest';
import { creerServicePalier } from '../domaines/palier-service.js';

const HORLOGE = () => '2026-06-15T10:00:00Z';
const neuf = () => creerServicePalier({ horloge: HORLOGE, scenario: null });
const CLE = 'cle-fictive-0001';
const demande = (code: string, accord = true) => ({ code_demande: code, accord });

describe('service de la demande de palier', () => {
  it('sans-accord-422-aucune-demande', () => {
    const s = neuf();
    expect(s.demander(CLE, demande('compta-2', false))).toEqual({ ok: false, erreur: 'ACCORD_MANQUANT' });
    expect(s.demandes()).toEqual([]);
    expect(s.journal()).toEqual([]);
  });

  it('avec-accord-201-une-demande-un-evenement', () => {
    const s = neuf();
    const r = s.demander(CLE, demande('compta-2'));
    expect(r).toEqual({ ok: true, valeur: { demande: { code_actuel: 'compta-1', code_demande: 'compta-2', horodatage: HORLOGE() }, palier_en_vigueur: 'compta-1' } });
    expect(s.demandes()).toEqual([{ codeActuel: 'compta-1', codeDemande: 'compta-2', auteur: 'personne-fictive-1', horodatage: HORLOGE() }]);
    expect(s.journal()).toMatchObject([{ type: 'abonnement.palier_demande', horodatage: HORLOGE() }]);
  });

  it('palier-en-vigueur-inchange', () => {
    const s = neuf();
    s.demander(CLE, demande('compta-3'));
    const r = s.demander('cle-fictive-0002', demande('compta-2'));
    expect(r).toMatchObject({ ok: true, valeur: { palier_en_vigueur: 'compta-1' } });
  });

  it('meme-cle-une-seule-demande', () => {
    const s = neuf();
    const a = s.demander(CLE, demande('compta-2'));
    const b = s.demander(CLE, demande('compta-3'));
    expect(b).toEqual(a);
    expect(s.demandes()).toHaveLength(1);
    expect(s.journal()).toHaveLength(1);
  });

  it('palier-inconnu-404', () => {
    const s = neuf();
    expect(s.demander(CLE, demande('palier-fictif'))).toEqual({ ok: false, erreur: 'PALIER_INCONNU' });
    expect(s.demandes()).toEqual([]);
  });

  it('palier-inferieur-ou-identique-422', () => {
    const s = neuf();
    expect(s.demander(CLE, demande('compta-1'))).toEqual({ ok: false, erreur: 'PALIER_IDENTIQUE' });
    expect(s.demandes()).toEqual([]);
  });

  it('etat-propre-a-chaque-instance', () => {
    neuf().demander(CLE, demande('compta-2'));
    expect(neuf().demandes()).toEqual([]);
  });
});
