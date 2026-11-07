import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../../argent/index.js';
import { executerControles } from '../../moteur.js';
import { ErreurControle } from '../commun.js';
import {
  compterPaiementsSansPiece,
  regleCCK13,
  regleCCK13S,
  type DebitBancaire,
} from '../paiement-sans-piece.js';

let n = 0;
function debit(montant: number, over: Partial<DebitBancaire> = {}): DebitBancaire {
  n += 1;
  return { id: `d${String(n).padStart(3, '0')}`, montant: centimes(montant), type: 'achat', rapproche: false, ...over };
}
const rapproche = (m: number) => debit(m, { rapproche: true });

function cas47(): DebitBancaire[] {
  const l: DebitBancaire[] = [];
  for (let i = 0; i < 38; i++) l.push(rapproche(1000 + i));
  l.push(debit(20000, { type: 'virement_interne' }), debit(30000, { type: 'virement_interne' }));
  l.push(debit(90000, { type: 'impot' }));
  l.push(debit(4500, { qualification: 'personnel' }));
  l.push(debit(1200, { qualification: 'pas_de_piece_necessaire' }));
  l.push(debit(50000), debit(7240), debit(18600));
  l.push(debit(3300, { type: 'inconnu' }));
  return l;
}

const exception = (f: () => unknown, code: string) => {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurControle);
    expect((e as ErreurControle).code).toBe(code);
    return;
  }
  throw new Error('exception attendue');
};
const ids = (d: DebitBancaire[]) => d.map((x) => x.id).sort();

describe('CC-K13 paiements sans pièce', () => {
  it('CT-14', () => {
    const debits = cas47();
    expect(debits).toHaveLength(47);
    const r = compterPaiementsSansPiece(debits);
    expect(r.sansPiece.nombre).toBe(3);
    expect(r.sansPiece.total).toBe(75840);
    expect(r.sansPiece.ids).toEqual(ids(debits.slice(43, 46)));
    expect(r.aQualifier).toEqual({ nombre: 1, total: 3300, ids: [debits[46]!.id] });
    expect(regleCCK13.evaluer(debits)).toEqual({ resultat: 'ALERTE', valeur: 3, ecartCentimes: 75840 });
    expect(regleCCK13).toMatchObject({ id: 'CC-K13', version: 1, gravite: 'M', bloque: [], actif: true });
    expect(regleCCK13.declencheurs).toEqual(['continu', 'nocturne', 'avant_cloture', 'a_la_demande']);
    expect(regleCCK13S).toMatchObject({ id: 'CC-K13S', version: 1, gravite: 'B', bloque: ['validation'], actif: true });
    expect(regleCCK13S.declencheurs).toEqual(regleCCK13.declencheurs);
    const traces = executerControles([regleCCK13], [{ type: 'mois', id: 'm1', donnee: debits }], 'nocturne', '2026-02-01T00:00:00Z');
    expect(traces[0]).toMatchObject({ resultat: 'ALERTE', valeur: 3, ecartCentimes: 75840 });
  });

  it('type-inconnu-compte-a-part', () => {
    const inconnu = debit(500, { type: 'inconnu' });
    const r = compterPaiementsSansPiece([inconnu, debit(200)]);
    expect(r.aQualifier).toEqual({ nombre: 1, total: 500, ids: [inconnu.id] });
    expect(r.sansPiece).toMatchObject({ nombre: 1, total: 200 });
    // un inconnu seul n'alerte pas CC-K13 ; un inconnu rapproché a sa pièce
    expect(regleCCK13.evaluer([inconnu])).toEqual({ resultat: 'OK' });
    expect(compterPaiementsSansPiece([debit(500, { type: 'inconnu', rapproche: true })]).aQualifier.nombre).toBe(0);
  });

  it('neutralises-exclus', () => {
    const neutres = (['virement_interne', 'emprunt', 'impot'] as const).map((t) => debit(900, { type: t }));
    const r = compterPaiementsSansPiece(neutres);
    expect(r.sansPiece).toEqual({ nombre: 0, total: 0, ids: [] });
    expect(r.aQualifier.nombre).toBe(0);
    expect(regleCCK13.evaluer(neutres)).toEqual({ resultat: 'OK' });
    // un achat rapproché a sa pièce
    expect(compterPaiementsSansPiece([rapproche(900)]).sansPiece.nombre).toBe(0);
  });

  it('personnel-qualifie-exclu', () => {
    const ds = [debit(700, { qualification: 'personnel' }), debit(800, { qualification: 'pas_de_piece_necessaire' })];
    expect(compterPaiementsSansPiece(ds).sansPiece.nombre).toBe(0);
    expect(regleCCK13.evaluer(ds)).toEqual({ resultat: 'OK' });
    exception(() => compterPaiementsSansPiece([debit(1, { qualification: 'autre' as never })]), 'entree_invalide');
  });

  it('seuil-exact-bloque', () => {
    const ds = [debit(500), debit(250)];
    const seuil = (v: number) => ({ debits: ds, seuil: centimes(v) });
    expect(regleCCK13S.evaluer(seuil(750))).toEqual({ resultat: 'ALERTE', valeur: 2, ecartCentimes: 750 });
    expect(regleCCK13S.evaluer(seuil(751))).toEqual({ resultat: 'OK' });
    expect(regleCCK13S.evaluer(seuil(749)).resultat).toBe('ALERTE');
    exception(() => regleCCK13S.evaluer({ debits: ds }), 'parametre_absent');
    for (const s of [0, -1, 1.5, NaN, Infinity]) exception(() => regleCCK13S.evaluer({ debits: ds, seuil: s as Centimes }), 'entree_invalide');
    expect(regleCCK13S.evaluer({ debits: [], seuil: centimes(1) })).toEqual({ resultat: 'OK' });
  });

  it('liste-vide-ok', () => {
    const vide = { nombre: 0, total: 0, ids: [] };
    expect(compterPaiementsSansPiece([])).toEqual({ sansPiece: vide, aQualifier: vide });
    expect(regleCCK13.evaluer([])).toEqual({ resultat: 'OK' });
  });

  it('ordre-inverse-meme-resultat', () => {
    const debits = cas47();
    const a = compterPaiementsSansPiece(debits);
    const b = compterPaiementsSansPiece([...debits].reverse());
    expect(b).toEqual(a);
    expect(a.sansPiece.ids).toEqual([...a.sansPiece.ids].sort());
    expect(regleCCK13S.evaluer({ debits: [...debits].reverse(), seuil: centimes(75840) }).resultat).toBe('ALERTE');
  });

  it('montants-invalides', () => {
    for (const m of [NaN, Infinity, -Infinity, 1.5, -1]) {
      exception(() => compterPaiementsSansPiece([debit(5), { ...debit(5), montant: m as Centimes }]), 'entree_invalide');
      exception(() => regleCCK13.evaluer([{ ...rapproche(5), montant: m as Centimes }]), 'entree_invalide');
    }
    exception(() => compterPaiementsSansPiece([{ ...debit(5), type: 'autre' as never }]), 'entree_invalide');
    expect(compterPaiementsSansPiece([debit(0)]).sansPiece).toMatchObject({ nombre: 1, total: 0 });
    // le moteur transforme l'exception en IMPOSSIBLE
    const t = executerControles([regleCCK13], [{ type: 'mois', id: 'm', donnee: [{ ...debit(5), montant: NaN as Centimes }] }], 'continu', '2026-02-01T00:00:00Z');
    expect(t[0]?.resultat).toBe('IMPOSSIBLE');
  });
});
