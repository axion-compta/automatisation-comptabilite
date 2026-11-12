import { describe, expect, it } from 'vitest';
import { genererFrais, type JeuFrais } from '../../../../packages/donnees-fictives/src/frais.js';
import { creerServiceFraisValidation } from '../../../../packages/contrat/src/domaines/frais-validation-service.js';
import { creerBoiteEnvoiMemoire } from '../../../../packages/noyau/src/evenements/memoire.js';
import type { Enveloppe } from '../../../../packages/noyau/src/evenements/enveloppe.js';
import { configEssai } from '../domaines/frais-validation.js';
import { creerFraisPublies, evenementExcluPayeSociete, evenementRegularisationIk, type ContexteFrais } from '../domaines/frais-evenements.js';

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
  const service = creerServiceFraisValidation(jeu(), configEssai());
  const frais = creerFraisPublies(service, boite);
  const lus = async (): Promise<readonly Enveloppe[]> => boite.enAttente(100);
  return { frais, lus };
}
const types = (l: readonly Enveloppe[]): string[] => l.map((e) => e.type);

describe('serveur : événements des frais sur le bus', () => {
  it('un-evenement-par-transition', async () => {
    const { frais, lus } = monter();
    await frais.proposer(CTX('cle-1'), 'FRA-005');
    expect(types(await lus())).toEqual(['compta.frais.propose']);
    await frais.valider(CTX('cle-2'), { ids: ['FRA-005', 'FRA-012'], confirmeRecapitulatif: true });
    expect(types(await lus())).toEqual(['compta.frais.propose', 'compta.frais.valide', 'compta.frais.valide']);
    await frais.preparer(CTX('cle-3'), { personneId: PER, fraisIds: ['FRA-003'] });
    const tous = await lus();
    expect(tous.at(-1)?.type).toBe('compta.remboursement.prepare');
    expect(tous).toHaveLength(4);
    expect(tous.map((e) => e.objet_id).slice(0, 3)).toEqual(['FRA-005', 'FRA-005', 'FRA-012']);
    expect(new Set(tous.map((e) => e.id)).size).toBe(4);
  });

  it('echec-de-transaction-aucun-evenement', async () => {
    const { frais, lus } = monter();
    await expect(frais.valider(CTX('cle-1'), { ids: ['FRA-005', 'FRA-999'] })).rejects.toThrow();
    await expect(frais.proposer(CTX('cle-2'), 'FRA-999')).rejects.toThrow();
    expect(await lus()).toEqual([]);
  });

  it('idempotence-pas-de-double-evenement', async () => {
    const { frais, lus } = monter();
    const un = await frais.valider(CTX('cle-rejeu'), { ids: ['FRA-005'] });
    const deux = await frais.valider(CTX('cle-rejeu'), { ids: ['FRA-005'] });
    expect(deux).toEqual(un);
    await frais.proposer(CTX('cle-p'), 'FRA-012');
    await frais.proposer(CTX('cle-p'), 'FRA-012');
    expect(types(await lus())).toEqual(['compta.frais.valide', 'compta.frais.propose']);
  });

  it('charge-sans-montant-ni-donnee-personnelle', async () => {
    const { frais, lus } = monter();
    await frais.proposer(CTX('cle-1'), 'FRA-005');
    await frais.valider(CTX('cle-2'), { ids: ['FRA-012'] });
    await frais.preparer(CTX('cle-3'), { personneId: PER, fraisIds: ['FRA-003'] });
    const tous = await lus();
    expect(tous).toHaveLength(3);
    for (const e of tous) {
      expect(e.charge).toBeTypeOf('object');
      for (const [cle, v] of Object.entries(e.charge)) {
        expect(cle).not.toMatch(/montant|total|centime|nom|email|iban|adresse/);
        expect(typeof v === 'string' || typeof v === 'boolean' || v === null).toBe(true);
        if (typeof v === 'string') expect(v).not.toMatch(/@|^\d+([.,]\d+)?$/);
      }
      expect(JSON.stringify(e.charge)).not.toMatch(/libell|justificatif/i);
    }
    expect(tous[0]?.charge).toEqual({ frais_id: 'FRA-005', statut: 'propose' });
  });

  it('exclu-paye-societe-publie', async () => {
    const boite = creerBoiteEnvoiMemoire();
    await boite.executer(async (tx) => { tx.boite.deposer(evenementExcluPayeSociete(CTX('cle-x'), { fraisId: 'FRA-012', version: 2 })); });
    const [e] = await boite.enAttente(10);
    expect(e?.type).toBe('compta.frais.exclu_paye_societe');
    expect([e?.objet_id, e?.version, e?.charge]).toEqual(['FRA-012', 2, { frais_id: 'FRA-012', statut: 'exclu_paye_societe' }]);
  });

  it('regularisation-proposee-publiee', async () => {
    const boite = creerBoiteEnvoiMemoire();
    await boite.executer(async (tx) => { tx.boite.deposer(evenementRegularisationIk(CTX('cle-r'), { personneId: PER, annee: '2025', version: 1 })); });
    const [e] = await boite.enAttente(10);
    expect(e?.type).toBe('compta.ik.regularisation_proposee');
    expect([e?.objet_id, e?.charge]).toEqual([PER, { personne_id: PER, annee: '2025', statut: 'propose' }]);
  });
});
