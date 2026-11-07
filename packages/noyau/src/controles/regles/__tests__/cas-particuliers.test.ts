import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import type { ParametreLu } from '../commun.js';
import { regleCCT17, regleCCT18, regleCCT18M, regleCCT19 } from '../cas-particuliers.js';
import type { Evenement, ObjetCasParticulier } from '../cas-particuliers.js';

const c = (n: number): Centimes => n as Centimes;
const param = (cle: string, statut: ParametreLu['statut']): ParametreLu => ({
  cle,
  valeur: statut === 'absent' ? null : 'x',
  statut,
});
const objet = (evenement: Evenement, p: ParametreLu): ObjetCasParticulier => ({ evenement, parametre: p });
const cession = (prix: number, immeuble = false): Evenement => ({ type: 'cession', prix: c(prix), immeuble });
const acompte: Evenement = { type: 'acompte', sens: 'recu' };
const perte = (tva: number): Evenement => ({ type: 'creance_perte', tvaCollectee: c(tva) });
const CLE_CESSION = 'tva.cession_bien_meuble';
const CLE_ACOMPTE = 'tva.exigibilite.acompte_bien';
const OK = { resultat: 'OK' };
const NA = { resultat: 'NON_APPLICABLE' };

describe('CC-T17 à CC-T19 cas particuliers de TVA', () => {
  it('CT-31 detection', () => {
    const o = objet(cession(100000), param(CLE_CESSION, 'a_verifier'));
    expect(regleCCT17.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: CLE_CESSION });
    expect(regleCCT17.evaluer(objet(cession(100000), param(CLE_CESSION, 'valide')))).toEqual(OK);
    expect(regleCCT17.evaluer(objet(cession(100000), param(CLE_CESSION, 'non_verifie')))).toEqual({ resultat: 'ALERTE', valeur: CLE_CESSION });
    expect(regleCCT17.evaluer(objet(acompte, param(CLE_CESSION, 'a_verifier')))).toEqual(NA);
    for (const r of [regleCCT17, regleCCT18, regleCCT19]) {
      expect(r.version).toBe(1);
      expect(r.gravite).toBe('B');
      expect(r.bloque).toEqual(['tva']);
      expect(r.declencheurs).toEqual(['arrivee', 'continu', 'avant_tva', 'a_la_demande']);
      expect(r.actif).toBe(true);
    }
    expect([regleCCT17.id, regleCCT18.id, regleCCT18M.id, regleCCT19.id]).toEqual(['CC-T17', 'CC-T18', 'CC-T18M', 'CC-T19']);
  });

  it('CT-32 detection', () => {
    const valide = objet(acompte, param(CLE_ACOMPTE, 'valide'));
    expect(regleCCT18M.evaluer(valide)).toEqual({ resultat: 'ALERTE', valeur: CLE_ACOMPTE });
    expect(regleCCT18.evaluer(valide)).toEqual(OK);
    expect(regleCCT18M.gravite).toBe('M');
    expect(regleCCT18M.bloque).toEqual([]);
    expect(regleCCT18M.declencheurs).toEqual(['arrivee', 'continu', 'avant_tva', 'a_la_demande']);
    expect(regleCCT18M.evaluer(objet(cession(100000), param(CLE_ACOMPTE, 'valide')))).toEqual(NA);
  });

  it('CT-34', () => {
    const o = objet(perte(20000), param('tva.creance_irrecouvrable', 'a_verifier'));
    expect(regleCCT19.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: 'tva.creance_irrecouvrable' });
    expect(regleCCT19.evaluer(objet(perte(20000), param('tva.creance_irrecouvrable', 'valide')))).toEqual(OK);
    expect(regleCCT19.evaluer(objet(acompte, param('tva.creance_irrecouvrable', 'a_verifier')))).toEqual(NA);
  });

  it('immeuble-toujours-bloque', () => {
    for (const statut of ['valide', 'a_verifier', 'absent'] as const) {
      expect(regleCCT17.evaluer(objet(cession(100000, true), param(CLE_CESSION, statut)))).toEqual({
        resultat: 'ALERTE',
        valeur: CLE_CESSION,
      });
    }
  });

  it('cession-prix-nul-non-applicable', () => {
    expect(regleCCT17.evaluer(objet(cession(0), param(CLE_CESSION, 'a_verifier')))).toEqual(NA);
    expect(regleCCT17.evaluer(objet(cession(1), param(CLE_CESSION, 'a_verifier'))).resultat).toBe('ALERTE');
    for (const prix of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1]) {
      expect(() => regleCCT17.evaluer(objet(cession(prix), param(CLE_CESSION, 'valide')))).toThrow();
    }
  });

  it('acompte-parametre-absent-bloque', () => {
    const o = objet(acompte, param(CLE_ACOMPTE, 'absent'));
    expect(regleCCT18.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: CLE_ACOMPTE });
    expect(regleCCT18M.evaluer(o)).toEqual(OK);
    expect(regleCCT18.evaluer(objet(acompte, param(CLE_ACOMPTE, 'a_verifier'))).resultat).toBe('ALERTE');
  });

  it('acompte-verse-detecte', () => {
    for (const sens of ['recu', 'verse', 'facture_acompte'] as const) {
      const o = objet({ type: 'acompte', sens }, param(CLE_ACOMPTE, 'non_verifie'));
      expect(regleCCT18.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: CLE_ACOMPTE });
    }
  });

  it('creance-sans-tva-non-applicable', () => {
    expect(regleCCT19.evaluer(objet(perte(0), param('tva.creance_irrecouvrable', 'a_verifier')))).toEqual(NA);
    expect(regleCCT19.evaluer(objet(perte(1), param('tva.creance_irrecouvrable', 'a_verifier'))).resultat).toBe('ALERTE');
    for (const tva of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1]) {
      expect(() => regleCCT19.evaluer(objet(perte(tva), param('tva.creance_irrecouvrable', 'valide')))).toThrow();
    }
  });

  it('aucune-ecriture-produite', () => {
    const sorties = [
      regleCCT17.evaluer(objet(cession(100000), param(CLE_CESSION, 'a_verifier'))),
      regleCCT18.evaluer(objet(acompte, param(CLE_ACOMPTE, 'absent'))),
      regleCCT18M.evaluer(objet(acompte, param(CLE_ACOMPTE, 'valide'))),
      regleCCT19.evaluer(objet(perte(20000), param('tva.creance_irrecouvrable', 'a_verifier'))),
    ];
    for (const s of sorties) {
      expect(Object.keys(s).sort()).toEqual(['resultat', 'valeur']);
      expect(s).not.toHaveProperty('lignes');
      expect(s).not.toHaveProperty('ecritures');
    }
  });
});
