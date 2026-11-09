import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { ErreurPersistance, TABLES_MOTEUR, type LignesMoteur, type NomTable } from '../moteur-ports.js';
import { PortMoteurMemoire } from '../moteur-memoire.js';

const A = 'soc-a'; // société fictive, SIREN 123456782
const B = 'soc-b'; // société fictive, SIREN 987654324
const c = (n: number) => n as Centimes;
const base = (id: string, societeId = A) => ({ id, societeId });
const EXEMPLES: { [N in NomTable]: (id: string, s?: string) => LignesMoteur[N] } = {
  fiche_fournisseur: (id, s) => ({ ...base(id, s), nom: 'Atelier Fictif', compte: '401FICT', source: 'regle_societe' }),
  alerte_divergence: (id, s) => ({ ...base(id, s), pieceA: 'p1', pieceB: 'p2', compteA: '6061', compteB: '6063', similarite: 0.9, gravite: 'M', statut: 'ouverte' }),
  controle_solde_banque: (id, s) => ({ ...base(id, s), exerciceId: 'ex1', statut: 'ok', ecart: c(0), lignesEnCause: [] }),
  snapshot_cloture: (id, s) => ({ ...base(id, s), exerciceId: 'ex1', empreinteBalance: 'empreinte-fictive', totalDebit: c(500), totalCredit: c(500), nbLignes: 2, version: 1, horodatage: '2026-01-31T10:00:00Z' }),
  associe: (id, s) => ({ ...base(id, s), nom: 'Camille Inventée', parts: 10 }),
  mouvement_capital: (id, s) => ({ ...base(id, s), associeId: 'as1', date: '2026-01-05', montant: c(1000) }),
  affectation_resultat: (id, s) => ({ ...base(id, s), exerciceId: 'ex1', resultat: c(900), apurementPertes: c(0), reserve: c(45), dividende: c(855) }),
  echeance_fiscale: (id, s) => ({ ...base(id, s), code: 'ECH-FICTIVE', date: '2026-05-15', parametre: 'param-fictif', source: 'source-fictive', statut: 'a_verifier' }),
  document_assemblee: (id, s) => ({ ...base(id, s), type: 'pv_ag', exerciceId: 'ex1', date: '2026-06-30' }),
  taux_change: (id, s) => ({ ...base(id, s), devise: 'USD', date: '2026-01-02', tauxE8: 108000000, sourceTexte: 'saisie fictive', saisiPar: 'u1', statut: 'a_verifier', pariteFixe: false }),
  axe_analytique: (id, s) => ({ ...base(id, s), code: 'PROJET', libelle: 'Projets fictifs' }),
  section_analytique: (id, s) => ({ ...base(id, s), axeId: 'ax1', code: 'P1', actif: true }),
  ventilation_analytique: (id, s) => ({ ...base(id, s), ligneId: 'l1', parts: [{ sectionId: 's1', montant: c(100) }], version: 1, date: '2026-02-01' }),
};
const ajouter = <N extends NomTable>(p: PortMoteurMemoire, n: N, id: string, s?: string) =>
  p.table(n).ajouter(EXEMPLES[n](id, s) as LignesMoteur[N]);
const noms = Object.keys(TABLES_MOTEUR) as NomTable[];
const code = async (f: () => Promise<unknown>): Promise<string> => {
  try { await f(); } catch (e) { return e instanceof ErreurPersistance ? `${e.code}|${e.message}` : 'autre'; }
  return 'aucune';
};

