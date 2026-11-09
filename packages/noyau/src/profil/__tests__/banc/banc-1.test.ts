// Banc du profil 1 : cas P01 à P12 de la spec 09 (05-cas-de-test.md), chiffres de la spec. Sociétés fictives.
import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../../argent/index.js';
import { profilCodes } from '../../../../../textes/src/ecrans/profil-codes.js';
import { evaluerSources, type Source } from '../../aucun-doute.js';
import { ajouterValeur, confirmer } from '../../champs.js';
import { etatProfil, tvaCalculable } from '../../etat.js';
import { comptesProposes, regleDeForme, type LigneRegleForme } from '../../forme.js';
import { cleTvaFrancaise, sirenValide, verifierTvaFrancaise } from '../../identifiants.js';
import { rechercherSirene, statutVies, type Reglage, type SourceSirene, type SourceVies } from '../../identite-externe.js';
import { detentionAuMoins, type Associe } from '../../associes.js';
import { calculerIs } from '../../fiscal/calcul-is.js';
import { impotParDefaut } from '../../fiscal/imposition.js';
import { etatFranchise, niveauSeuil, propositionChangementRegime } from '../../fiscal/seuils.js';
import type { ChampProfil } from '../../types.js';
import { ARRONDI_TEST, DELAI_TEST_MS, FRAICHEUR_TEST_MOIS, LIMITE_SAISIE_MS, param } from './parametres-de-test.js';

const c = (n: number): Centimes => centimes(n);
const SIREN = '123456782';
const SIREN_FAUX = '123456789';
const SOC = 'soc-lemoine-renovation';
const JOUR = '2026-11-06';
const horloge = { setTimeout: (f: () => void, ms: number) => setTimeout(f, ms), clearTimeout: (h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>) };
const reglage: Reglage = { delaiMaxMs: DELAI_TEST_MS, horloge };
const PARAM_IS = { tauxReduitPdb: param('is.taux.reduit'), tauxNormalPdb: param('is.taux.normal'), plafondCentimes: c(param('is.plafond_benefice_reduit')), arrondi: ARRONDI_TEST };
const BENEFICE = c(6000000);
const associes = (partPhysiquePdb: number): Associe[] => [
  { id: 'a1', nature: 'physique', roles: ['associe'], partPdb: partPhysiquePdb },
  { id: 'a2', nature: 'morale', roles: ['associe'], partPdb: 10000 - partPhysiquePdb },
];
const eligibilite = (partPdb: number): 'eligible' | 'non_eligible' => (detentionAuMoins(associes(partPdb), param('is.taux_reduit.detention_pp')) ? 'eligible' : 'non_eligible');
const source = (valeur: string, origine: Source['origine'], dateSource: string): Source => ({ origine, valeur, confiance: 'sur', dateSource, ref: origine + dateSource });
const seuilServices = (pdb: number) => ({ seuilCentimes: c(pdb), alertePdb: param('alerte.seuil_pct') });
const ligne = (forme: string, comportement: LigneRegleForme['comportement'], valeur: string): LigneRegleForme => ({ forme, comportement, valeur, source: 'matrice de test du banc, plan comptable général (comptes 108, 1013, 455)' });

