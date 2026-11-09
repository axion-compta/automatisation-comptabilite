import { describe, expect, it } from 'vitest';
import { creerBoiteEnvoiMemoire } from '../../../../../packages/noyau/src/evenements/memoire.js';
import type { UniteDeTravail } from '../../../../../packages/noyau/src/evenements/publication.js';
import { CATALOGUE_GESTES } from '../../../../../packages/noyau/src/principes/gestes.js';
import type { Session } from '../../../../../packages/noyau/src/session/port.js';
import { creerBaseMemoire, type DepotRefus } from '../../persistance/principes.js';
import { ErreurGarde, creerGardeGestes } from '../garde-gestes.js';

const SOCIETE = 'societe-fictive-1';
const T0 = 1_700_000_000_000;
const DELAI = 300_000;
const CARTE: Record<string, string> = Object.fromEntries(CATALOGUE_GESTES.map((g) => [`op${g.code}`, g.code]));
const TOUTES = [...new Set(CATALOGUE_GESTES.map((g) => g.permission))];
const session = (permissions: readonly string[], ecartReauth?: number, extra: Record<string, unknown> = {}): Session => ({
  personneId: 'personne-fictive-1', nature: 'personne', organisationId: 'org-fictive-1', organisations: ['org-fictive-1'],
  societeId: SOCIETE, societes: [SOCIETE], roles: ['utilisateur'], permissions,
  revendications: { acr: 'mfa', ...(ecartReauth === undefined ? {} : { authTime: (T0 - ecartReauth) / 1000 }) }, ...extra,
}) as unknown as Session;
type Qui = { session: Session | null; executant?: 'agent' | 'tache' };
const personne = (permissions: readonly string[], ecartReauth?: number): Qui => ({ session: session(permissions, ecartReauth) });

function monter(o: { carte?: Record<string, string>; refus?: DepotRefus; unite?: UniteDeTravail } = {}) {
  const base = creerBaseMemoire();
  const boite = creerBoiteEnvoiMemoire();
  const pannes: unknown[] = [];
  let n = 0;
  const garde = creerGardeGestes({
    carte: o.carte ?? CARTE, refus: o.refus ?? base.refus, unite: o.unite ?? boite,
    maintenant: () => T0, delaiReauthMs: DELAI, nouvelId: () => `refus-${++n}`, signalerPanne: (e) => pannes.push(e),
  });
  const verifier = (operationId: string, q: Qui, fusion?: boolean) =>
    garde.verifier({ operationId, societeId: SOCIETE, ...q, canal: 'api', ...(fusion === undefined ? {} : { fusion }) });
  return { base, boite, pannes, verifier, evenements: () => boite.enAttente(10_000) };
}
const codeErreur = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurGarde ? e.code : 'autre'; }
  return undefined;
};

