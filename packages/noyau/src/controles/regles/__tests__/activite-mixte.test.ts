import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { executerControles } from '../../moteur.js';
import { regleCCT20, type ObjetActiviteMixte } from '../activite-mixte.js';

// Société fictive « mixte » : une partie des ventes ouvre droit à déduction, l'autre non.
const EXO = ['EXONEREE_FICTIVE'];
const objet = (p: Partial<ObjetActiviteMixte> = {}): ObjetActiviteMixte => ({
  ventes: [{ codeTva: 'COLLECTEE' }, { codeTva: 'COLLECTEE' }],
  codesExoneres: EXO,
  activiteMixte: false,
  ...p,
});
const ALERTE = { resultat: 'ALERTE', valeur: 'activite_mixte_expert' };

describe('CC-T20 activité mixte ou ventes exonérées', () => {
  it('societe-mixte-declaration-bloquee', () => {
    expect(regleCCT20.evaluer(objet({ activiteMixte: true }))).toEqual(ALERTE);
    expect(regleCCT20.evaluer(objet({ activiteMixte: true, ventes: [] }))).toEqual(ALERTE);
    expect(regleCCT20).toMatchObject({ id: 'CC-T20', version: 1, gravite: 'B', bloque: ['tva'], actif: true });
    expect(regleCCT20.declencheurs).toEqual(['arrivee', 'continu', 'avant_tva', 'a_la_demande']);
    const traces = executerControles([regleCCT20], [{ type: 'periode', id: 'P1', donnee: objet({ activiteMixte: true }) }], 'avant_tva', 'h');
    expect(traces.map((t) => [t.resultat, t.valeur])).toEqual([['ALERTE', 'activite_mixte_expert']]);
  });

  it('vente-exoneree-declaration-bloquee', () => {
    expect(regleCCT20.evaluer(objet({ ventes: [{ codeTva: 'COLLECTEE' }, { codeTva: 'EXONEREE_FICTIVE' }] }))).toEqual(ALERTE);
    expect(regleCCT20.evaluer(objet({ ventes: [{ codeTva: 'EXONEREE_FICTIVE' }] }))).toEqual(ALERTE);
    // Sans la liste des codes exonérés en argument, ce code n'est pas reconnu.
    expect(regleCCT20.evaluer(objet({ ventes: [{ codeTva: 'EXONEREE_FICTIVE' }], codesExoneres: [] }))).toEqual({ resultat: 'OK' });
  });

  it('exoneree-a-verifier-bloquee', () => {
    const o = objet({ ventes: [{ codeTva: 'COLLECTEE' }, { codeTva: 'EXONEREE_A_VERIFIER' }], codesExoneres: [] });
    expect(regleCCT20.evaluer(o)).toEqual(ALERTE);
    expect(regleCCT20.evaluer(objet({ ventes: [{ codeTva: 'EXONEREE_A_VERIFIER' }] }))).toEqual(ALERTE);
    expect(regleCCT20.evaluer(objet({ ventes: [{ codeTva: 'exoneree_a_verifier' }], codesExoneres: [] }))).toEqual({ resultat: 'OK' });
  });

  it('ventes-taxables-seules-aucun-blocage', () => {
    expect(regleCCT20.evaluer(objet())).toEqual({ resultat: 'OK' });
    expect(regleCCT20.evaluer(objet({ ventes: [] }))).toEqual({ resultat: 'OK' });
    expect(regleCCT20.evaluer(objet({ ventes: [{ codeTva: 'FRANCHISE' }, { codeTva: 'A_VERIFIER' }] }))).toEqual({ resultat: 'OK' });
    const mal = [{ ...objet(), activiteMixte: 'oui' }, { ...objet(), ventes: [{ codeTva: 1 }] }, { ...objet(), ventes: null }, { ...objet(), codesExoneres: undefined }];
    for (const m of mal) {
      const t = executerControles([regleCCT20], [{ type: 'periode', id: 'P', donnee: m as unknown as ObjetActiviteMixte }], 'avant_tva', 'h');
      expect(t.map((x) => x.resultat)).toEqual(['IMPOSSIBLE']);
    }
  });

  it('aucune-ecriture-produite', () => {
    for (const o of [objet(), objet({ activiteMixte: true }), objet({ ventes: [{ codeTva: 'EXONEREE_A_VERIFIER' }] })]) {
      const sortie = regleCCT20.evaluer(o);
      expect(Object.keys(sortie).every((k) => k === 'resultat' || k === 'valeur')).toBe(true);
      expect(sortie).not.toHaveProperty('ecartCentimes');
    }
  });

  it('texte-cc-t20-present', () => {
    const csv = readFileSync(new URL('../../../../../../docs/controles.csv', import.meta.url), 'utf8').split('\n');
    const ligne = csv.find((l) => l.startsWith('CC-T20,'));
    expect(ligne).toBe('CC-T20,V3-TVA-027,B,preparation_tva,arrivee|continu|avant_tva|demande,P7,societe-mixte-declaration-bloquee,,oui');
    const textes = readFileSync(new URL('../../../../../textes/src/controles/tva.ts', import.meta.url), 'utf8');
    expect(textes).toContain("'CC-T20':");
  });
});
