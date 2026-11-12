import { describe, expect, it } from 'vitest';
import { genererFrais, type JeuFrais } from '../../../../packages/donnees-fictives/src/frais.js';
import { creerServiceFraisActions } from '../../../../packages/contrat/src/domaines/frais-actions-service.js';
import { creerServiceFraisValidation } from '../../../../packages/contrat/src/domaines/frais-validation-service.js';
import { creerBoiteEnvoiMemoire } from '../../../../packages/noyau/src/evenements/memoire.js';
import type { Enveloppe } from '../../../../packages/noyau/src/evenements/enveloppe.js';
import { configEssai } from '../domaines/frais-validation.js';
import { creerFraisActionsPublies, creerFraisPublies, evenementRegularisationIk, type ContexteFrais } from '../domaines/frais-evenements.js';

const SOCIETE = 'soc-lemoine';
const PER = 'PER-01';
const CTX = (cle: string): ContexteFrais => ({ societeId: SOCIETE, acteur: { type: 'personne', id: PER }, canal: 'api', correlationId: 'corr-essai-1', cleIdempotence: cle, horodatage: '2026-11-12T08:00:00.000Z' });
function jeu(): JeuFrais {
  const j = genererFrais();
  for (const v of j.vehicules.slice(0, 2)) Object.assign(v, { carteGrisePieceId: 'PIE-CG' + v.id });
  return j;
}
function monter() {
  const boite = creerBoiteEnvoiMemoire();
  const jeuCommun = jeu();
  jeuCommun.lignesBanque.push({ id: 'LIB-002', carteId: 'CAR-01', date: '2025-04-08', libelle: 'Station fictive', montantCentimes: -5200 });
  const versionDe = (id: string): number | undefined => jeuCommun.frais.find((f) => f.id === id)?.version;
  const frais = creerFraisPublies(creerServiceFraisValidation(jeuCommun, configEssai()), boite, versionDe);
  const actions = creerFraisActionsPublies(creerServiceFraisActions({ jeu: jeuCommun }), boite);
  const lus = async (): Promise<readonly Enveloppe[]> => boite.enAttente(100);
  return { frais, actions, boite, lus, jeuCommun };
}
const types = (l: readonly Enveloppe[]): string[] => l.map((e) => e.type);
const TRAJET = { nature: 'trajet', personneId: PER, date: '2025-06-11', depart: 'Siège fictif', arrivee: 'Atelier Bertin', motif: 'Visite fictive', vehiculeId: 'VEH-01', kmTexte: '12,5' } as const;
const DEPENSE = { nature: 'depense', personneId: PER, date: '2025-06-10', libelle: 'Achat fictif', montantTtcCentimes: 1234 } as const;
const SOCIETE_PAYE = { ...DEPENSE, date: '2025-04-08', montantTtcCentimes: 5200 } as const;

