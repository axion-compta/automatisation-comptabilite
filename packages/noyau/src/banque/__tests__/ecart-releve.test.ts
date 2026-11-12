import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { bloquantsCloture, ErreurEcart, fermerEcart, ouvrirEcart } from '../ecart-releve.js';

const c = centimes;

describe('ecart-releve', () => {
  it('ecart-5-euros-ligne-ouverte', () => {
    const l = ouvrirEcart(c(100500), c(100000), '2026-03-31');
    expect(l).toEqual({ etat: 'ouverte', montant: c(500), date: '2026-03-31', compte: '512' });
    const neg = ouvrirEcart(c(99500), c(100000), '2026-03-31');
    expect(neg?.montant).toBe(c(-500));
    // frontière : 1 centime d'écart suffit
    expect(ouvrirEcart(c(1), c(0), '2026-03-31')?.montant).toBe(c(1));
  });

  it('aucune-ecriture-d-ajustement', () => {
    const l = ouvrirEcart(c(100500), c(100000), '2026-03-31');
    expect(l).not.toBeNull();
    const cles = Object.keys(l ?? {}).sort();
    expect(cles).toEqual(['compte', 'date', 'etat', 'montant']);
    const f = fermerEcart(l!, 'Erreur de saisie du relevé corrigée', 'Alice Exemple');
    expect(Object.keys(f).sort()).toEqual(['acteur', 'compte', 'date', 'etat', 'montant', 'motif']);
    expect(JSON.stringify(f)).not.toMatch(/ecriture|debit|credit/i);
  });

  it('cloture-bloquee-si-ouverte', () => {
    const a = ouvrirEcart(c(500), c(0), '2026-03-31')!;
    const b = ouvrirEcart(c(-200), c(0), '2026-04-30')!;
    expect(bloquantsCloture([])).toEqual([]);
    expect(bloquantsCloture([a, b])).toHaveLength(2);
    const fermee = fermerEcart(a, 'Écart expliqué par un virement en transit', 'Alice Exemple');
    const restant = bloquantsCloture([fermee, b]);
    expect(restant).toHaveLength(1);
    expect(restant[0]).toMatchObject({ date: '2026-04-30', montant: c(-200) });
  });

  it('fermeture-avec-motif', () => {
    const a = ouvrirEcart(c(500), c(0), '2026-03-31')!;
    const f = fermerEcart(a, '  Virement en transit  ', ' Alice Exemple ');
    expect(f).toMatchObject({ etat: 'fermee', motif: 'Virement en transit', acteur: 'Alice Exemple', montant: c(500) });
    expect(a.etat).toBe('ouverte');
    for (const motif of ['', '   ']) expect(() => fermerEcart(a, motif, 'Alice Exemple')).toThrow(ErreurEcart);
    expect(() => fermerEcart(a, 'Motif', ' ')).toThrow(ErreurEcart);
    expect(() => fermerEcart(f, 'Autre motif', 'Alice Exemple')).toThrow(ErreurEcart);
  });

  it('ecart-nul-aucune-ligne', () => {
    expect(ouvrirEcart(c(12345), c(12345), '2026-03-31')).toBeNull();
    expect(ouvrirEcart(c(0), c(0), '2026-03-31')).toBeNull();
    expect(() => ouvrirEcart(NaN as never, c(0), '2026-03-31')).toThrow();
    expect(() => ouvrirEcart(c(1), c(0), '2026-02-30')).toThrow(ErreurEcart);
    expect(() => ouvrirEcart(c(1), c(0), 'hier')).toThrow(ErreurEcart);
  });
});
