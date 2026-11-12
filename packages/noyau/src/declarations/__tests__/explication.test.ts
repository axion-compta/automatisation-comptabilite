import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { Ecriture } from '../../ecritures/modele.js';
import { estGenereParIA } from '../../securite/marqueur-ia.js';
import type { CaseDeclaration } from '../cases.js';
import { ErreurExplication, expliquerCase, preparerEntree, verifierExplication, type PortModele } from '../explication.js';

const ECRITURES: Ecriture[] = [
  { id: 'ecr-azur', journal: 'VT', date: '2026-02-03', statut: 'valide', lignes: [{ compte: '445710', auxiliaire: 'CLI-ZORG', libelle: 'Facture Odile Marchetot', debit: centimes(0), credit: centimes(123456) }] },
  { id: 'ecr-brume', journal: 'VT', date: '2026-02-09', statut: 'valide', lignes: [{ compte: '445710', libelle: 'Vente comptoir', debit: centimes(0), credit: centimes(7890) }] },
];
const CASE: CaseDeclaration = { code: 'X01', montant: centimes(131346), sources: [{ ecritureId: 'ecr-azur', ligneIndex: 0 }, { ecritureId: 'ecr-brume', ligneIndex: 0 }], aCalculer: false };
const SANS_SOURCE: CaseDeclaration = { code: 'X02', montant: centimes(0), sources: [], aCalculer: true };
const PERSONNES = ['Odile Marchetot'];
const BON = 'La case X01 vaut {{ref:case.montant}}, issue de {{ref:e1.montant}} le {{ref:e1.date}} et de {{ref:e2.montant}}.';

function faux(reponses: (string | Error)[]) {
  const recus: string[] = [];
  const port: PortModele = {
    async completer(entree) {
      recus.push(entree);
      const r = reponses[Math.min(recus.length - 1, reponses.length - 1)]!;
      if (r instanceof Error) throw r;
      return { texte: r, modele: 'faux-modele', version: 'v-test' };
    },
  };
  return { port, recus };
}
const prep = (c = CASE) => preparerEntree(c, ECRITURES, PERSONNES);
const verif = (texte: string, c = CASE, max = 400) => {
  const p = prep(c);
  return verifierExplication(texte, p.resultats, c, p.table, max);
};
const codeErreur = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErreurExplication) return e.code;
    throw e;
  }
  return undefined;
};