describe('serveur : événements des frais sur le bus', () => {
  it('un-evenement-par-transition', async () => {
    const { frais, actions, lus } = monter();
    const brouillon = await actions.creer(CTX('cle-0'), DEPENSE);
    expect([brouillon.statut, await lus()]).toEqual(['a_completer', []]);
    const t = await actions.creer(CTX('cle-1'), TRAJET);
    expect(t.statut).toBe('propose');
    expect(types(await lus())).toEqual(['compta.frais.propose']);
    await actions.completer(CTX('cle-1b'), t.id, { partPersoTtcCentimes: 0 }, t.version);
    expect(types(await lus())).toEqual(['compta.frais.propose']);
    await frais.valider(CTX('cle-2'), { ids: [t.id], confirmeRecapitulatif: true });
    await frais.preparer(CTX('cle-3'), { personneId: PER, fraisIds: ['FRA-003'] });
    const tous = await lus();
    expect(types(tous)).toEqual(['compta.frais.propose', 'compta.frais.valide', 'compta.remboursement.prepare']);
    expect(tous.map((e) => e.objet_id).slice(0, 2)).toEqual([t.id, t.id]);
    expect(tous[0]?.version).toBe(t.version);
    expect(new Set(tous.map((e) => e.id)).size).toBe(3);
  });
  it('echec-de-transaction-aucun-evenement', async () => {
    const { frais, actions, lus } = monter();
    await expect(frais.valider(CTX('cle-1'), { ids: ['FRA-005', 'FRA-999'] })).rejects.toThrow();
    await expect(actions.completer(CTX('cle-2'), 'FRA-999', {}, 1)).rejects.toThrow();
    // Mutation faite (bon acteur), puis construction de l'événement en échec (horodatage non UTC) : rejet, boîte vide.
    await expect(actions.creer({ ...CTX('cle-3'), horodatage: 'pas-utc' }, TRAJET)).rejects.toThrow('horodatage_non_utc');
    expect(await lus()).toEqual([]);
  });
  it('version-reelle-des-evenements', async () => {
    const { frais, actions, lus, jeuCommun } = monter();
    const b = await actions.creer(CTX('cle-0'), DEPENSE);
    const p = await actions.completer(CTX('cle-1'), b.id, { declaration: 'personne', pieceId: 'PIE-ESSAI' }, b.version);
    const t = await actions.creer(CTX('cle-3'), TRAJET);
    await frais.valider(CTX('cle-2'), { ids: [t.id] });
    const reelle = jeuCommun.frais.find((f) => f.id === t.id)?.version;
    expect([b.statut, p.statut, p.version > 1, (reelle ?? 0) > t.version]).toEqual(['a_completer', 'propose', true, true]);
    expect((await lus()).map((e) => [e.type, e.version])).toEqual([['compta.frais.propose', p.version], ['compta.frais.propose', t.version], ['compta.frais.valide', reelle]]);
  });
  it('version-inconnue-valider-aboutit-sans-evenement', async () => {
    const boite = creerBoiteEnvoiMemoire();
    const j = jeu();
    const t = await creerFraisActionsPublies(creerServiceFraisActions({ jeu: j }), boite).creer(CTX('cle-0'), TRAJET);
    const lot = await creerFraisPublies(creerServiceFraisValidation(j, configEssai()), boite).valider(CTX('cle-1'), { ids: [t.id] });
    expect([lot.length, j.frais.find((f) => f.id === t.id)?.statut, types(await boite.enAttente(100))]).toEqual([1, 'valide', ['compta.frais.propose']]);
  });
  it('idempotence-pas-de-double-evenement', async () => {
    const { actions, lus } = monter();
    const un = await actions.creer(CTX('cle-rejeu'), TRAJET);
    const deux = await actions.creer(CTX('cle-rejeu'), TRAJET);
    expect(deux).toEqual(un);
    expect(types(await lus())).toEqual(['compta.frais.propose']);
  });
  it('charge-sans-montant-ni-donnee-personnelle', async () => {
    const { frais, actions, lus } = monter();
    const t = await actions.creer(CTX('cle-1'), TRAJET);
    await actions.creer(CTX('cle-4'), SOCIETE_PAYE);
    await frais.valider(CTX('cle-2'), { ids: [t.id] });
    await frais.preparer(CTX('cle-3'), { personneId: PER, fraisIds: ['FRA-003'] });
    const tous = await lus();
    expect(tous).toHaveLength(4);
    for (const e of tous) {
      expect(e.charge).toBeTypeOf('object');
      for (const [cle, v] of Object.entries(e.charge)) {
        expect(cle).not.toMatch(/montant|total|centime|nom|email|iban|adresse/);
        expect(typeof v === 'string' || typeof v === 'boolean' || v === null).toBe(true);
        if (typeof v === 'string') expect(v).not.toMatch(/@|^\d+([.,]\d+)?$/);
      }
      expect(JSON.stringify(e.charge)).not.toMatch(/libell|justificatif|Station|Atelier/i);
    }
    expect(tous[0]?.charge).toEqual({ frais_id: t.id, statut: 'propose' });
  });
  it('exclu-paye-societe-publie', async () => {
    const { actions, lus } = monter();
    const c = await actions.creer(CTX('cle-x'), SOCIETE_PAYE);
    expect(c.statut).toBe('exclu_paye_societe');
    const [e, ...reste] = await lus();
    expect(reste).toEqual([]);
    expect([e?.type, e?.objet_id, e?.version, e?.charge]).toEqual(['compta.frais.exclu_paye_societe', c.id, c.version, { frais_id: c.id, statut: 'exclu_paye_societe' }]);
    await actions.completer(CTX('cle-y'), c.id, { declaration: 'personne' }, c.version);
    expect(await lus()).toHaveLength(1);
  });
  it('regularisation-proposee-publiee', async () => {
    // Constructeur seulement : aucune transition d'état de régularisation n'existe dans les fichiers autorisés.
    const boite = creerBoiteEnvoiMemoire();
    await boite.executer(async (tx) => { tx.boite.deposer(evenementRegularisationIk(CTX('cle-r'), { personneId: PER, annee: '2025', version: 1 })); });
    const [e] = await boite.enAttente(10);
    expect(e?.type).toBe('compta.ik.regularisation_proposee');
    expect([e?.objet_id, e?.charge]).toEqual([PER, { personne_id: PER, annee: '2025', statut: 'propose' }]);
  });
});
