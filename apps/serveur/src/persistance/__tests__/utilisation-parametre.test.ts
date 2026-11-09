import { describe, expect, it } from 'vitest';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import type { Ecriture } from '../../../../../packages/noyau/src/ecritures/modele.js';
import type { ParametreLegal } from '../../../../../packages/parametres/src/au-jour.js';
import { regleAuJour, type PaquetParametres, type RegleAuJour, type UtilisationParametre } from '../../../../../packages/parametres/src/paquet.js';
import { creerComptaMemoire, enregistrerEcriture, rejouerEcriture, validerEcriture, type EcritureStockee, type PortCompta } from '../utilisation-parametre.js';

const ligne = (cle: string, pays: string, valeur: string, debut: string, fin: string | null): ParametreLegal => ({
  cle, pays, valeur, effet_debut: debut, effet_fin: fin, statut: 'valide', source: 'source fictive', date_releve: debut,
});
const lignesDe = (valeur: string): ParametreLegal[] => [
  ligne('pays_ue', 'UE', 'AA,BB,CC', '2025-01-01', null),
  ligne('taux_fictif', 'AA', `${valeur}-a`, '2025-01-01', '2026-01-01'),
  ligne('taux_fictif', 'AA', `${valeur}-b`, '2026-01-01', null),
  ligne('autre_fictif', 'AA', `${valeur}-c`, '2025-01-01', null),
];
const V1: PaquetParametres = { version: 'v-fictive-1', lignes: lignesDe('un') };
const V2: PaquetParametres = { version: 'v-fictive-2', lignes: lignesDe('deux') };
const JOUR_A = '2025-12-31';
const JOUR_B = '2026-01-01';
const regle = (cle: string, jour: string, p = V1): RegleAuJour => regleAuJour(p, cle, 'AA', jour);

const ecriture = (id = 'e1', statut: Ecriture['statut'] = 'propose'): Ecriture => ({
  id, journal: 'OD', date: JOUR_A, statut,
  lignes: [
    { compte: '600000', libelle: 'ligne fictive', debit: centimes(100), credit: centimes(0) },
    { compte: '400000', libelle: 'ligne fictive', debit: centimes(0), credit: centimes(100) },
  ],
});
const demande = (sur: object = {}) => ({
  ecriture: ecriture(), regles: [regle('taux_fictif', JOUR_A)], paquet: V1, paysSociete: 'AA', dateReference: JOUR_A, ...sur,
});
const code = (r: { ok: boolean } & object): string | undefined => ('code' in r ? String(r.code) : undefined);
const erreurDe = async (f: () => Promise<unknown>): Promise<string> => {
  try { await f(); } catch (e) { return e instanceof Error ? ('code' in e ? String(e.code) : e.message) : 'autre'; }
  return 'aucune';
};
const stockee = (id: string, sur: Partial<EcritureStockee> = {}): EcritureStockee =>
  ({ ...ecriture(id), appliqueRegleLegale: true, versionPaquet: 'v-fictive-1', ...sur });
const utilisation = (sur: Partial<UtilisationParametre> = {}): UtilisationParametre =>
  ({ ecritureId: 'e1', parametreId: 'p1', versionPaquet: 'v-fictive-1', dateReference: JOUR_A, ...sur });
const VALIDATION = { numero: 'N-fictif', validePar: 'personne-fictive', valideLe: '2026-02-01T10:00:00Z' };

