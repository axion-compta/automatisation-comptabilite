import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../../packages/noyau/src/argent/index.js';
import { creerBoiteEnvoiMemoire } from '../../../../packages/noyau/src/evenements/memoire.js';
import type { EntreeEcritureEncaissement } from '../../../../packages/noyau/src/ventes/ecriture-encaissement.js';
import { appliquerLienBancaire, creerDepotEncaissementMemoire, type LienBancaireValide } from '../domaines/ventes-encaissement.js';
import { evenementVente, TYPES_EVENEMENT_VENTE, type ContexteEvenementVente } from '../domaines/ventes-evenements.js';

const c = (n: number): Centimes => n as Centimes;
const comptes = { client: 'CLI', tvaCollectee: 'COL', tvaEnAttente: 'ATT', avancesClients: 'AVA', banque: 'BQ' };
const ctx: ContexteEvenementVente = {
  societeId: 'societe-fictive', exerciceId: 'ex-2026', acteur: { type: 'systeme', id: 'ventes' }, canal: 'systeme',
  horodatage: '2026-11-20T10:00:00Z', correlationId: 'corr-lien-1',
};
const entree = (montant: number, cas: 'A' | 'B' = 'B'): EntreeEcritureEncaissement => ({
  id: 'ecr-1', journal: 'BQ', date: '2026-11-20', montant: c(montant), comptes, codesLettrageExistants: [],
  facture: {
    id: 'fac-1', auxiliaire: 'CLIENT1', cas, ttc: c(220000), dejaEncaisse: c(0),
    parTaux: [{ tauxPdb: 1900, tvaInitiale: c(20000), baseInitiale: c(200000), tvaDejaExigible: c(0), baseDejaExigible: c(0) }],
    ligneClient: { id: 'fac-1-1', compte: 'CLI', auxiliaire: 'CLIENT1', debit: c(220000), credit: c(0) },
  },
});
const lien = (montant: number, cas: 'A' | 'B' = 'B'): LienBancaireValide => ({ id: 'lien-1', contexte: ctx, entree: entree(montant, cas) });

describe('ventes : événements et effet du lien bancaire', () => {
  it('evenement-dans-la-transaction', async () => {
    const boite = creerBoiteEnvoiMemoire();
    const depot = creerDepotEncaissementMemoire();
    const r = await appliquerLienBancaire({ unite: boite, depot }, lien(220000));
    expect(r.rejoue).toBe(false);
    const attente = await boite.enAttente(10);
    expect(attente.map((e) => e.type)).toEqual(['compta.vente.encaissee']);
    expect(attente[0]?.objet_id).toBe('fac-1');
    expect(depot.ecritures()).toHaveLength(1);
    expect(depot.lettrages()).toHaveLength(1);
    expect(depot.resteDu('fac-1')).toBe(0);
  });

  it('panne-au-milieu-aucune-ecriture-partielle', async () => {
    for (const etape of ['ecriture', 'lettrage', 'reste_du'] as const) {
      const boite = creerBoiteEnvoiMemoire();
      const depot = creerDepotEncaissementMemoire({ panne: (e) => e === etape });
      await expect(appliquerLienBancaire({ unite: boite, depot }, lien(100000))).rejects.toThrow('panne_simulee');
      expect(depot.ecritures()).toHaveLength(0);
      expect(depot.lettrages()).toHaveLength(0);
      expect(depot.resteDu('fac-1')).toBeUndefined();
      expect(await boite.enAttente(10)).toHaveLength(0);
    }
  });

  it('encaissee-signale-la-tva-exigible-sans-montant', async () => {
    const boite = creerBoiteEnvoiMemoire();
    await appliquerLienBancaire({ unite: boite, depot: creerDepotEncaissementMemoire() }, lien(100000));
    const e = (await boite.enAttente(10))[0]!;
    expect(e.charge).toEqual({ facture_id: 'fac-1', ecriture_id: 'ecr-1', statut: 'partiel', tva_exigible: true });
    expect(JSON.stringify(e.charge)).not.toMatch(/\d{4,}/);
    const sansTva = creerBoiteEnvoiMemoire();
    await appliquerLienBancaire({ unite: sansTva, depot: creerDepotEncaissementMemoire() }, lien(220000, 'A'));
    expect((await sansTva.enAttente(10))[0]?.charge).toMatchObject({ statut: 'total', tva_exigible: false });
  });

  it('rejeu-sans-doublon', async () => {
    const boite = creerBoiteEnvoiMemoire();
    const depot = creerDepotEncaissementMemoire();
    await appliquerLienBancaire({ unite: boite, depot }, lien(100000));
    const r = await appliquerLienBancaire({ unite: boite, depot }, lien(100000));
    expect(r.rejoue).toBe(true);
    expect(depot.ecritures()).toHaveLength(1);
    expect(depot.lettrages()).toHaveLength(1);
    expect(await boite.enAttente(10)).toHaveLength(1);
  });

  it('les six types sont acceptés par l’enveloppe, sans montant', () => {
    expect(TYPES_EVENEMENT_VENTE).toHaveLength(6);
    for (const t of TYPES_EVENEMENT_VENTE) {
      const e = evenementVente(t, ctx, 'fac-1', { piece_id: 'fac-1' });
      expect(e.type).toBe(t);
      expect(e.id).toBe(`${t}:fac-1:corr-lien-1`);
    }
    expect(() => evenementVente('compta.vente.lue', ctx, 'fac-1', { montant_ttc: 'x' })).toThrow('champ_interdit');
  });
});
