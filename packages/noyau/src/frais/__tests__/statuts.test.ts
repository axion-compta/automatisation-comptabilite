import { describe, expect, it } from 'vitest';
import { TRANSITIONS, passer, peutPasser } from '../statuts.js';
import { ErreurFrais, type Frais, type StatutFrais } from '../types.js';

const frais = (statut: StatutFrais): Frais => ({
  id: 'f1', personneId: 'p1', nature: 'depense', dateDepense: '2026-03-02', libelle: 'Fournitures fictives',
  montantTtc: 1200 as Frais['montantTtc'], tva: 200 as Frais['tva'], payeur: 'personne', statut,
  justificatifPerdu: false, partPersoTtc: 0 as Frais['partPersoTtc'], version: 3,
});
function code(f: () => unknown): string | undefined {
  try { f(); } catch (e) { return e instanceof ErreurFrais ? e.code : 'autre'; }
  return undefined;
}
const OPT = { motif: 'hors périmètre', parPersonne: 'Camille Test' };

const TOUS: StatutFrais[] = [
  'brouillon', 'a_completer', 'propose', 'valide', 'rembourse', 'en_compte_courant', 'exclu_paye_societe', 'refuse', 'perso',
];
const MATRICE: Record<string, string> = {
  brouillon: 'a_completer propose exclu_paye_societe refuse perso',
  a_completer: 'propose exclu_paye_societe refuse perso',
  propose: 'valide a_completer refuse',
  valide: 'rembourse en_compte_courant',
  rembourse: '', en_compte_courant: '', exclu_paye_societe: '', refuse: '', perso: '',
};

describe('statuts de frais', () => {
  it('chemin-nominal-jusqu-au-remboursement', () => {
    let f = frais('brouillon');
    f = passer(f, 'a_completer');
    f = passer(f, 'propose');
    f = passer(f, 'valide', OPT);
    f = passer(f, 'rembourse');
    expect(f.statut).toBe('rembourse');
    expect(passer(frais('valide'), 'en_compte_courant', OPT).statut).toBe('en_compte_courant');
  });
  it('valide-ne-revient-pas-en-arriere', () => {
    for (const v of ['propose', 'a_completer', 'brouillon', 'refuse', 'perso'] as const) {
      expect(code(() => passer(frais('valide'), v, OPT))).toBe('transition_interdite');
    }
  });
  it('statut-final-sans-sortie', () => {
    for (const s of ['rembourse', 'en_compte_courant', 'exclu_paye_societe', 'refuse', 'perso'] as const) {
      for (const v of TOUS) expect(code(() => passer(frais(s), v, OPT))).toBe('transition_interdite');
    }
  });
  it('refus-sans-motif-refuse', () => {
    for (const m of [undefined, '', '   ']) expect(code(() => passer(frais('propose'), 'refuse', { motif: m }))).toBe('motif_obligatoire');
    expect(passer(frais('propose'), 'refuse', { motif: 'doublon' }).statut).toBe('refuse');
  });
  it('validation-sans-personne-refusee', () => {
    for (const p of [undefined, '', '  ']) expect(code(() => passer(frais('propose'), 'valide', { parPersonne: p }))).toBe('transition_interdite');
    expect(code(() => passer(frais('propose'), 'valide'))).toBe('transition_interdite');
  });
  it('version-incrementee-objet-intact', () => {
    const entree = Object.freeze(frais('brouillon'));
    const sortie = passer(entree, 'propose');
    expect(sortie.version).toBe(4);
    expect(sortie.statut).toBe('propose');
    expect(entree.statut).toBe('brouillon');
    expect(entree.version).toBe(3);
    expect(sortie).not.toBe(entree);
  });
  it('statut-inconnu-refuse', () => {
    for (const v of ['', 'inconnu', 'toString', '__proto__']) {
      expect(code(() => passer(frais('brouillon'), v as StatutFrais))).toBe('entree_invalide');
      expect(peutPasser('brouillon', v as StatutFrais)).toBe(false);
    }
    expect(code(() => passer(frais('toString' as StatutFrais), 'propose'))).toBe('entree_invalide');
  });
  it('table-exhaustive', () => {
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...TOUS].sort());
    for (const de of TOUS) {
      for (const vers of TOUS) {
        const attendu = MATRICE[de]!.split(' ').includes(vers);
        expect(peutPasser(de, vers), de + ' vers ' + vers).toBe(attendu);
      }
    }
  });
});
