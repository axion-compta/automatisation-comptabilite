import { describe, expect, it } from 'vitest';
import { comparerClientFacture, nomNormaliseSociete } from '../client-facture.js';

const societe = { nom: 'Société A SAS', tva: 'FR 11 123456789', siren: '123 456 789', emails: ['compta@exemple.fr', 'Direction@Exemple.fr'] };

describe('nomNormaliseSociete', () => {
  it.each([
    ['Societe A SAS', 'SOCIETE A'],
    ['  Société   A, S.A.R.L. ', 'SOCIETE A'],
    ['SASU Dupont - Test EURL', 'DUPONT TEST'],
    ['Basalte SA', 'BASALTE'],
    ['Sasha Casa', 'SASHA CASA'],
    ['SNC SCI EI', ''],
  ])('%s', (entree, attendu) => {
    expect(nomNormaliseSociete(entree)).toBe(attendu);
  });
});

describe('comparerClientFacture', () => {
  it('meme-tva-concorde', () => {
    expect(comparerClientFacture({ tva: 'fr11123456789' }, societe, 'facture')).toMatchObject({ statut: 'concorde', tvaSousReserve: false });
    expect(comparerClientFacture({ siren: '123456789' }, societe, 'facture')).toMatchObject({ statut: 'concorde', tvaSousReserve: false });
  });
  it('tva-differente-douteux', () => {
    const r = comparerClientFacture({ nom: 'Société A', tva: 'FR99999999999' }, societe, 'facture');
    expect(r).toMatchObject({ statut: 'douteux', tvaSousReserve: true });
    expect(comparerClientFacture({ siren: '999999999' }, societe, 'facture').statut).toBe('douteux');
    expect(comparerClientFacture({ tva: 'FR11123456789', siren: '999999999' }, societe, 'facture').statut).toBe('douteux');
  });
  it('nom-avec-forme-juridique-concorde', () => {
    expect(comparerClientFacture({ nom: 'Societe A SAS' }, { nom: 'SOCIÉTÉ A', emails: [] }, 'facture')).toMatchObject({ statut: 'concorde', tvaSousReserve: false });
    expect(comparerClientFacture({ nom: 'société a' }, societe, 'facture').statut).toBe('concorde');
  });
  it('autre-nom-douteux', () => {
    expect(comparerClientFacture({ nom: 'Société B' }, societe, 'facture')).toMatchObject({ statut: 'douteux', tvaSousReserve: true });
    expect(comparerClientFacture({ nom: 'Société AB' }, societe, 'facture').statut).toBe('douteux');
    expect(comparerClientFacture({ tva: 'FR11123456789' }, { nom: 'X', emails: [] }, 'facture').statut).toBe('douteux');
  });
  it('ticket-sans-client', () => {
    expect(comparerClientFacture(null, societe, 'ticket')).toMatchObject({ statut: 'ticket_sans_client', tvaSousReserve: false });
    expect(comparerClientFacture({}, societe, 'ticket').statut).toBe('ticket_sans_client');
    expect(comparerClientFacture({ nom: 'Société B' }, societe, 'ticket').statut).toBe('douteux');
  });
  it('facture-sans-client-absent', () => {
    expect(comparerClientFacture(null, societe, 'facture')).toMatchObject({ statut: 'absent', tvaSousReserve: true });
    expect(comparerClientFacture({}, societe, 'recu')).toMatchObject({ statut: 'absent', tvaSousReserve: true });
  });
  it('email-concorde', () => {
    expect(comparerClientFacture({ email: 'DIRECTION@exemple.fr' }, societe, 'facture')).toMatchObject({ statut: 'concorde', tvaSousReserve: false });
    expect(comparerClientFacture({ email: 'autre@exemple.fr' }, societe, 'facture').statut).toBe('douteux');
    expect(comparerClientFacture({ nom: 'Société B', email: 'compta@exemple.fr' }, societe, 'facture')).toMatchObject({ statut: 'douteux', tvaSousReserve: true });
  });
  it('entrees-vides', () => {
    expect(comparerClientFacture({ nom: '', tva: ' ', siren: '', email: '' }, societe, 'facture')).toMatchObject({ statut: 'absent', tvaSousReserve: true });
    expect(comparerClientFacture({ nom: '', tva: '', siren: '' }, societe, 'ticket').statut).toBe('ticket_sans_client');
    expect(comparerClientFacture({ nom: 'SAS' }, societe, 'facture').statut).toBe('douteux');
    expect(comparerClientFacture({ tva: 'FR11123456789' }, { ...societe, tva: '', siren: '' }, 'facture').statut).toBe('douteux');
    expect(comparerClientFacture({ nom: 'Société A', email: '' }, { nom: 'Société A', emails: [''] }, 'facture').statut).toBe('concorde');
    expect(comparerClientFacture({ email: '' , siren: '123456789' }, { nom: 'X', siren: '', emails: [''] }, 'facture').statut).toBe('douteux');
  });
});