describe('moteur-memoire', () => {
  it('chaque-table-du-catalogue-a-son-port', async () => {
    expect(noms.length).toBeGreaterThan(0);
    for (const n of ['snapshot_cloture', 'ventilation_analytique', 'taux_change']) expect(noms).toContain(n);
    for (const n of noms) {
      const p = new PortMoteurMemoire();
      await ajouter(p, n, 'x1');
      expect(await p.table(n).lire(A, 'x1')).toEqual(EXEMPLES[n]('x1'));
    }
  });

  it('ajout-seul-refuse-modifier-et-supprimer', async () => {
    const seuls = noms.filter((n) => TABLES_MOTEUR[n].mode === 'ajout_seul');
    expect(seuls.length).toBeGreaterThan(0);
    for (const n of seuls) {
      const p = new PortMoteurMemoire();
      await ajouter(p, n, 'x1');
      const avant = await p.table(n).lister(A);
      expect((await code(() => p.table(n).modifier(EXEMPLES[n]('x1') as never))).split('|')[0]).toBe('ajout_seul');
      expect((await code(() => p.table(n).supprimer(A, 'x1'))).split('|')[0]).toBe('ajout_seul');
      expect(await p.table(n).lister(A)).toEqual(avant);
    }
  });

  it('table-modifiable-accepte-modifier', async () => {
    const p = new PortMoteurMemoire();
    await ajouter(p, 'fiche_fournisseur', 'f1');
    await p.table('fiche_fournisseur').modifier({ ...EXEMPLES.fiche_fournisseur('f1'), compte: '401NOUV' });
    expect((await p.table('fiche_fournisseur').lire(A, 'f1'))?.compte).toBe('401NOUV');
    await p.table('fiche_fournisseur').supprimer(A, 'f1');
    expect(await p.table('fiche_fournisseur').lire(A, 'f1')).toBeNull();
  });

  it('doublon-et-absent', async () => {
    const p = new PortMoteurMemoire();
    await ajouter(p, 'associe', 'a1');
    expect((await code(() => ajouter(p, 'associe', 'a1'))).split('|')[0]).toBe('doublon');
    expect((await code(() => ajouter(p, 'associe', 'a1', B))).split('|')[0]).toBe('doublon');
    expect((await code(() => p.table('associe').modifier(EXEMPLES.associe('zz')))).split('|')[0]).toBe('absent');
    expect((await code(() => p.table('associe').supprimer(A, 'zz'))).split('|')[0]).toBe('absent');
  });

  it('autre-societe-ne-voit-rien', async () => {
    const p = new PortMoteurMemoire();
    const t = p.table('associe');
    await ajouter(p, 'associe', 'a1');
    expect(await t.lire(B, 'a1')).toBeNull();
    expect(await t.lister(B)).toEqual([]);
    const inexistantM = await code(() => t.modifier(EXEMPLES.associe('zz', B)));
    const inexistantS = await code(() => t.supprimer(B, 'zz'));
    expect(inexistantM.startsWith('absent|')).toBe(true);
    expect(await code(() => t.modifier(EXEMPLES.associe('a1', B)))).toBe(inexistantM);
    expect(await code(() => t.supprimer(B, 'a1'))).toBe(inexistantS);
    expect(await t.lire(A, 'a1')).toEqual(EXEMPLES.associe('a1'));
  });

  it('montants-entiers-seulement', async () => {
    const cas: [string, unknown][] = [['NaN', NaN], ['Infinity', Infinity], ['-Infinity', -Infinity], ['1.5', 1.5], ["'100'", '100']];
    for (const [, v] of cas) {
      const p = new PortMoteurMemoire();
      expect((await code(() => p.table('mouvement_capital').ajouter({ ...EXEMPLES.mouvement_capital('m1'), montant: v as Centimes }))).split('|')[0]).toBe('montant_invalide');
      expect((await code(() => p.table('controle_solde_banque').ajouter({ ...EXEMPLES.controle_solde_banque('k1'), ecart: v as Centimes }))).split('|')[0]).toBe('montant_invalide');
      expect(await p.table('mouvement_capital').lister(A)).toEqual([]);
      expect(await p.table('controle_solde_banque').lister(A)).toEqual([]);
    }
    const p = new PortMoteurMemoire();
    await p.table('mouvement_capital').ajouter({ ...EXEMPLES.mouvement_capital('m0'), montant: c(0) });
    await p.table('mouvement_capital').ajouter({ ...EXEMPLES.mouvement_capital('m1'), montant: c(-250) });
    expect((await p.table('mouvement_capital').lister(A)).map((l) => l.montant)).toEqual([0, -250]);
  });

  it('copie-defensive', async () => {
    const p = new PortMoteurMemoire();
    const ligne = EXEMPLES.fiche_fournisseur('f1');
    await p.table('fiche_fournisseur').ajouter(ligne);
    ligne.nom = 'Modifié avant';
    const lue = await p.table('fiche_fournisseur').lire(A, 'f1');
    lue!.nom = 'Modifié après';
    expect((await p.table('fiche_fournisseur').lire(A, 'f1'))?.nom).toBe('Atelier Fictif');
  });

  it('instantane-jamais-ecrase', async () => {
    const p = new PortMoteurMemoire();
    const t = p.table('snapshot_cloture');
    await t.ajouter(EXEMPLES.snapshot_cloture('s1'));
    await t.ajouter({ ...EXEMPLES.snapshot_cloture('s2'), version: 2 });
    await t.ajouter({ ...EXEMPLES.snapshot_cloture('s3', B), version: 9 });
    expect((await t.lister(A)).map((l) => l.version)).toEqual([1, 2]);
    expect((await p.dernierInstantane(A, 'ex1'))?.version).toBe(2);
    expect(await p.dernierInstantane(A, 'ex-autre')).toBeNull();
    expect((await p.dernierInstantane(B, 'ex1'))?.societeId).toBe(B);
    expect(await p.dernierInstantane('soc-c', 'ex1')).toBeNull();
  });

  it('ventilation-versions-conservees', async () => {
    const p = new PortMoteurMemoire();
    const t = p.table('ventilation_analytique');
    await t.ajouter({ ...EXEMPLES.ventilation_analytique('v2'), version: 2 });
    await t.ajouter(EXEMPLES.ventilation_analytique('v1'));
    const lues = await t.lister(A);
    expect(lues.map((l) => l.id)).toEqual(['v1', 'v2']);
    expect(lues.map((l) => l.version)).toEqual([1, 2]);
  });
});
