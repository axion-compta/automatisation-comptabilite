import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { ErreurCasForme, proposerSelonForme } from '../cas-forme.js';

const c = centimes;
const entree = c(50000);
const sortie = c(-30000);

describe('cas-forme', () => {
  it('ei-apport-108', () => {
    const p = proposerSelonForme({ montant: entree }, 'EI');
    expect(p).toEqual({ etat: 'brouillon', valide: false, compte: '108', sens: 'credit', montant: c(50000), motif: 'apport_exploitant' });
    // frontière : 1 centime
    expect(proposerSelonForme({ montant: c(1) }, 'EI')?.sens).toBe('credit');
  });

  it('ei-retrait-108', () => {
    const p = proposerSelonForme({ montant: sortie }, 'EI');
    expect(p).toEqual({ etat: 'brouillon', valide: false, compte: '108', sens: 'debit', montant: c(30000), motif: 'retrait_exploitant' });
    expect(proposerSelonForme({ montant: c(-1) }, 'EI')?.sens).toBe('debit');
    // une EI n'a pas d'associé : même signalée, une restitution reste sur 108
    expect(proposerSelonForme({ montant: sortie, restitutionApportAssocie: true }, 'EI')?.compte).toBe('108');
  });

  it('societe-jamais-108', () => {
    for (const forme of ['EURL', 'SARL', 'SASU', 'SAS', 'SCI']) {
      for (const montant of [entree, sortie]) {
        for (const restitutionApportAssocie of [false, true]) {
          const p = proposerSelonForme({ montant, restitutionApportAssocie }, forme);
          expect(p?.compte).not.toBe('108');
        }
      }
      expect(proposerSelonForme({ montant: entree }, forme)).toBeNull();
      expect(proposerSelonForme({ montant: sortie }, forme)).toBeNull();
    }
  });

  it('restitution-associe-467', () => {
    const p = proposerSelonForme({ montant: sortie, restitutionApportAssocie: true }, 'SARL');
    expect(p).toEqual({ etat: 'brouillon', valide: false, compte: '467', sens: 'debit', montant: c(30000), motif: 'restitution_apport_associe' });
    // une restitution est une sortie : un crédit signalé ainsi n'est pas proposé
    expect(proposerSelonForme({ montant: entree, restitutionApportAssocie: true }, 'SARL')).toBeNull();
  });

  it('brouillon-seulement', () => {
    for (const [ligne, forme] of [
      [{ montant: entree }, 'EI'],
      [{ montant: sortie }, 'EI'],
      [{ montant: sortie, restitutionApportAssocie: true }, 'SAS'],
    ] as const) {
      const p = proposerSelonForme(ligne, forme);
      expect(p?.etat).toBe('brouillon');
      expect(p?.valide).toBe(false);
    }
    // entrées invalides refusées, formes inconnues refusées
    expect(() => proposerSelonForme({ montant: c(0) }, 'EI')).toThrow(ErreurCasForme);
    expect(() => proposerSelonForme({ montant: NaN as never }, 'EI')).toThrow(ErreurCasForme);
    expect(() => proposerSelonForme({ montant: entree }, 'association')).toThrow(ErreurCasForme);
    expect(() => proposerSelonForme({ montant: entree }, '')).toThrow(ErreurCasForme);
  });
});
