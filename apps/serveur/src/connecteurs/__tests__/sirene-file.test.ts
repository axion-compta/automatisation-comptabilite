import { afterEach, describe, expect, it, vi } from 'vitest';
import { demanderSirene, traiterFile, type DepsSirene, type PortSirene } from '../sirene-file.js';
import { ErreurCache, type EntreeCache } from '../../../../../packages/noyau/src/sources/sirene-cache.js';
import { ErreurPartage, sirenValide, type DemandeFile } from '../../../../../packages/noyau/src/sources/sirene-partage.js';
import { ErreurPlanif, respecteLeQuota, type OptionsQuota } from '../../../../../packages/noyau/src/sources/sirene-planif.js';
const OPTS: OptionsQuota = { quotaParFenetre: 3, fenetreMs: 60000, intervalleMinMs: 1000, tailleLot: 2 };
const PARAMS = { quota: OPTS, delaiMs: 500, dureeCacheJours: 7, joursAlerte: 30 };
const DEBUT = Date.UTC(2026, 10, 8, 10, 0, 0);
const JOUR_MS = 86400000;
const [A, B] = ['client-a', 'client-b'] as const;
const jeton = (c = 'j') => c.repeat(12);
const siren = (base: number): string => [...'0123456789'].map((c) => String(base).padStart(8, '0') + c).find(sirenValide)!;
const nSirens = (n: number, debut: number) => Array.from({ length: n }, (_, i) => siren(debut + i));
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const calendrier = {
  ajouterJours(date: string, n: number) {
    const d = new Date(date.slice(0, 10) + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10) + date.slice(10);
  },
};
function monde(service?: PortSirene['consulter'], echeanceJours = 90) {
  const t = { ms: DEBUT };
  const s = {
    attente: [] as DemandeFile[],
    envois: [] as number[],
    caches: new Map<string, EntreeCache[]>(),
    appels: [] as { numeros: readonly string[]; jeton: string; signal: AbortSignal }[],
    jeton: jeton(),
    echeanceJours,
  };
  const defaut: PortSirene['consulter'] = (numeros) =>
    Promise.resolve(numeros.map((numero) => ({ numero, reponse: { nom: 'Société fictive ' + numero }, etat: 'actif' as const })));
  const deps: DepsSirene = {
    service: { consulter: (numeros, j, signal) => (s.appels.push({ numeros, jeton: j, signal }), (service ?? defaut)(numeros, j, signal)) },
    identifiants: { courant: () => Promise.resolve({ jeton: s.jeton, echeance: iso(t.ms + s.echeanceJours * JOUR_MS).slice(0, 10) }) },
    file: {
      ajouter: (d) => Promise.resolve(void s.attente.push(...d)),
      enAttente: () => Promise.resolve([...s.attente]),
      retirer: (d) => Promise.resolve(void (s.attente = s.attente.filter((x) => !d.some((y) => y.file === x.file && y.numero === x.numero)))),
      envois: () => Promise.resolve([...s.envois]),
      noterEnvoi: (a) => Promise.resolve(void s.envois.push(a)),
    },
    cache: { lire: (c) => Promise.resolve(s.caches.get(c) ?? []), ecrire: (c, v) => Promise.resolve(void s.caches.set(c, [...v])) },
    calendrier,
    horloge: () => t.ms,
  };
  return { deps, s, t };
}
const importer = (m: ReturnType<typeof monde>, client: string, numeros: string[]) => demanderSirene(m.deps, client, numeros, iso(m.t.ms));
async function viderFile(m: ReturnType<typeof monde>) {
  for (let passe = 0; passe < 200 && m.s.attente.length > 0; passe++) {
    await traiterFile(m.deps, PARAMS);
    m.t.ms += OPTS.intervalleMinMs;
  }
}
afterEach(() => vi.useRealTimers());
describe('sirene-file', () => {
  it('s1-second-import-zero-requete', async () => {
    const m = monde();
    const numeros = nSirens(3, 100);
    expect(await importer(m, A, numeros)).toEqual({ depuisCache: 0, enFile: numeros.length });
    await viderFile(m);
    const appelsApres = m.s.appels.length;
    expect(appelsApres).toBeGreaterThan(0);
    expect(await importer(m, A, numeros)).toEqual({ depuisCache: numeros.length, enFile: 0 });
    expect(await traiterFile(m.deps, PARAMS)).toMatchObject({ envoyes: 0, issue: 'vide' });
    expect(m.s.appels.length).toBe(appelsApres);
  });
  it('s2-identifiants-alerte-avant-echeance', async () => {
    const proche = monde(undefined, PARAMS.joursAlerte - 1);
    expect((await traiterFile(proche.deps, PARAMS)).alertes).toContain('identifiants_a_renouveler');
    const loin = monde(undefined, PARAMS.joursAlerte + 1);
    expect((await traiterFile(loin.deps, PARAMS)).alertes).toEqual([]);
  });
  it('s3-deux-clients-partage-equitable', async () => {
    const m = monde();
    const nombre = 7;
    await importer(m, A, nSirens(nombre, 200));
    await importer(m, B, nSirens(nombre, 300));
    const lotsAttendus = 2 * Math.ceil(nombre / OPTS.tailleLot);
    const restants = (c: string) => m.s.attente.filter((d) => d.file === c).length;
    let ecartMax = 0;
    for (let passe = 0; passe < 500 && m.s.attente.length > 0; passe++) {
      const r = await traiterFile(m.deps, PARAMS);
      if (r.issue === 'quota') m.t.ms += OPTS.fenetreMs / OPTS.quotaParFenetre;
      m.t.ms += OPTS.intervalleMinMs;
      ecartMax = Math.max(ecartMax, Math.abs(restants(A) - restants(B)));
    }
    expect(m.s.attente).toEqual([]);
    expect(m.s.envois.length).toBe(lotsAttendus);
    expect(respecteLeQuota(m.s.envois, OPTS)).toBe(true);
    expect(ecartMax).toBeLessThanOrEqual(OPTS.tailleLot);
  });
  it('aucune-reponse-croisee', async () => {
    const m = monde();
    const na = nSirens(3, 400);
    const nb = nSirens(3, 500);
    await importer(m, A, na);
    await importer(m, B, nb);
    await viderFile(m);
    expect(m.s.caches.get(A)?.map((e) => e.numero).sort()).toEqual([...na].sort());
    expect(m.s.caches.get(B)?.map((e) => e.numero).sort()).toEqual([...nb].sort());
  });
  it('cache-separe-par-client', async () => {
    const m = monde();
    const commun = nSirens(1, 600);
    await importer(m, A, commun);
    await importer(m, B, commun);
    await viderFile(m);
    expect(m.s.caches.get(A)).toHaveLength(commun.length);
    expect(m.s.caches.get(B)).toHaveLength(commun.length);
  });
  it('file-ne-perd-rien-en-panne', async () => {
    let panne = true;
    const m = monde((numeros) => {
      if (panne) return Promise.reject(new Error('service coupé'));
      return Promise.resolve(numeros.map((numero) => ({ numero, reponse: {}, etat: 'actif' as const })));
    });
    await importer(m, A, nSirens(2, 700));
    const avant = [...m.s.attente];
    const r = await traiterFile(m.deps, PARAMS);
    expect(r.issue).toBe('panne');
    expect(r.repli?.saisieManuelle).toBe(true);
    expect(r.alertes).toContain('service_indisponible');
    expect(m.s.attente).toEqual(avant);
    expect(m.s.envois).toEqual([]);
    panne = false;
    m.t.ms += OPTS.intervalleMinMs;
    await traiterFile(m.deps, PARAMS);
    expect(m.s.attente).toEqual([]);
    expect(m.s.envois).toHaveLength(1);
    expect(m.s.appels.at(-1)?.numeros).toEqual(avant.map((d) => d.numero));
  });
  it('delai-depasse-lot-garde', async () => {
    vi.useFakeTimers();
    const m = monde(() => new Promise(() => undefined));
    await importer(m, A, nSirens(2, 800));
    const enCours = traiterFile(m.deps, PARAMS);
    await vi.advanceTimersByTimeAsync(PARAMS.delaiMs);
    const r = await enCours;
    expect(m.s.appels[0]?.signal.aborted).toBe(true);
    expect(r.issue).toBe('panne');
    expect(m.s.attente).toHaveLength(2);
  });
  it('reprise-apres-redemarrage', async () => {
    const m = monde();
    const numeros = nSirens(5, 900);
    await importer(m, A, numeros);
    await traiterFile(m.deps, { ...PARAMS, quota: { ...OPTS, quotaParFenetre: 1 } });
    const reste = m.s.attente.length;
    expect(reste).toBeGreaterThan(0);
    expect(reste).toBeLessThan(numeros.length);
    const apres = monde();
    Object.assign(apres.s, { attente: m.s.attente, envois: m.s.envois, caches: m.s.caches });
    apres.t.ms = m.t.ms + OPTS.fenetreMs;
    expect(await importer(apres, A, numeros)).toMatchObject({ enFile: 0 });
    await viderFile(apres);
    const tous = apres.s.caches.get(A)?.map((e) => e.numero).sort();
    expect(tous).toEqual([...numeros].sort());
    const demandes = [...m.s.appels, ...apres.s.appels].flatMap((a) => a.numeros).sort();
    expect(demandes).toEqual([...numeros].sort());
  });
  it('renouvellement-identifiants-sans-perdre-la-file', async () => {
    const m = monde();
    await importer(m, A, nSirens(4, 1000));
    await traiterFile(m.deps, { ...PARAMS, quota: { ...OPTS, quotaParFenetre: 1 } });
    const restant = m.s.attente.length;
    expect(restant).toBeGreaterThan(0);
    m.s.jeton = jeton('k');
    m.t.ms += OPTS.fenetreMs;
    const r = await traiterFile(m.deps, PARAMS);
    expect(m.s.appels[0]?.jeton).toBe(jeton());
    expect(m.s.appels.at(-1)?.jeton).toBe(jeton('k'));
    expect(m.s.attente).toEqual([]);
    expect(JSON.stringify(r)).not.toContain(jeton('k'));
  });
  it('entrees-invalides-propagees', async () => {
    const m = monde();
    const [bon] = nSirens(1, 1100) as [string];
    await importer(m, A, [bon]);
    for (const q of [Number.NaN, 0, 1.5, Number.POSITIVE_INFINITY]) {
      await expect(traiterFile(m.deps, { ...PARAMS, quota: { ...OPTS, quotaParFenetre: q } })).rejects.toBeInstanceOf(ErreurPlanif);
    }
    expect(m.s.appels).toEqual([]);
    const fausse = bon.slice(0, -1) + String((Number(bon.slice(-1)) + 1) % 10);
    for (const n of [fausse, ' ' + bon, '']) {
      await expect(importer(m, B, [n])).rejects.toBeInstanceOf(ErreurPartage);
    }
    await expect(demanderSirene(m.deps, B, [bon], '08/11/2026')).rejects.toBeInstanceOf(ErreurCache);
    expect(m.s.attente).toEqual([{ file: A, numero: bon }]);
  });
});