describe('banc profil 1', () => {
  it('P01', () => {
    expect(sirenValide(SIREN)).toBe(true);
    expect(sirenValide(SIREN_FAUX)).toBe(false);
    expect(profilCodes.phraseDeCode('identifiants', 'siren_invalide')).toBe("Ce numéro SIREN n'est pas valide : vérifiez les 9 chiffres");
  });

  it('P02', async () => {
    expect(cleTvaFrancaise(SIREN)).toBe('11');
    expect(verifierTvaFrancaise('FR11' + SIREN)).toEqual({ valide: true });
    expect(verifierTvaFrancaise('FR12' + SIREN)).toMatchObject({ valide: false, motif: 'cle_fausse' });
    const indisponible: SourceVies = { verifier: () => Promise.reject(new Error('vies_indisponible')) };
    expect(await statutVies(indisponible, 'FR11' + SIREN, reglage)).toBe('non_verifie');
  });

  it('P03', async () => {
    const enPanne: SourceSirene = { chercher: () => Promise.reject(new Error('sirene_en_panne')) };
    const debut = Date.now();
    const r = await rechercherSirene(enPanne, SIREN, reglage);
    expect(Date.now() - debut).toBeLessThan(LIMITE_SAISIE_MS);
    expect(r).toEqual({ etat: 'saisie_manuelle', origine: 'saisie_personne' });
  });

  it('P04', () => {
    const autres = ['denomination', 'forme', 'siren', 'exercice_debut', 'exercice_fin', 'regime_imposition', 'tenue'];
    let h: readonly ChampProfil[] = [];
    for (const cle of autres) {
      h = ajouterValeur(h, { societeId: SOC, cle, valeur: cle === 'forme' ? 'SARL' : 'x', origine: 'saisie_personne', confiance: 'sur' }, JOUR);
      h = confirmer(h, { societeId: SOC, cle, effetDebut: JOUR }, { type: 'personne', id: 'personne-exemple' }, JOUR + 'T10:00:00Z');
    }
    h = ajouterValeur(h, { societeId: SOC, cle: 'regime_tva', valeur: null, origine: 'proposition_ia', confiance: 'a_verifier', statut: 'a_confirmer' }, JOUR);
    const e = etatProfil(h, SOC, JOUR);
    expect(e.etat).toBe('a_confirmer');
    expect(e.aConfirmer).toEqual(['regime_tva']);
    const t = tvaCalculable(h, SOC, JOUR);
    expect(t).toEqual({ calculable: false, motif: 'regime_tva_a_confirmer' });
    expect(profilCodes.phraseDeCode('etats', 'regime_tva_a_confirmer')).toBe('Votre régime de TVA est encore à confirmer');
    expect(profilCodes.phraseDeCode('etats', 'tva_non_calculee')).toBe('TVA non calculée : régime à confirmer');
  });

  it('P05', () => {
    const opts = { dateDuJour: JOUR, fraicheurMois: FRAICHEUR_TEST_MOIS };
    const r = evaluerSources([source('SARL', 'document', '2026-09-02'), source('SARL', 'sirene', JOUR)], opts);
    expect(r).toMatchObject({ decision: 'confirme_sans_question', valeurs: ['SARL'], origines: ['document', 'sirene'] });
    const ancien = evaluerSources([source('SARL', 'document', '2019-09-02')], opts);
    expect(ancien.decision).toBe('a_confirmer');
  });

  it('P06', () => {
    const matrice = [
      ligne('SAS', 'compte_capital', '1013'), ligne('SAS', 'compte_courant_associe', '455'),
      ligne('EI', 'compte_exploitant', '108'),
    ];
    expect(comptesProposes(matrice, 'SAS')).toEqual(['1013', '455']);
    expect(comptesProposes(matrice, 'SAS')).not.toContain('108');
    expect(regleDeForme(matrice, 'SAS', 'compte_exploitant')).toBeNull();
    expect(comptesProposes(matrice, 'EI')).toEqual(['108']);
    expect(regleDeForme(matrice, 'EI', 'compte_courant_associe')).toBeNull();
    expect(regleDeForme(matrice, 'EI', 'compte_capital')).toBeNull();
  });

  it('P07', () => {
    const matrice = [ligne('EURL_PP', 'impot_par_defaut', 'IR'), ligne('EURL_PM', 'impot_par_defaut', 'IS'), ligne('SARL', 'impot_par_defaut', 'IS')];
    expect(impotParDefaut(matrice, 'EURL', true)).toEqual({ impot: 'IR', statut: 'a_confirmer' });
    expect(impotParDefaut(matrice, 'SARL', null)).toEqual({ impot: 'IS', statut: 'a_confirmer' });
  });

  it('P08', () => {
    expect(eligibilite(10000)).toBe('eligible');
    const r = calculerIs({ beneficeCentimes: BENEFICE, dureeMois: 12, eligibilite: 'eligible' }, PARAM_IS);
    expect(r).toMatchObject({ statut: 'calcule', partReduite: c(637500), partNormale: c(437500), impotCentimes: c(1075000) });
    expect(profilCodes.origines.proposition_ia).toBe('Préparé par IA, à valider');
  });

  it('P09', () => {
    const r = calculerIs({ beneficeCentimes: BENEFICE, dureeMois: 18, eligibilite: 'eligible' }, PARAM_IS);
    expect(r.statut).toBe('a_verifier');
    expect(r.impotCentimes).toBeNull();
    const texte = JSON.stringify(r);
    for (const interdit of ['63750', '6375000', '63 750']) expect(texte).not.toContain(interdit);
    expect(r.partReduite).toBe(c(0));
    expect(r.partNormale).toBe(c(0));
  });

  it('P10', () => {
    const statut = eligibilite(6000);
    expect(statut).toBe('non_eligible');
    const r = calculerIs({ beneficeCentimes: BENEFICE, dureeMois: 12, eligibilite: statut }, PARAM_IS);
    expect(r).toMatchObject({ statut: 'calcule', partReduite: c(0), impotCentimes: c(1500000) });
  });

  it('P11', () => {
    const plafond = param('micro.plafond.services');
    expect(niveauSeuil(c(7524000), seuilServices(plafond))).toBe('alerte');
    expect(niveauSeuil(c(7523999), seuilServices(plafond))).toBe('sous');
    const change = plafond + 140000;
    expect(niveauSeuil(c(7650000), seuilServices(change))).toBe('alerte');
    expect(niveauSeuil(c(7649999), seuilServices(change))).toBe('sous');
    expect(niveauSeuil(c(7524000), seuilServices(change))).toBe('sous');
  });

  it('P12', () => {
    const f = { seuilBase: c(param('tva.franchise.seuil.services.base')), seuilMajore: c(param('tva.franchise.seuil.services.majore')), alertePdb: param('alerte.seuil_pct'), statutParametre: 'sur' as const };
    const avant = etatFranchise(c(4100000), f);
    expect(avant.niveau).toBe('base_depasse');
    expect(propositionChangementRegime(avant, { societeId: 'soc-atelier-bertin', dateEffet: '2026-09-12' })).toBeNull();
    const historique = ajouterValeur([], { societeId: 'soc-atelier-bertin', cle: 'regime_tva', valeur: 'franchise', origine: 'saisie_personne', confiance: 'sur' }, JOUR);
    const copie = JSON.stringify(historique);
    const apres = etatFranchise(c(4150000), f);
    expect(apres.niveau).toBe('majore_depasse');
    const p = propositionChangementRegime(apres, { societeId: 'soc-atelier-bertin', dateEffet: '2026-09-12' });
    expect(p).toMatchObject({ type: 'nouvelle_ligne_regime_tva', motif: 'depassement_seuil', statut: 'propose', effetDebut: '2026-09-12' });
    expect(JSON.stringify(historique)).toBe(copie);
    expect(historique).toHaveLength(1);
  });
});
