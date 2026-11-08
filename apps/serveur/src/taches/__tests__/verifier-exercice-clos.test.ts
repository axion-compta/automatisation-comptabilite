import { describe, expect, it } from 'vitest';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { instantaneCloture } from '../../../../../packages/noyau/src/conservation/relecture-exercice.js';
import type { Ecriture } from '../../../../../packages/noyau/src/ecritures/modele.js';
import type { Enveloppe } from '../../../../../packages/noyau/src/evenements/enveloppe.js';
import { creerFauxAlertes } from '../../../../../packages/noyau/src/exploitation/port-alerte.js';
import {
  cleEcriture, EcrituresMemoire, ErreurInalterable, type LigneStockee,
} from '../../persistance/ecritures-figees.js';
import type { LigneSnapshotCloture, PortMoteur } from '../../persistance/moteur-ports.js';
import {
  verifierExerciceClos, type AlerteExercice, type MotifVerification,
} from '../verifier-exercice-clos.js';

const A = 'soc-a'; // SIREN fictif 123456782
const B = 'soc-b'; // SIREN fictif 987654324
const EXO = 'exo-1';
const T = '2026-03-01T02:00:00Z';
const ligne = (compte: string, debit: number, credit: number) =>
  ({ compte, libelle: 'ligne fictive', debit: centimes(debit), credit: centimes(credit) });
const ecriture = (id: string, statut: Ecriture['statut'], d: number, c1 = '601000', c2 = '401000'): Ecriture => ({
  id, journal: 'HA', date: '2026-02-01', statut, numero: id, lignes: [ligne(c1, d, 0), ligne(c2, 0, d)],
});

async function monde(avecInstantane = true) {
  const stock = new Map<string, LigneStockee>();
  const ecritures = new EcrituresMemoire(stock);
  const base = [ecriture('e1', 'valide', 10000), ecriture('e2', 'valide', 2500, '606000', '512000')];
  for (const e of base) await ecritures.ajouter(A, EXO, e);
  const snap: LigneSnapshotCloture | null = avecInstantane
    ? { id: 'snap-1', societeId: A, version: 1, horodatage: T, ...instantaneCloture(EXO, base) }
    : null;
  const recus: unknown[] = [];
  const instantanes: Pick<PortMoteur, 'dernierInstantane'> = {
    dernierInstantane: async (...a) => (recus.push(a), snap),
  };
  const deposes: Enveloppe[] = [];
  const faux = creerFauxAlertes<AlerteExercice>();
  const lancer = (motif: MotifVerification = 'a_la_demande') => verifierExerciceClos({
    societeId: A, exerciceId: EXO, motif, ecritures, instantanes, maintenant: () => T,
    boiteEnvoi: { deposer: (e) => { deposes.push(e); } }, alerte: faux.port,
  });
  return { stock, ecritures, deposes, alertes: faux.recues, lancer, recus };
}
const changerDebit = (stock: Map<string, LigneStockee>, id: string, i: number, debit: number) => {
  const l = stock.get(cleEcriture(A, id))!;
  const lignes = l.ecriture.lignes.map((x, k) => (k === i ? { ...x, debit: centimes(debit) } : x));
  stock.set(cleEcriture(A, id), { ...l, ecriture: { ...l.ecriture, lignes } });
};

