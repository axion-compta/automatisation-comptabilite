import { describe, expect, it } from 'vitest';
import { verifierDeclaration, type DeclarationFiscale } from '../pole-fiscal.js';

const BALANCE = { total: 120000 };
const SOURCES = ['ecriture:E1'];
const decl = (p: Partial<DeclarationFiscale> = {}): DeclarationFiscale => ({
  controleBalanceFait: true,
  total: 120000,
  lignes: [
    { id: 'L1', montant: 100000, sources: SOURCES },
    { id: 'L2', montant: 20000, sources: ['piece:P1', 'ecriture:E2'] },
  ],
  ...p,
});
const ROLES_AVEC = [
  { role: 'administrateur' as const, id: 'admin-exemple' },
  { role: 'comptable_invite' as const, id: 'compta-exemple' },
];
const ROLES_SANS = [{ role: 'administrateur' as const, id: 'admin-exemple' }];

describe('pole fiscal', () => {
  it('sans-controle-balance-refuse', () => {
    const r = verifierDeclaration(decl({ controleBalanceFait: false }), BALANCE, ROLES_AVEC);
    expect(r).toEqual({ statut: 'refusee', motifs: ['controle_balance_manquant'], escalade: null });
    // seul `true` valide le contrôle
    const flou = decl({ controleBalanceFait: 1 as unknown as boolean });
    expect(verifierDeclaration(flou, BALANCE, ROLES_AVEC).statut).toBe('refusee');
    expect(verifierDeclaration(decl(), BALANCE, ROLES_AVEC).statut).toBe('acceptee');
  });

  it('ecart-balance-escalade', () => {
    for (const total of [120001, 119999, 0, -120000]) {
      const r = verifierDeclaration(decl({ total }), BALANCE, ROLES_AVEC);
      expect(r.statut).toBe('escalade');
      expect(r.motifs).toEqual(['ecart_balance']);
      expect(r.escalade).not.toBeNull();
    }
    expect(verifierDeclaration(decl({ total: 120000 }), BALANCE, ROLES_AVEC).escalade).toBeNull();
    for (const mauvais of [Number.NaN, Infinity, 1.5]) {
      const r = verifierDeclaration(decl({ total: mauvais }), BALANCE, ROLES_AVEC);
      expect(r.statut).toBe('refusee');
      expect(r.motifs).toContain('montant_invalide');
    }
    expect(verifierDeclaration(decl(), { total: Number.NaN }, ROLES_AVEC).motifs).toContain('montant_invalide');
  });

  it('ligne-sans-source-refusee', () => {
    for (const sources of [[], [''], ['  '], undefined as unknown as string[]]) {
      const d = decl({ lignes: [{ id: 'L1', montant: 120000, sources }] });
      const r = verifierDeclaration(d, BALANCE, ROLES_AVEC);
      expect(r).toEqual({ statut: 'refusee', motifs: ['ligne_sans_source:L1'], escalade: null });
    }
    // une source citée sur chaque ligne suffit
    const ok = decl({ lignes: [{ id: 'L1', montant: 120000, sources: ['piece:P9'] }] });
    expect(verifierDeclaration(ok, BALANCE, ROLES_AVEC).statut).toBe('acceptee');
  });

  it('escalade-comptable-invite', () => {
    const r = verifierDeclaration(decl({ total: 5 }), BALANCE, ROLES_AVEC);
    expect(r.escalade).toEqual({ vers: 'comptable_invite', destinataire: 'compta-exemple' });
  });

  it('escalade-administrateur-sans-comptable', () => {
    const r = verifierDeclaration(decl({ total: 5 }), BALANCE, ROLES_SANS);
    expect(r.escalade).toEqual({ vers: 'administrateur', destinataire: 'admin-exemple' });
    const aucun = verifierDeclaration(decl({ total: 5 }), BALANCE, []);
    expect(aucun.statut).toBe('refusee');
    expect(aucun.motifs).toContain('aucun_destinataire');
  });
});