describe('persistance de utilisation_parametre', () => {
  it('r1-ligne-ecrite-avec-l-ecriture', async () => {
    for (const jour of [JOUR_A, JOUR_B]) {
      const { port, instantane } = creerComptaMemoire();
      const r = regle('taux_fictif', jour);
      expect(await enregistrerEcriture(port, demande({ regles: [r], dateReference: jour }))).toEqual({ ok: true });
      const s = instantane();
      expect(s.ecritures).toHaveLength(1);
      expect(s.ecritures[0]).toMatchObject({ id: 'e1', appliqueRegleLegale: true, versionPaquet: r.versionPaquet });
      expect(s.utilisations).toEqual([
        { ecritureId: 'e1', parametreId: r.parametreId, versionPaquet: r.versionPaquet, dateReference: jour },
      ]);
    }
    expect(regle('taux_fictif', JOUR_A).parametreId).not.toBe(regle('taux_fictif', JOUR_B).parametreId);
  });

  it('r2-rejeu-sur-la-version-enregistree', async () => {
    const { port } = creerComptaMemoire();
    await enregistrerEcriture(port, demande());
    const lignes = await rejouerEcriture(port, 'e1', [V1, V2]);
    expect(lignes).toEqual([regle('taux_fictif', JOUR_A).ligne]);
    expect(lignes[0]?.valeur).toBe('un-a');
    expect(regle('taux_fictif', JOUR_A, V2).ligne.valeur).toBe('deux-a');
    expect(await rejouerEcriture(port, 'inconnue', [V1, V2])).toEqual([]);
  });

  it('r3-societe-hors-union-zero-ligne', async () => {
    const { port, instantane } = creerComptaMemoire();
    const avant = instantane();
    for (const pays of ['ZZ', 'aa', '']) {
      expect(await enregistrerEcriture(port, demande({ paysSociete: pays }))).toEqual({ ok: false, code: 'pays_hors_union' });
      expect(instantane()).toEqual(avant);
    }
    let ouvertes = 0;
    const espion: PortCompta = { transaction: (t) => { ouvertes += 1; return port.transaction(t); } };
    await enregistrerEcriture(espion, demande({ paysSociete: 'ZZ' }));
    expect(ouvertes).toBe(0);
  });

  it('tout-ou-rien-si-une-ligne-echoue', async () => {
    const base = creerComptaMemoire();
    let appels = 0;
    const faux: PortCompta = {
      transaction: (travail) => base.port.transaction((tx) => travail({
        ...tx,
        ajouterUtilisation: async (u) => {
          appels += 1;
          if (appels === 2) throw new Error('panne fictive');
          await tx.ajouterUtilisation(u);
        },
      })),
    };
    const regles = [regle('taux_fictif', JOUR_A), regle('autre_fictif', JOUR_A)];
    expect(await erreurDe(() => enregistrerEcriture(faux, demande({ regles })))).toBe('panne fictive');
    expect(appels).toBe(2);
    expect(base.instantane()).toEqual({ ecritures: [], utilisations: [] });
    expect(await enregistrerEcriture(base.port, demande({ regles }))).toEqual({ ok: true });
    expect(base.instantane().utilisations).toHaveLength(2);
  });

  it('validation-refusee-sans-ligne', async () => {
    const { port, instantane } = creerComptaMemoire();
    await port.transaction((tx) => tx.ecrireEcriture(stockee('e1')));
    const avant = instantane();
    const r = await validerEcriture(port, 'e1', VALIDATION);
    expect(r).toEqual({ ok: false, code: 'utilisation_parametre_absente' });
    expect(instantane()).toEqual(avant);
    expect(instantane().ecritures[0]?.statut).toBe('propose');
    expect(instantane().ecritures[0]?.numero).toBeUndefined();
  });

  it('version-paquet-jamais-nulle', async () => {
    const { port, instantane } = creerComptaMemoire();
    for (const versionPaquet of [null, '']) {
      expect(await erreurDe(() => port.transaction((tx) => tx.ecrireEcriture(stockee('e1', { versionPaquet }))))).toBe(
        'version_paquet_absente',
      );
    }
    expect(instantane().ecritures).toHaveLength(0);
    await port.transaction((tx) => tx.ecrireEcriture(stockee('e2', { appliqueRegleLegale: false, versionPaquet: null })));
    expect(instantane().ecritures).toHaveLength(1);
  });

  it('validation-acceptee-avec-ligne', async () => {
    const { port, instantane } = creerComptaMemoire();
    await enregistrerEcriture(port, demande());
    const lignes = instantane().utilisations;
    const r = await validerEcriture(port, 'e1', VALIDATION);
    expect(r.ok).toBe(true);
    const e = instantane().ecritures[0];
    expect(e).toMatchObject({ statut: 'valide', ...VALIDATION, appliqueRegleLegale: true, versionPaquet: 'v-fictive-1' });
    expect(instantane().utilisations).toEqual(lignes);
    expect(r.ok && r.ecriture.statut).toBe('valide');
    expect(await erreurDe(() => validerEcriture(port, 'e1', VALIDATION))).toBe('transition_interdite');
  });

  it('ecriture-sans-regle-legale-sans-ligne', async () => {
    const { port, instantane } = creerComptaMemoire();
    expect(await enregistrerEcriture(port, demande({ regles: [] }))).toEqual({ ok: true });
    expect((await validerEcriture(port, 'e1', VALIDATION)).ok).toBe(true);
    expect(instantane().ecritures[0]).toMatchObject({ statut: 'valide', appliqueRegleLegale: false, versionPaquet: null });
    expect(instantane().utilisations).toHaveLength(0);
  });

  it('ajout-seul-doublon-refuse', async () => {
    const { port, instantane } = creerComptaMemoire();
    await port.transaction(async (tx) => { await tx.ecrireEcriture(stockee('e1')); await tx.ajouterUtilisation(utilisation()); });
    const origine = instantane();
    const doublon = utilisation({ versionPaquet: 'v-fictive-2', dateReference: JOUR_B });
    expect(await erreurDe(() => port.transaction((tx) => tx.ajouterUtilisation(doublon)))).toBe('utilisation_en_double');
    expect(instantane()).toEqual(origine);
    const inconnue = utilisation({ ecritureId: 'zz' });
    expect(await erreurDe(() => port.transaction((tx) => tx.ajouterUtilisation(inconnue)))).toBe('ecriture_inconnue');
    expect(await port.transaction(async (tx) => Object.keys(tx).sort())).toEqual(['ajouterUtilisation', 'ecrireEcriture', 'ecriture', 'utilisations']);
  });

  it('version-incoherente-et-ecriture-inconnue', async () => {
    const { port, instantane } = creerComptaMemoire();
    const autre = regle('taux_fictif', JOUR_A, V2);
    expect(await enregistrerEcriture(port, demande({ regles: [regle('autre_fictif', JOUR_A), autre] }))).toEqual({
      ok: false, code: 'version_incoherente',
    });
    expect(instantane()).toEqual({ ecritures: [], utilisations: [] });
    expect(code(await validerEcriture(port, 'absente', VALIDATION))).toBe('ecriture_inconnue');
    const entree = Object.freeze(demande({ ecriture: Object.freeze({ ...ecriture(), lignes: Object.freeze([...ecriture().lignes]) }), regles: Object.freeze([regle('taux_fictif', JOUR_A)]) }));
    const copie = JSON.stringify(entree);
    expect(await enregistrerEcriture(port, entree)).toEqual({ ok: true });
    expect(JSON.stringify(entree)).toBe(copie);
    const doublons = [regle('taux_fictif', JOUR_A), regle('taux_fictif', JOUR_A)];
    expect(await enregistrerEcriture(port, demande({ ecriture: ecriture('e2'), regles: doublons }))).toEqual({ ok: true });
    expect(instantane().utilisations.filter((u) => u.ecritureId === 'e2')).toHaveLength(1);
    instantane().ecritures.length = 0;
    expect(instantane().ecritures).toHaveLength(2);
  });
});