describe('inaltérabilité des écritures', () => {
  it('mot75-2-update-refuse', async () => {
    const { ecritures } = await monde();
    const avant = await ecritures.lister(A, EXO);
    const e1 = avant[0]!;
    const montant = { ...e1, lignes: [{ ...e1.lignes[0]!, debit: centimes(1) }, e1.lignes[1]!] };
    await expect(ecritures.modifier(A, montant)).rejects.toMatchObject({ code: 'ligne_validee' });
    await expect(ecritures.modifier(A, { ...e1, contrePassee: true })).rejects.toBeInstanceOf(ErreurInalterable);
    await expect(ecritures.modifier(A, { ...e1, motif: 'autre' })).rejects.toMatchObject({ code: 'ligne_validee' });
    expect(await ecritures.lister(A, EXO)).toEqual(avant);
  });

  it('brouillon-modifiable', async () => {
    const ecritures = new EcrituresMemoire();
    await ecritures.ajouter(A, EXO, ecriture('b1', 'brouillon', 500));
    await ecritures.modifier(A, ecriture('b1', 'propose', 700));
    const [relue] = await ecritures.lister(A, EXO);
    expect(relue?.statut).toBe('propose');
    expect(relue?.lignes[0]?.debit).toBe(700);
  });

  it('autre-societe-absent', async () => {
    const { ecritures } = await monde();
    await expect(ecritures.modifier(B, ecriture('e1', 'brouillon', 1))).rejects.toMatchObject({ code: 'absent' });
    await expect(ecritures.modifier(A, ecriture('inconnue', 'brouillon', 1))).rejects.toMatchObject({ code: 'absent' });
    expect(await ecritures.lister(B, EXO)).toEqual([]);
  });

  it('doublon-refuse', async () => {
    const { ecritures } = await monde();
    await expect(ecritures.ajouter(A, EXO, ecriture('e1', 'brouillon', 1))).rejects.toMatchObject({ code: 'doublon' });
  });
});

describe('relecture des exercices clos', () => {
  it('exercice-intact', async () => {
    const m = await monde();
    expect(await m.lancer()).toEqual({ statut: 'intact', exportAutorise: true });
    expect(m.deposes).toHaveLength(1);
    expect(m.alertes).toEqual([]);
  });

  it('mot75-3-alteration-detectee', async () => {
    const m = await monde();
    changerDebit(m.stock, 'e1', 0, 10001);
    expect(await m.lancer()).toEqual({ statut: 'altere', exportAutorise: false });
    expect(m.alertes).toEqual([{ code: 'exercice_altere', societeId: A, exerciceId: EXO }]);
  });

  it('alteration-a-totaux-egaux', async () => {
    const m = await monde();
    const l = m.stock.get(cleEcriture(A, 'e1'))!;
    const [d, c] = l.ecriture.lignes;
    m.stock.set(cleEcriture(A, 'e1'), { ...l, ecriture: { ...l.ecriture, lignes: [{ ...d!, compte: '401000' }, { ...c!, compte: '601000' }] } });
    expect(await m.lancer()).toEqual({ statut: 'altere', exportAutorise: false });
    expect(m.alertes).toHaveLength(1);
  });

  it('instantane-absent-jamais-intact', async () => {
    const m = await monde(false);
    expect(await m.lancer()).toEqual({ statut: 'instantane_absent', exportAutorise: false });
    expect(m.alertes).toEqual([{ code: 'instantane_absent', societeId: A, exerciceId: EXO }]);
    expect(m.deposes[0]?.charge).toEqual({ motif: 'a_la_demande', statut: 'instantane_absent' });
  });

  it('jamais-de-reparation', async () => {
    const m = await monde();
    changerDebit(m.stock, 'e2', 1, 7);
    const etat = structuredClone([...m.stock.entries()]);
    await m.lancer();
    expect([...m.stock.entries()]).toEqual(etat);
    expect(m.recus).toEqual([[A, EXO]]);
  });

  it('trois-motifs-un-evenement-chacun', async () => {
    const m = await monde();
    for (const motif of ['annuelle', 'a_la_demande', 'avant_export'] as const) await m.lancer(motif);
    expect(m.deposes.map((e) => e.charge.motif)).toEqual(['annuelle', 'a_la_demande', 'avant_export']);
    for (const e of m.deposes) {
      expect(e).toMatchObject({ type: 'compta.exercice.verifie', exercice_id: EXO, objet_id: EXO, horodatage: T });
    }
  });
});