describe('garde des gestes', () => {
  it('trente-six-refus-non-humains', async () => {
    const m = monter();
    const qui: Qui[] = [{ session: { ...session(TOUTES, 1), nature: 'service' } }, { ...personne(TOUTES, 1), executant: 'agent' }, { ...personne(TOUTES, 1), executant: 'tache' }];
    let total = 0;
    for (const q of qui) for (const g of CATALOGUE_GESTES) {
      expect(await m.verifier(`op${g.code}`, q)).toEqual({ ok: false, statutHttp: 403, code: 'geste_humain_requis' });
      total += 1;
    }
    expect(total).toBe(3 * CATALOGUE_GESTES.length);
    const lignes = await m.base.refus.lister(SOCIETE);
    const evenements = await m.evenements();
    expect(lignes).toHaveLength(total);
    expect(evenements).toHaveLength(total);
    expect(new Set(lignes.map((l) => l.acteurType))).toEqual(new Set(['service', 'agent', 'tache']));
    expect(lignes.every((l) => l.code === 'geste_humain_requis' && l.geste !== null)).toBe(true);
    expect(evenements.every((e) => e.type === 'compta.geste.refuse' && e.societe_id === SOCIETE && e.acteur.type === 'systeme')).toBe(true);
    expect(JSON.stringify(evenements)).not.toContain('personne-fictive-1');
  });

  it('vingt-quatre-refus-comptable-et-lecture', async () => {
    const m = monter();
    let n = 0;
    for (const p of [['compta-lire', 'compta-exporter', 'compta-commenter'], ['compta-lire']]) for (const g of CATALOGUE_GESTES) {
      expect(await m.verifier(`op${g.code}`, personne(p, 1))).toEqual({ ok: false, statutHttp: 403, code: 'permission_manquante' });
      n += 1;
    }
    expect(n).toBe(2 * CATALOGUE_GESTES.length);
    expect(await m.base.refus.lister(SOCIETE)).toHaveLength(n);
  });

  it('douze-acceptes-apres-reauth-recente', async () => {
    const m = monter();
    for (const g of CATALOGUE_GESTES) expect(await m.verifier(`op${g.code}`, personne([...TOUTES], DELAI - 1))).toEqual({ ok: true });
    expect(await m.base.refus.lister(SOCIETE)).toEqual([]);
  });

  it('reauth-a-la-limite-refusee', async () => {
    const m = monter();
    for (const g of CATALOGUE_GESTES) {
      const v = await m.verifier(`op${g.code}`, personne([...TOUTES], DELAI));
      if (g.reauth === 'jamais') expect(v).toEqual({ ok: true });
      else if (g.reauth === 'toujours') expect(v).toEqual({ ok: false, statutHttp: 403, code: 'reauth_requise' });
    }
    expect((await m.base.refus.lister(SOCIETE)).every((l) => l.code === 'reauth_requise')).toBe(true);
  });

  it('session-absente-ou-sans-mfa-refusee', async () => {
    const m = monter();
    expect(await m.verifier('opG02', { session: null })).toEqual({ ok: false, statutHttp: 403, code: 'geste_humain_requis' });
    const sansMfa = session(TOUTES, 1, { revendications: { authTime: (T0 - 1) / 1000 } });
    expect(await m.verifier('opG02', { session: sansMfa })).toEqual({ ok: false, statutHttp: 403, code: 'reauth_requise' });
    expect(await m.verifier('opG01', { session: sansMfa })).toEqual({ ok: true });
    expect(await m.base.refus.lister(SOCIETE)).toHaveLength(2);
  });

  it('g09-fusion-exige-reauth', async () => {
    const m = monter();
    const p = personne([...TOUTES], DELAI);
    expect(await m.verifier('opG09', p, false)).toEqual({ ok: true });
    expect(await m.verifier('opG09', p, true)).toEqual({ ok: false, statutHttp: 403, code: 'reauth_requise' });
    expect(await m.verifier('opG09', personne([...TOUTES], 1), true)).toEqual({ ok: true });
  });

  it('route-sensible-non-declaree-refusee', async () => {
    const m = monter();
    for (const op of ['validerLot', 'ValiderLot']) {
      expect(await m.verifier(op, personne([...TOUTES], 0))).toEqual({ ok: false, statutHttp: 403, code: 'route_non_declaree' });
    }
    const lignes = await m.base.refus.lister(SOCIETE);
    expect(lignes).toHaveLength(2);
    expect(lignes.every((l) => l.geste === null)).toBe(true);
    expect((await m.evenements()).map((e) => e.charge.geste)).toEqual([null, null]);
  });

  it('route-ordinaire-acceptee', async () => {
    const m = monter();
    for (const op of ['creerEcriture', 'listerEcritures', 'revalider']) expect(await m.verifier(op, { session: null })).toEqual({ ok: true });
    expect(await m.base.refus.lister(SOCIETE)).toEqual([]);
  });

  it('carte-invalide-refusee-a-la-creation', () => {
    const faire = (carte: Record<string, string>, delaiReauthMs = DELAI) => () => creerGardeGestes({
      carte, refus: creerBaseMemoire().refus, unite: creerBoiteEnvoiMemoire(), maintenant: () => T0,
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
    const m = monter({ refus: { ajouter: async () => { throw panne; }, lister: async () => [] } });
    expect(await m.verifier('opG02', personne(['compta-lire'], 0))).toEqual({ ok: false, statutHttp: 403, code: 'permission_manquante' });
    expect(await m.evenements()).toHaveLength(1);
    expect(m.pannes).toEqual([panne]);
  });

  it('ligne-et-evenement-dans-la-meme-transaction', async () => {
    const ordre: string[] = [];
    const base = creerBaseMemoire();
    const boite = creerBoiteEnvoiMemoire();
    let dansTx = false;
    const unite: UniteDeTravail = { executer: (t) => { dansTx = true; return boite.executer(({ boite: b }) => t({ boite: { deposer: (e) => { ordre.push(dansTx ? 'evenement-en-tx' : 'hors-tx'); b.deposer(e); } } })).finally(() => { dansTx = false; }); } };
    const refus = { ajouter: async (r: Parameters<typeof base.refus.ajouter>[0]) => { ordre.push(dansTx ? 'ligne-en-tx' : 'hors-tx'); await base.refus.ajouter(r); }, lister: base.refus.lister };
    const m = monter({ refus, unite });
    await m.verifier('opG01', { session: null });
    expect(ordre).toEqual(['ligne-en-tx', 'evenement-en-tx']);
  });

  it('carte-reelle-acceptee', () => {
    expect(codeErreur(() => creerGardeGestes({
      refus: creerBaseMemoire().refus, unite: creerBoiteEnvoiMemoire(), maintenant: () => T0,
      delaiReauthMs: DELAI, nouvelId: () => 'x', signalerPanne: () => undefined,
    }))).toBeUndefined();
  });
});
