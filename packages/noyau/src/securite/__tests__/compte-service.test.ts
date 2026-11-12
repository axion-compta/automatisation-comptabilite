import { describe, expect, it } from 'vitest';
import type { Session } from '../../session/port.js';
import {
  OPERATIONS_PRESTATAIRE_IA, decisionPrestataireIa, masquerPourPrestataire,
} from '../compte-service.js';
import { ErreurSecurite } from '../types.js';

const T = '2026-11-12T10:00:00.000Z';
const service = (p: Partial<Session> = {}): Session => ({
  personneId: 'svc-ia-1', nature: 'service', organisationId: 'org-1', organisations: ['org-1'],
  societeId: 'soc-1', societes: ['soc-1'], roles: ['lecture'], permissions: ['compta-lire', 'compta-deposer'],
  revendications: {}, ...p,
});
const refus = (operation: string) => ({
  permis: false, raison: 'role_insuffisant',
  ligne: { evenement: 'securite.compte_service_refuse', compte: 'svc-ia-1', operation, horodatage: T },
});

describe('securite/compte-service', () => {
  it('lecture-et-depot-permis', () => {
    expect([...OPERATIONS_PRESTATAIRE_IA]).toEqual(['lire', 'deposer']);
    expect(decisionPrestataireIa(service(), 'lire', T)).toEqual({ permis: true });
    expect(decisionPrestataireIa(service(), 'deposer', T)).toEqual({ permis: true });
    // Les permissions du jeton ne changent rien : seule la liste fermée décide.
    const toutes = service({ roles: ['administrateur'], permissions: ['compta-valider', 'compta-cloturer'] });
    expect(decisionPrestataireIa(toutes, 'valider', T)).toEqual(refus('valider'));
  });

  it('validation-refusee-et-journalisee', () => {
    expect(decisionPrestataireIa(service(), 'valider', T)).toEqual(refus('valider'));
    expect(decisionPrestataireIa(service(), 'parametrer', T)).toEqual(refus('parametrer'));
    expect(decisionPrestataireIa(service(), 'voir_piece_sensible', T)).toEqual(refus('voir_piece_sensible'));
    // Le compte et l'horodatage journalisés viennent de l'appel, pas de constantes.
    const autre = decisionPrestataireIa(service({ personneId: 'svc-ia-2' }), 'valider', '2026-12-01T08:30:00.000Z');
    expect(autre).toHaveProperty('ligne.compte', 'svc-ia-2');
    expect(autre).toHaveProperty('ligne.horodatage', '2026-12-01T08:30:00.000Z');
  });

  it('cloture-envoi-refuses', () => {
    for (const op of ['cloturer', 'envoyer']) {
      expect(decisionPrestataireIa(service(), op, T)).toEqual(refus(op));
    }
  });

  it('export-complet-refuse-et-journalise', () => {
    for (const op of ['export_complet', 'exporter']) {
      expect(decisionPrestataireIa(service(), op, T)).toEqual(refus(op));
    }
    // Opérations inconnues, vides ou de casse différente : refusées (liste fermée).
    for (const op of ['', 'Lire', 'LIRE', 'lire ', 'inconnue', 'deposer_et_valider', undefined, null, 1]) {
      const d = decisionPrestataireIa(service(), op as never, T);
      expect(d).toMatchObject({ permis: false, raison: 'role_insuffisant' });
      expect(d).toHaveProperty('ligne.evenement', 'securite.compte_service_refuse');
    }
  });

  it('champs-sensibles-masques', () => {
    const objet = {
      id: 'PIE-1', fournisseur: 'Atelier Exemple', iban: 'FR00 FICTIF', lignes: [{ n: 1, note: 'x', iban: 'FR00 AUTRE' }],
      imbrique: { contact: { courriel: 'a@exemple.fr', ville: 'Lyon' } },
    };
    const m = masquerPourPrestataire(objet, ['iban', 'courriel']);
    expect(m).toEqual({
      id: 'PIE-1', fournisseur: 'Atelier Exemple', iban: 'masque', lignes: [{ n: 1, note: 'x', iban: 'masque' }],
      imbrique: { contact: { courriel: 'masque', ville: 'Lyon' } },
    });
    expect(masquerPourPrestataire(objet, [])).toEqual(objet);
    expect(masquerPourPrestataire(objet, [])).not.toBe(objet);
    expect(masquerPourPrestataire({ a: 0, b: null, c: false, d: '' }, ['a', 'b', 'c', 'd']))
      .toEqual({ a: 'masque', b: 'masque', c: 'masque', d: 'masque' });
    expect(masquerPourPrestataire([{ iban: 'x' }, 3], ['iban'])).toEqual([{ iban: 'masque' }, 3]);
    expect(masquerPourPrestataire('texte', ['iban'])).toBe('texte');
  });

  it('objet-recu-non-modifie', () => {
    const objet = { iban: 'FR00 FICTIF', lignes: [{ iban: 'FR00 AUTRE' }] };
    const avant = JSON.stringify(objet);
    const m = masquerPourPrestataire(objet, ['iban']) as typeof objet;
    expect(JSON.stringify(objet)).toBe(avant);
    expect(m.lignes).not.toBe(objet.lignes);
    expect(m.lignes[0]).not.toBe(objet.lignes[0]);
    const champs = ['iban'];
    masquerPourPrestataire(objet, champs);
    expect(champs).toEqual(['iban']);
    const s = service();
    const copie = JSON.stringify(s);
    decisionPrestataireIa(s, 'valider', T);
    expect(JSON.stringify(s)).toBe(copie);
  });

  it('session-personne-hors-champ', () => {
    const personne = service({ nature: 'personne', personneId: 'alice@exemple.fr' });
    for (const op of ['lire', 'valider']) {
      expect(() => decisionPrestataireIa(personne, op, T)).toThrow(ErreurSecurite);
      try {
        decisionPrestataireIa(personne, op, T);
      } catch (e) {
        expect((e as ErreurSecurite).code).toBe('argument_invalide');
      }
    }
    for (const mauvaise of [null, undefined, {}, { nature: 'robot' }]) {
      expect(() => decisionPrestataireIa(mauvaise as never, 'lire', T)).toThrow(ErreurSecurite);
    }
  });
});
