import { describe, expect, it } from 'vitest';
import { TRANSITIONS, aRappeler, changerEtat, dateDeRappel, enRetard, nouvelleDemande, transmettreAvantLe } from '../demandes.js';
import { ETATS_DEMANDE, ErreurRgpd, TYPES_DROIT, type DemandePersonne, type EtatDemande, type TypeDroit } from '../types.js';

const MOIS = 1;
const AVANT = 7;
const OUVRES = 2;
const EMP = 'b'.repeat(64);
const SOURCE = 'source fictive A';
function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurRgpd ? e.code : 'autre';
  }
  return undefined;
}
const dem = (type: TypeDroit = 'acces', recueLe = '2027-05-10', id = 'd1') => nouvelleDemande({ id, societeId: 's1', type, recueLe }, { moisReponse: MOIS });
const enCours = (type: TypeDroit = 'acces'): DemandePersonne => changerEtat(dem(type), 'en_cours', { par: 'Camille Test', le: '2027-05-11' }).demande;
const opt = (o: Record<string, unknown> = {}) => ({ par: 'Camille Test', le: '2027-05-12', ...o });
const etat = (e: EtatDemande, base = dem()): DemandePersonne => ({ ...base, etat: e });

describe('demandes de personnes', () => {
  it('echeance-un-mois-fin-de-fevrier', () => {
    const d = dem('acces', '2027-01-31');
    expect(d.echeance).toBe('2027-02-28');
    expect(d).toMatchObject({ etat: 'recue', recueLe: '2027-01-31', traiteePar: null, traiteeLe: null, fichierReponseEmpreinte: null, motifRefus: null, sourceMotif: null });
    expect(dem('acces', '2028-01-31').echeance).toBe('2028-02-29');
    expect(nouvelleDemande({ id: 'x', societeId: 's', type: 'acces', recueLe: '2027-05-10' }, { moisReponse: 3 }).echeance).toBe('2027-08-10');
    expect(code(() => dem('inconnu' as TypeDroit))).toBe('type_inconnu');
    for (const m of [0, -1, 1.5, NaN, Infinity, '1' as unknown as number]) {
      expect(code(() => nouvelleDemande({ id: 'x', societeId: 's', type: 'acces', recueLe: '2027-05-10' }, { moisReponse: m }))).toBe('delai_invalide');
    }
    expect(code(() => dem('acces', '2027-02-30'))).toBe('date_invalide');
    expect(code(() => nouvelleDemande({ id: 'x', societeId: 's', type: 'acces', recueLe: '9999-12-31' }, { moisReponse: 3 }))).toBe('date_invalide');
  });

  it('transitions-permises-et-interdites', () => {
    expect(TRANSITIONS.recue).toEqual(['en_cours', 'transmise_a_la_societe']);
    expect(TRANSITIONS.en_cours).toEqual(['traitee', 'refusee']);
    for (const e of ['traitee', 'refusee', 'transmise_a_la_societe'] as const) expect(TRANSITIONS[e]).toEqual([]);
    expect(changerEtat(dem(), 'transmise_a_la_societe', opt()).demande.etat).toBe('transmise_a_la_societe');
    const c = changerEtat(dem(), 'en_cours', opt());
    expect(c.demande).toMatchObject({ etat: 'en_cours', traiteePar: 'Camille Test', traiteeLe: '2027-05-12' });
    expect(code(() => changerEtat(dem(), 'traitee', opt({ issue: 'acces_produit', fichierEmpreinte: EMP })))).toBe('transition_interdite');
    expect(code(() => changerEtat(dem(), 'refusee', opt({ motif: 'motif fictif', source: SOURCE })))).toBe('transition_interdite');
    expect(code(() => changerEtat(enCours(), 'recue', opt()))).toBe('transition_interdite');
    expect(code(() => changerEtat(enCours(), 'en_cours', opt()))).toBe('transition_interdite');
    expect(code(() => changerEtat(enCours(), 'transmise_a_la_societe', opt()))).toBe('transition_interdite');
    for (const e of ['traitee', 'refusee', 'transmise_a_la_societe'] as const) {
      for (const v of ETATS_DEMANDE) expect(code(() => changerEtat(etat(e), v, opt()))).toBe('deja_traitee');
    }
    expect(code(() => changerEtat(dem(), 'inconnu' as EtatDemande, opt()))).toBe('etat_inconnu');
    expect(code(() => changerEtat(dem(), 'en_cours', opt({ le: '2027-13-01' })))).toBe('date_invalide');
    const d = dem(), copie = structuredClone(d);
    expect(changerEtat(d, 'en_cours', opt()).demande).not.toBe(d);
    expect(d).toEqual(copie);
  });

  it('refus-sans-motif-ou-source-refuse', () => {
    const ok = changerEtat(enCours(), 'refusee', opt({ motif: '  motif fictif ', source: SOURCE }));
    expect(ok.demande).toMatchObject({ etat: 'refusee', motifRefus: 'motif fictif', sourceMotif: SOURCE });
    for (const m of [undefined, '', '   ', '\t']) expect(code(() => changerEtat(enCours(), 'refusee', opt({ motif: m, source: SOURCE })))).toBe('motif_manquant');
    expect(code(() => changerEtat(enCours(), 'refusee', opt({ motif: 'x'.repeat(501), source: SOURCE })))).toBe('motif_manquant');
    for (const s of [undefined, '', '  ']) expect(code(() => changerEtat(enCours(), 'refusee', opt({ motif: 'motif fictif', source: s })))).toBe('source_manquante');
  });

  it('issue-non-permise-pour-le-type', () => {
    expect(code(() => changerEtat(enCours('effacement'), 'traitee', opt({ issue: 'acces_produit', fichierEmpreinte: EMP })))).toBe('issue_non_permise');
    expect(code(() => changerEtat(enCours('effacement'), 'traitee', opt()))).toBe('issue_non_permise');
    expect(code(() => changerEtat(enCours('effacement'), 'traitee', opt({ issue: 'inventee' })))).toBe('issue_non_permise');
    for (const t of TYPES_DROIT) {
      const issue = t === 'effacement' ? 'a_effacer' : t === 'rectification' ? 'rectifiee' : t === 'limitation' || t === 'opposition' ? 'limitee' : t === 'acces' ? 'acces_produit' : 'portabilite_produite';
      expect(changerEtat(enCours(t), 'traitee', opt({ issue, fichierEmpreinte: EMP })).demande.etat).toBe('traitee');
    }
    expect(code(() => changerEtat(enCours('portabilite'), 'traitee', opt({ issue: 'acces_produit', fichierEmpreinte: EMP })))).toBe('issue_non_permise');
  });

  it('acces-produit-exige-empreinte', () => {
    for (const [t, i] of [['acces', 'acces_produit'], ['portabilite', 'portabilite_produite']] as const) {
      for (const e of [undefined, '', 'xyz', 'B'.repeat(64), 'b'.repeat(63), 'b'.repeat(65)]) {
        expect(code(() => changerEtat(enCours(t), 'traitee', opt({ issue: i, fichierEmpreinte: e })))).toBe('empreinte_invalide');
      }
      expect(changerEtat(enCours(t), 'traitee', opt({ issue: i, fichierEmpreinte: EMP })).demande.fichierReponseEmpreinte).toBe(EMP);
    }
    expect(changerEtat(enCours('rectification'), 'traitee', opt({ issue: 'rectifiee' })).demande.fichierReponseEmpreinte).toBeNull();
    expect(changerEtat(enCours(), 'traitee', opt({ issue: 'renvoi_societe' })).demande.etat).toBe('traitee');
  });

  it('evenement-sans-motif-en-clair', () => {
    const motif = 'motif secret fictif';
    const r = changerEtat(enCours('effacement'), 'refusee', opt({ motif, source: SOURCE }));
    expect(JSON.stringify(r.evenement)).not.toContain(motif);
    expect(JSON.stringify(r.evenement)).not.toContain(SOURCE);
    expect(r.evenement).toEqual({
      type: 'personne.effacement_refuse', horodatage: '2027-05-12', demandeId: 'd1',
      donnees: { type: 'effacement', issue: null, motifFourni: true },
    });
    const t = changerEtat(enCours(), 'traitee', opt({ issue: 'acces_produit', fichierEmpreinte: EMP }));
    expect(t.evenement).toEqual({
      type: 'personne.acces_produit', horodatage: '2027-05-12', demandeId: 'd1',
      donnees: { type: 'acces', issue: 'acces_produit', motifFourni: false },
    });
    expect(JSON.stringify(t.evenement)).not.toContain(EMP);
    expect(changerEtat(enCours('portabilite'), 'traitee', opt({ issue: 'portabilite_produite', fichierEmpreinte: EMP })).evenement.type).toBe('personne.portabilite_produite');
    expect(changerEtat(enCours('rectification'), 'traitee', opt({ issue: 'rectifiee' })).evenement.type).toBe('personne.rectification');
    expect(changerEtat(enCours('effacement'), 'traitee', opt({ issue: 'a_effacer' })).evenement.type).toBe('personne.marque_a_effacer');
    expect(changerEtat(enCours('limitation'), 'traitee', opt({ issue: 'limitee' })).evenement.type).toBe('personne.limitation');
    expect(changerEtat(enCours('effacement'), 'traitee', opt({ issue: 'refus_gel' })).evenement.type).toBe('personne.effacement_refuse');
    expect(changerEtat(enCours('effacement'), 'traitee', opt({ issue: 'refus_conservation' })).evenement.type).toBe('personne.effacement_refuse');
    expect(changerEtat(dem(), 'en_cours', opt()).evenement.type).toBe('personne.demande_recue');
    expect(changerEtat(dem(), 'transmise_a_la_societe', opt()).evenement.donnees).toEqual({ type: 'acces', issue: null, motifFourni: false });
  });

  it('rappel-a-j-moins-sept', () => {
    const d = dem('acces', '2027-05-10');
    expect(d.echeance).toBe('2027-06-10');
    expect(dateDeRappel(d, AVANT)).toBe('2027-06-03');
    expect(dateDeRappel(d, 0)).toBe('2027-06-10');
    expect(aRappeler([d], '2027-06-02', AVANT)).toEqual([]);
    expect(aRappeler([d], '2027-06-03', AVANT)).toEqual(['d1']);
    expect(aRappeler([d], '2027-06-10', AVANT)).toEqual(['d1']);
    expect(aRappeler([d], '2027-06-11', AVANT)).toEqual([]);
    for (const e of ['traitee', 'refusee', 'transmise_a_la_societe'] as const) expect(aRappeler([etat(e, d)], '2027-06-05', AVANT)).toEqual([]);
    expect(aRappeler([etat('en_cours', d), { ...d, id: 'd2' }], '2027-06-05', AVANT)).toEqual(['d1', 'd2']);
    expect(aRappeler([], '2027-06-05', AVANT)).toEqual([]);
    for (const n of [NaN, Infinity, -1, 1.5, -Infinity]) {
      expect(code(() => aRappeler([d], '2027-06-05', n))).toBe('delai_invalide');
      expect(code(() => dateDeRappel(d, n))).toBe('delai_invalide');
    }
    expect(code(() => aRappeler([d], '05/06/2027', AVANT))).toBe('date_invalide');
    expect(code(() => aRappeler([], '2027-02-30', AVANT))).toBe('date_invalide');
  });

  it('retard-le-lendemain-seulement', () => {
    const d = dem('acces', '2027-05-10');
    expect(enRetard([d], '2027-06-10')).toEqual([]);
    expect(enRetard([d], '2027-06-11')).toEqual(['d1']);
    expect(enRetard([d], '2027-06-09')).toEqual([]);
    for (const e of ['traitee', 'refusee', 'transmise_a_la_societe'] as const) expect(enRetard([etat(e, d)], '2027-09-01')).toEqual([]);
    expect(enRetard([etat('en_cours', d), { ...d, id: 'd2', echeance: '2027-08-01' }], '2027-06-11')).toEqual(['d1']);
    expect(enRetard([], '2027-06-11')).toEqual([]);
    expect(code(() => enRetard([d], 'demain'))).toBe('date_invalide');
    expect(code(() => enRetard([], '2027-00-10'))).toBe('date_invalide');
  });

  it('transmission-saute-le-week-end', () => {
    expect(transmettreAvantLe('2027-05-14', OUVRES)).toBe('2027-05-18');
    expect(transmettreAvantLe('2027-05-10', OUVRES)).toBe('2027-05-12');
    expect(transmettreAvantLe('2027-05-13', OUVRES)).toBe('2027-05-17');
    expect(transmettreAvantLe('2027-05-15', 1)).toBe('2027-05-17');
    expect(transmettreAvantLe('2027-05-16', OUVRES)).toBe('2027-05-18');
    expect(transmettreAvantLe('2027-05-14', 0)).toBe('2027-05-14');
    expect(transmettreAvantLe('2027-05-14', 5)).toBe('2027-05-21');
    for (const n of [NaN, Infinity, -1, 1.5, -Infinity, 1e15, '2' as unknown as number]) expect(code(() => transmettreAvantLe('2027-05-14', n))).toBe('delai_invalide');
    expect(code(() => transmettreAvantLe('2027-02-30', OUVRES))).toBe('date_invalide');
    expect(code(() => transmettreAvantLe('9999-12-30', OUVRES))).toBe('date_invalide');
  });
});
