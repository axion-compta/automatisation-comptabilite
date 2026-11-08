import { describe, expect, it } from 'vitest';
import { ROUTES_A_GESTE } from '../../../../../packages/contrat/src/gestes-routes.js';
import { CATALOGUE_GESTES, type Acteur, type CodeGeste, type TypeActeur } from '../../../../../packages/noyau/src/principes/gestes.js';
import { creerBaseMemoire, type DepotRefus } from '../../persistance/principes.js';
import { ErreurGarde, creerGardeGestes, type EvenementGesteRefuse } from '../garde-gestes.js';

const SOCIETE = 'societe-fictive-1';
const T0 = 1_700_000_000_000;
const DELAI = 300_000;
const CARTE: Record<string, string> = Object.fromEntries(CATALOGUE_GESTES.map((g) => [`op${g.code}`, g.code]));
const TOUTES = [...new Set(CATALOGUE_GESTES.map((g) => g.permission))];
const personne = (permissions: readonly string[], derniereReauth?: number): Acteur =>
  ({ type: 'personne', permissions, ...(derniereReauth === undefined ? {} : { derniereReauth }) });

function monter(o: { carte?: Record<string, string>; refus?: DepotRefus } = {}) {
  const base = creerBaseMemoire();
  const evenements: EvenementGesteRefuse[] = [];
  const pannes: unknown[] = [];
  let n = 0;
  const garde = creerGardeGestes({
    carte: o.carte ?? CARTE, refus: o.refus ?? base.refus, publier: (e) => evenements.push(e),
    maintenant: () => T0, delaiReauthMs: DELAI, nouvelId: () => `refus-${++n}`, signalerPanne: (e) => pannes.push(e),
  });
  const verifier = (operationId: string, acteur: Acteur, fusion?: boolean) =>
    garde.verifier({ operationId, societeId: SOCIETE, acteur, canal: 'api', ...(fusion === undefined ? {} : { fusion }) });
  return { base, evenements, pannes, verifier };
}
const codeErreur = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurGarde ? e.code : 'autre'; }
  return undefined;
};

