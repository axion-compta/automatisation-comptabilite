import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { ErreurReponses, repondre, resoudreAutomatiquement, type Contexte, type DemandeSuivie } from '../reponses.js';

const c = centimes;
const demande = (ligneIds: string[], impact: number, o: Partial<DemandeSuivie> = {}): DemandeSuivie => ({
  cle: 'c:cp-a|piece_attendue', ligneIds, impact: c(impact), nombre: ligneIds.length, type: 'piece_attendue', codeQuestion: 'factures_manquantes',
  reponsesPretes: ['je_les_depose', 'ou_les_trouver', 'pas_de_facture', 'c_est_personnel'], etat: 'ouverte', ...o,
});
const ctx = (o: Partial<Contexte> = {}): Contexte => ({
  motifsPermis: ['perdue', 'achat_sans_facture'], compteAssocie: 'COMPTE-ASSOCIE-1', acteur: { type: 'personne', id: 'u1' }, horodatage: '2026-03-10T09:30:00Z', ...o,
});
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurReponses ? e.code : 'autre';
  }
  return undefined;
};
const d1 = demande(['l1'], 3500);

describe('repondre', () => {
  it('t07-3-personnel-associe-propose', () => {
    const r = repondre(d1, { type: 'c_est_personnel' }, ctx());
    expect(r.effets).toEqual([{ type: 'proposer_associe', ligneIds: ['l1'], comptePropose: 'COMPTE-ASSOCIE-1' }]);
    expect(r.demande).toMatchObject({ etat: 'repondue', reponse: 'c_est_personnel' });
  });
  it('personnel-sans-changement-d-etat', () => {
    const avant = structuredClone(d1);
    const r = repondre(d1, { type: 'c_est_personnel' }, ctx());
    expect(d1).toEqual(avant);
    expect(r.effets.map((e) => e.type)).toEqual(['proposer_associe']);
    expect(r.demande.ligneIds).toEqual(['l1']);
    expect(JSON.stringify(r)).not.toContain('PERSO');
  });
  it('pas-de-facture-motif-trace', () => {
    const r = repondre(d1, { type: 'pas_de_facture', motif: 'perdue' }, ctx());
    expect(r.effets).toEqual([{ type: 'decision_sans_justificatif', ligneIds: ['l1'], motif: 'perdue', par: 'u1', le: '2026-03-10T09:30:00Z' }]);
    expect(r.demande).toMatchObject({ etat: 'repondue', motif: 'perdue' });
  });
  it('motif-hors-liste-refuse', () => {
    expect(code(() => repondre(d1, { type: 'pas_de_facture' }, ctx()))).toBe('motif_invalide');
    expect(code(() => repondre(d1, { type: 'pas_de_facture', motif: 'autre_chose' }, ctx()))).toBe('motif_invalide');
    expect(code(() => repondre(d1, { type: 'pas_de_facture', motif: '' }, ctx({ motifsPermis: [''] })))).toBe('motif_invalide');
    expect(code(() => repondre(d1, { type: 'pas_de_facture', motif: 'perdue' }, ctx({ motifsPermis: [] })))).toBe('motif_invalide');
  });
  it('ia-ne-decide-pas-sans-justificatif', () => {
    const ia = ctx({ acteur: { type: 'ia', id: 'agent' } });
    expect(code(() => repondre(d1, { type: 'pas_de_facture', motif: 'perdue' }, ia))).toBe('reponse_reservee_a_une_personne');
    expect(code(() => repondre(d1, { type: 'c_est_personnel' }, ia))).toBe('reponse_reservee_a_une_personne');
  });
  it('ou-les-trouver-brouillon-a-preparer', () => {
    expect(repondre(d1, { type: 'ou_les_trouver' }, ctx()).effets).toEqual([{ type: 'brouillon_a_preparer' }]);
    expect(repondre(d1, { type: 'je_les_depose' }, ctx()).effets).toEqual([{ type: 'attendre_depot' }]);
  });
  it('cas-limites', () => {
    const faite = repondre(d1, { type: 'je_les_depose' }, ctx()).demande;
    expect(code(() => repondre(faite, { type: 'je_les_depose' }, ctx()))).toBe('deja_repondue');
    for (const h of ['', 'hier', '2026-02-30T09:30:00Z', '2026-03-10', '2026-03-10T99:99:99Z', '2026-03-10T24:00:00Z', '2026-03-10T09:60:00Z', '2026-03-10T09:30:00nimportequoi', '2026-03-10T09:30:00']) expect(code(() => repondre(d1, { type: 'je_les_depose' }, ctx({ horodatage: h })))).toBe('horodatage_invalide');
    expect(code(() => repondre(d1, { type: 'c_est_personnel' }, ctx({ compteAssocie: '' })))).toBe('compte_associe_invalide');
    expect(code(() => repondre(d1, { type: 'c_est_personnel' }, ctx({ acteur: { type: 'personne', id: '' } })))).toBe('acteur_invalide');
    expect(code(() => repondre(d1, { type: 'inconnue' as never }, ctx()))).toBe('reponse_inconnue');
  });
});

describe('resoudreAutomatiquement', () => {
  const lien = (ligneId: string, montantLigne: number) => ({ ligneId, montantLigne: c(montantLigne) });
  it('t07-4-auto-resolue', () => {
    const [r] = resoudreAutomatiquement([demande(['l1', 'l2'], 5000)], [lien('l2', -2000), lien('l1', -3000)]);
    expect(r).toMatchObject({ etat: 'auto_resolue', codeMessage: 'piece_arrivee' });
  });
  it('resolution-partielle-impact-recalcule', () => {
    const entree = [demande(['l1', 'l2', 'l3'], 6000)];
    const avant = structuredClone(entree);
    const [r] = resoudreAutomatiquement(entree, [lien('l2', -2000), lien('l2', -2000)]);
    expect(r).toMatchObject({ etat: 'ouverte', ligneIds: ['l1', 'l3'], nombre: 2, impact: 4000 });
    expect(r?.codeMessage).toBeUndefined();
    expect(entree).toEqual(avant);
  });
  it('liens-vides-et-ligne-inconnue-ne-changent-rien', () => {
    const entree = [demande(['l1'], 3000), demande(['l9'], 100, { etat: 'repondue', reponse: 'c_est_personnel' }), demande(['l8'], 100, { etat: 'auto_resolue' })];
    expect(resoudreAutomatiquement(entree, [])).toEqual(entree);
    expect(resoudreAutomatiquement(entree, [lien('inconnue', -5)])).toEqual(entree);
    expect(resoudreAutomatiquement(entree, [lien('l9', -100), lien('l8', -100)]).map((x) => x.etat)).toEqual(['ouverte', 'repondue', 'auto_resolue']);
  });
  it('depot-apres-je-les-depose-auto-resolue', () => {
    const entree = [demande(['l9'], 100, { etat: 'repondue', reponse: 'je_les_depose' }), demande(['l8'], 100, { etat: 'repondue', reponse: 'ou_les_trouver' })];
    expect(resoudreAutomatiquement(entree, [lien('l9', -100), lien('l8', -100)]).map((x) => x.etat)).toEqual(['auto_resolue', 'auto_resolue']);
  });
  it('montant-invalide-refuse', () => {
    expect(code(() => resoudreAutomatiquement([demande(['l1', 'l2'], 5000)], [{ ligneId: 'l1', montantLigne: Number.NaN as never }]))).toBe('montant_invalide');
  });
});
