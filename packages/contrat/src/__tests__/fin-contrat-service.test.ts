import { describe, expect, it, vi } from 'vitest';
import { creerServiceFinContrat } from '../domaines/fin-contrat-service.js';

const [HORLOGE, EMPREINTE] = [() => '2026-06-15T12:00:00Z', 'ab12'.repeat(16)];

describe('service de fin de contrat', () => {
  it('journalise un accusé et son effacement planifié, sans rien effacer', () => {
    const s = creerServiceFinContrat({ horloge: HORLOGE, scenario: 'finContrat=remis' });
    expect(s.accuser('cle-fictive-1', { manifeste_empreinte: EMPREINTE }).ok).toBe(true);
    expect(s.journal().map((e) => e.type)).toEqual(['fin_contrat.accuse', 'fin_contrat.effacement_planifie']);
  });
  it('ne met pas le motif du gel dans les journaux techniques', () => {
    const espion = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const s = creerServiceFinContrat({ horloge: HORLOGE, scenario: 'finContrat=accuse' });
    s.poserGel('cle-fictive-2', { motif: 'Motif secret fictif' });
    expect(espion).not.toHaveBeenCalled();
    espion.mockRestore();
  });
  it('rend une erreur 500 pour un motif trop long et 400 pour un motif vide', () => {
    const s = creerServiceFinContrat({ horloge: HORLOGE, scenario: 'finContrat=accuse' });
    expect(s.poserGel('cle-fictive-3', { motif: 'x'.repeat(201) })).toEqual({ ok: false, erreur: 'INTERNAL_SERVER_ERROR' });
    expect(s.poserGel('cle-fictive-4', { motif: '  ' })).toEqual({ ok: false, erreur: 'BAD_REQUEST' });
  });
});