describe('garde des gestes', () => {
  it('trente-six-refus-non-humains', async () => {
    const m = monter();
    const types: TypeActeur[] = ['service', 'agent', 'tache'];
    let total = 0;
    for (const type of types) for (const g of CATALOGUE_GESTES) {
      const v = await m.verifier(`op${g.code}`, { type, permissions: TOUTES, derniereReauth: T0 });
      expect(v).toEqual({ ok: false, statutHttp: 403, code: 'geste_humain_requis' });
      total += 1;
    }
    expect(total).toBe(3 * CATALOGUE_GESTES.length);
    const lignes = await m.base.refus.lister(SOCIETE);
    expect(lignes).toHaveLength(total);
    expect(m.evenements).toHaveLength(total);
    expect(new Set(lignes.map((l) => l.acteurType))).toEqual(new Set(types));
    expect(lignes.every((l) => l.code === 'geste_humain_requis' && l.geste !== null)).toBe(true);
    expect(m.evenements.every((e) => e.type === 'compta.geste.refuse' && e.societeId === SOCIETE)).toBe(true);
    expect(Object.keys(m.evenements[0]!).sort()).toEqual(['acteurType', 'code', 'geste', 'horodatage', 'operationId', 'societeId', 'type']);
  });

  it('vingt-quatre-refus-comptable-et-lecture', async () => {
    const m = monter();
    const profils = [['compta-lire', 'compta-exporter', 'compta-commenter'], ['compta-lire']];
    let n = 0;
    for (const p of profils) for (const g of CATALOGUE_GESTES) {
      const v = await m.verifier(`op${g.code}`, personne(p, T0 - 1));
      expect(v).toEqual({ ok: false, statutHttp: 403, code: 'permission_manquante' });
      n += 1;
    }
    expect(n).toBe(2 * CATALOGUE_GESTES.length);
    expect(await m.base.refus.lister(SOCIETE)).toHaveLength(n);
  });

  it('douze-acceptes-apres-reauth-recente', async () => {
    const m = monter();
    for (const g of CATALOGUE_GESTES) {
      expect(await m.verifier(`op${g.code}`, personne([...TOUTES], T0 - (DELAI - 1)))).toEqual({ ok: true });
    }
    expect(await m.base.refus.lister(SOCIETE)).toEqual([]);
    expect(m.evenements).toEqual([]);
  });

  it('reauth-a-la-limite-refusee', async () => {
    const m = monter();
    for (const g of CATALOGUE_GESTES) {
      const v = await m.verifier(`op${g.code}`, personne([...TOUTES], T0 - DELAI));
      if (g.reauth === 'jamais') expect(v).toEqual({ ok: true });
      else if (g.reauth === 'toujours') expect(v).toEqual({ ok: false, statutHttp: 403, code: 'reauth_requise' });
    }
    expect((await m.base.refus.lister(SOCIETE)).every((l) => l.code === 'reauth_requise')).toBe(true);
  });

  it('g09-fusion-exige-reauth', async () => {
    const m = monter();
    const p = personne([...TOUTES], T0 - DELAI);
    expect(await m.verifier('opG09', p, false)).toEqual({ ok: true });
    expect(await m.verifier('opG09', p, true)).toEqual({ ok: false, statutHttp: 403, code: 'reauth_requise' });
    expect(await m.verifier('opG09', personne([...TOUTES], T0 - 1), true)).toEqual({ ok: true });
  });

  it('route-sensible-non-declaree-refusee', async () => {
    const m = monter();
    for (const op of ['validerLot', 'ValiderLot']) {
      expect(await m.verifier(op, personne([...TOUTES], T0))).toEqual({ ok: false, statutHttp: 403, code: 'route_non_declaree' });
    }
    const lignes = await m.base.refus.lister(SOCIETE);
    expect(lignes).toHaveLength(2);
    expect(lignes.every((l) => l.geste === null)).toBe(true);
    expect(m.evenements.map((e) => e.geste)).toEqual([null, null]);
  });

  it('route-ordinaire-acceptee', async () => {
    const m = monter();
    for (const op of ['creerEcriture', 'listerEcritures', 'revalider']) {
      expect(await m.verifier(op, { type: 'agent', permissions: [] })).toEqual({ ok: true });
    }
    expect(await m.base.refus.lister(SOCIETE)).toEqual([]);
  });

  it('carte-invalide-refusee-a-la-creation', () => {
    const faire = (carte: Record<string, string>, delaiReauthMs = DELAI) => () => creerGardeGestes({
      carte, refus: creerBaseMemoire().refus, publier: () => undefined, maintenant: () => T0,
      delaiReauthMs, nouvelId: () => 'x', signalerPanne: () => undefined,
    });
    expect(codeErreur(faire({ a: 'G13' }))).toBe('carte_invalide');
    expect(codeErreur(faire({ a: '' }))).toBe('carte_invalide');
    expect(codeErreur(faire({ a: 'g01' }))).toBe('carte_invalide');
    for (const d of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(codeErreur(faire(CARTE, d))).toBe('entree_invalide');
    expect(codeErreur(faire(CARTE))).toBeUndefined();
  });

  it('ecriture-du-refus-en-panne-reste-403', async () => {
    const panne = new Error('base en panne');
    const casse: DepotRefus = { ajouter: async () => { throw panne; }, lister: async () => [] };
    const m = monter({ refus: casse });
    const v = await m.verifier('opG02', personne(['compta-lire'], T0));
    expect(v).toEqual({ ok: false, statutHttp: 403, code: 'permission_manquante' });
    expect(m.evenements).toHaveLength(1);
    expect(m.pannes).toEqual([panne]);
  });

  it('ecrit-la-ligne-avant-l-evenement', async () => {
    const ordre: string[] = [];
    const base = creerBaseMemoire();
    const garde = creerGardeGestes({
      carte: CARTE, refus: { ajouter: async (r) => { ordre.push('ligne'); await base.refus.ajouter(r); }, lister: base.refus.lister },
      publier: () => ordre.push('evenement'), maintenant: () => T0, delaiReauthMs: DELAI, nouvelId: () => 'r', signalerPanne: () => undefined,
    });
    await garde.verifier({ operationId: 'opG01', societeId: SOCIETE, acteur: { type: 'agent', permissions: [] }, canal: 'chat' });
    expect(ordre).toEqual(['ligne', 'evenement']);
  });

  it('carte-reelle-acceptee', () => {
    const codes = new Set<string>(CATALOGUE_GESTES.map((g) => g.code as CodeGeste));
    expect(Object.values(ROUTES_A_GESTE).every((c) => codes.has(c))).toBe(true);
    expect(codeErreur(() => creerGardeGestes({
      refus: creerBaseMemoire().refus, publier: () => undefined, maintenant: () => T0,
      delaiReauthMs: DELAI, nouvelId: () => 'x', signalerPanne: () => undefined,
    }))).toBeUndefined();
  });
});