describe('explication d\'un montant de déclaration', () => {
  it('entree-pseudonymisee', () => {
    const { entree, table } = prep();
    expect(entree).not.toContain('Odile');
    expect(entree).not.toContain('Marchetot');
    expect(entree).not.toContain('ecr-azur');
    expect(entree).not.toContain('ecr-brume');
    expect(entree).not.toContain('CLI-ZORG');
    expect(entree).toContain('[PERSONNE_1]');
    expect(entree).toContain('X01');
    expect(table.get('[PERSONNE_1]')).toBe('Odile Marchetot');
  });

  it('montants-hors-entree', () => {
    const { entree, resultats } = prep();
    for (const m of ['123456', '1234', '7890', '131346', '1313', '2026']) expect(entree).not.toContain(m);
    expect(resultats.case!.montant!.valeur).toBe(131346);
    expect(resultats.e1!.montant).toMatchObject({ valeur: 123456, nature: 'montant', source: { type: 'ecriture', id: 'ecr-azur' } });
    expect(resultats.e2!.date!.valeur).toBe('2026-02-09');
    expect(resultats.e2!.compte!.nature).toBe('compte');
  });

  it('explication-valide-avec-references', () => {
    const r = verif(`${BON} Merci [PERSONNE_1].`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.segments.filter((s) => s.sorte === 'valeur').map((s) => (s as { valeur: unknown }).valeur)).toEqual([131346, 123456, '2026-02-03', 7890]);
    expect(r.segments.some((s) => s.sorte === 'texte' && s.texte.includes('Odile Marchetot'))).toBe(true);
    expect(verif('Rien à lister ici pour X02.', SANS_SOURCE)).toMatchObject({ ok: true });
  });

  it('chiffre-invente-rejete', () => {
    for (const t of ['La case X01 vaut 1500 {{ref:e1.montant}}.', 'Voir X01b2 {{ref:e1.montant}}.', 'Environ {{12}} {{ref:e1.montant}}.', 'Case X01 {{ref:e1.montant}} en 2026.']) {
      expect(verif(t)).toEqual({ ok: false, code: 'chiffre_hors_reference' });
    }
    const numerique: CaseDeclaration = { ...CASE, code: '08' };
    expect(verif('La ligne 08 vaut 0808 euros, voir {{ref:e1.montant}}.', numerique)).toEqual({ ok: false, code: 'chiffre_hors_reference' });
    expect(verif('La ligne 08 vient de {{ref:e1.montant}}.', numerique)).toMatchObject({ ok: true });
    const pointee: CaseDeclaration = { ...CASE, code: '3.1' };
    expect(verif('La ligne 3.1 vaut 331 euros, voir {{ref:e1.montant}}.', pointee)).toEqual({ ok: false, code: 'chiffre_hors_reference' });
    expect(verif('La ligne 3.1 vient de {{ref:e1.montant}}.', pointee)).toMatchObject({ ok: true });
    expect(verif('La case X01 puis X01 encore, voir {{ref:e1.montant}}.')).toMatchObject({ ok: true });
  });

  it('montant-au-debit', () => {
    const debit: Ecriture = { id: 'ecr-cedre', journal: 'HA', date: '2026-03-04', statut: 'valide', lignes: [{ compte: '445660', libelle: 'Achat fournitures', debit: centimes(4321), credit: centimes(0) }] };
    const c: CaseDeclaration = { code: 'X03', montant: centimes(4321), sources: [{ ecritureId: 'ecr-cedre', ligneIndex: 0 }], aCalculer: false };
    const p = preparerEntree(c, [debit], []);
    expect(p.resultats.e1!.montant!.valeur).toBe(4321);
    expect(p.etapes[0]!.montant).toBe(4321);
  });

  it('reference-inconnue-rejetee', () => {
    expect(verif('Voir {{ref:e9.montant}} pour X01.')).toEqual({ ok: false, code: 'reference_inconnue' });
    expect(verif('Voir {{ref:e1.taux}} pour X01.')).toEqual({ ok: false, code: 'reference_inconnue' });
  });

  it('aucune-ecriture-citee-rejetee', () => {
    expect(verif('La case X01 vaut {{ref:case.montant}}.')).toEqual({ ok: false, code: 'aucune_ecriture_citee' });
    expect(verif('   ')).toEqual({ ok: false, code: 'vide' });
    expect(verif('')).toEqual({ ok: false, code: 'vide' });
    expect(verif(BON, CASE, BON.length)).toMatchObject({ ok: true });
    expect(verif(BON, CASE, BON.length - 1)).toEqual({ ok: false, code: 'trop_long' });
    expect(verif(BON, CASE, 10)).toEqual({ ok: false, code: 'trop_long' });
    expect(verif(BON, CASE, Number.NaN)).toEqual({ ok: false, code: 'trop_long' });
  });

  it('un-seul-nouvel-essai', async () => {
    const f = faux(['Texte avec 42 inventé', BON]);
    const r = await expliquerCase(f.port, CASE, ECRITURES, PERSONNES, { longueurMax: 400 });
    expect(f.recus).toHaveLength(2);
    expect(r.sorte).toBe('ia');
    const g = faux(['Texte avec 42 inventé', 'Encore 43']);
    const r2 = await expliquerCase(g.port, CASE, ECRITURES, PERSONNES, { longueurMax: 400 });
    expect(g.recus).toHaveLength(2);
    expect(r2.sorte).toBe('sans_modele');
  });

  it('port-en-panne-sans-modele', async () => {
    const f = faux([new Error('panne')]);
    const r = await expliquerCase(f.port, CASE, ECRITURES, PERSONNES, { longueurMax: 400 });
    expect(f.recus).toHaveLength(1);
    expect(r).toMatchObject({ sorte: 'sans_modele' });
    if (r.sorte !== 'sans_modele') return;
    expect(r.etapes.map((e) => e.montant)).toEqual([123456, 7890]);
    expect(r.etapes[0]).toMatchObject({ reference: 'e1', ecritureId: 'ecr-azur', date: '2026-02-03', compte: '445710' });
    const vide = await expliquerCase(faux([new Error('panne')]).port, SANS_SOURCE, ECRITURES, PERSONNES, { longueurMax: 400 });
    expect(vide).toEqual({ sorte: 'sans_modele', etapes: [] });
  });

  it('source-introuvable', async () => {
    const c = { ...CASE, sources: [{ ecritureId: 'ecr-absente', ligneIndex: 0 }] };
    expect(codeErreur(() => preparerEntree(c, ECRITURES, PERSONNES))).toBe('source_introuvable');
    expect(codeErreur(() => preparerEntree({ ...CASE, sources: [{ ecritureId: 'ecr-azur', ligneIndex: 5 }] }, ECRITURES, PERSONNES))).toBe('source_introuvable');
    for (const m of [Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(codeErreur(() => preparerEntree({ ...CASE, montant: m as never }, ECRITURES, PERSONNES))).toBe('montant_invalide');
    }
    const f = faux([BON]);
    await expect(expliquerCase(f.port, c, ECRITURES, PERSONNES, { longueurMax: 400 })).rejects.toBeInstanceOf(ErreurExplication);
    expect(f.recus).toHaveLength(0);
  });

  it('resultat-marque-ia-sans-action', async () => {
    const r = await expliquerCase(faux([BON]).port, CASE, ECRITURES, PERSONNES, { longueurMax: 400 });
    expect(r.sorte).toBe('ia');
    if (r.sorte !== 'ia') return;
    expect(estGenereParIA(r.meta)).toBe(true);
    expect(r.meta).toMatchObject({ modele: 'faux-modele', version: 'v-test' });
    expect(Object.keys(r).sort()).toEqual(['meta', 'segments', 'sorte']);
    expect(JSON.stringify(r)).not.toMatch(/statut|action|valid/i);
  });
});
