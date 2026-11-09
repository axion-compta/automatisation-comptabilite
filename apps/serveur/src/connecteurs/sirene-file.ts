// Sirene : file persistée, cache par client, identifiants d'accès (V3-DEC-012). Écrit contre des interfaces :
// aucun appel réseau ici, aucune IA. Le composant ne voit que des numéros publics et l'identifiant opaque du client.
import { aDemander, alerteIdentifiants, mettreEnCache, repliPanne, type Calendrier, type EntreeCache } from '../../../../packages/noyau/src/sources/sirene-cache.js';
import { preparerFile, router, tourDeRole, type DemandeFile } from '../../../../packages/noyau/src/sources/sirene-partage.js';
import { peutEnvoyer, type OptionsQuota } from '../../../../packages/noyau/src/sources/sirene-planif.js';
export type ReponseSirene = { numero: string; reponse: unknown; etat: 'actif' | 'ferme' };
export interface PortSirene { consulter(numeros: readonly string[], jeton: string, signal: AbortSignal): Promise<readonly ReponseSirene[]> }
export interface PortIdentifiants { courant(): Promise<{ jeton: string; echeance: string }> }
export interface PortFileSirene {
  ajouter(d: readonly DemandeFile[]): Promise<void>; enAttente(): Promise<readonly DemandeFile[]>; retirer(d: readonly DemandeFile[]): Promise<void>;
  envois(): Promise<readonly number[]>; noterEnvoi(a: number): Promise<void>;
}
export interface PortCacheSirene { lire(clientId: string): Promise<readonly EntreeCache[]>; ecrire(clientId: string, cache: readonly EntreeCache[]): Promise<void> }
export interface DepsSirene { service: PortSirene; identifiants: PortIdentifiants; file: PortFileSirene; cache: PortCacheSirene; calendrier: Calendrier; horloge(): number }
export interface ParametresPasse { quota: OptionsQuota; delaiMs: number; dureeCacheJours: number; joursAlerte: number }
export type Alerte = 'identifiants_a_renouveler' | 'service_indisponible';
export interface ResultatPasse { envoyes: number; issue: 'vide' | 'quota' | 'panne'; repli?: ReturnType<typeof repliPanne>; alertes: Alerte[] }
class ErreurService extends Error {}
/** Conversion unique : millisecondes -> ISO sans millisecondes (format du cache). */
const enIso = (ms: number): string => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
/** Cache du client d'abord ; seuls les numéros absents ou expirés, et pas déjà en file, sont ajoutés. */
export async function demanderSirene(
  deps: DepsSirene,
  clientId: string,
  numeros: readonly string[],
  maintenantIso: string,
): Promise<{ depuisCache: number; enFile: number }> {
  const uniques = preparerFile(numeros.map((numero) => ({ file: clientId, numero }))).map((d) => d.numero);
  const manquants = aDemander(uniques, await deps.cache.lire(clientId), maintenantIso);
  const presents = new Set((await deps.file.enAttente()).filter((d) => d.file === clientId).map((d) => d.numero));
  const nouveaux = manquants.filter((n) => !presents.has(n)).map((numero) => ({ file: clientId, numero }));
  if (nouveaux.length > 0) await deps.file.ajouter(nouveaux);
  return { depuisCache: uniques.length - manquants.length, enFile: nouveaux.length };
}
async function appeler(deps: DepsSirene, lot: readonly string[], jeton: string, delaiMs: number): Promise<readonly ReponseSirene[]> {
  const controle = new AbortController();
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeter) => {
    minuterie = setTimeout(() => {
      controle.abort();
      rejeter(new ErreurService());
    }, delaiMs);
  });
  try {
    const reponses = await Promise.race([deps.service.consulter(lot, jeton, controle.signal), limite]);
    const attendus = new Set(lot);
    const bien = Array.isArray(reponses) && reponses.every((r) => attendus.delete(r?.numero) && (r.etat === 'actif' || r.etat === 'ferme'));
    if (!bien || attendus.size > 0) throw new ErreurService();
    return reponses;
  } finally {
    clearTimeout(minuterie);
  }
}
/** Équité entre passes sans état propre : la file la plus chargée passe en tête (égalité : ordre d'arrivée). */
function parPlusEnRetard(attente: readonly DemandeFile[]): DemandeFile[] {
  const charge = new Map<string, number>();
  for (const d of attente) charge.set(d.file, (charge.get(d.file) ?? 0) + 1);
  return [...attente].sort((x, y) => charge.get(y.file)! - charge.get(x.file)!);
}
export async function traiterFile(deps: DepsSirene, p: ParametresPasse): Promise<ResultatPasse> {
  const alertes: Alerte[] = [];
  const plan = tourDeRole(parPlusEnRetard(await deps.file.enAttente()), deps.horloge(), p.quota);
  const { echeance } = await deps.identifiants.courant();
  const joursAvant = p.joursAlerte;
  if (alerteIdentifiants({ echeance, maintenant: enIso(deps.horloge()), joursAvant }, deps.calendrier)) {
    alertes.push('identifiants_a_renouveler');
  }
  const envois = [...(await deps.file.envois())];
  let envoyes = 0;
  for (const { file, lot } of plan) {
    const maintenant = deps.horloge();
    if (!peutEnvoyer(envois, maintenant, p.quota)) return { envoyes, issue: 'quota', alertes };
    let reponses: readonly ReponseSirene[];
    try {
      reponses = await appeler(deps, lot, (await deps.identifiants.courant()).jeton, p.delaiMs);
    } catch {
      return { envoyes, issue: 'panne', repli: repliPanne(), alertes: [...alertes, 'service_indisponible'] };
    }
    const luLe = enIso(maintenant);
    const expireLe = deps.calendrier.ajouterJours(luLe, p.dureeCacheJours);
    const rendu = router(reponses.map((r) => ({ file, numero: r.numero, corps: r })), [file]).get(file) ?? [];
    let cache: readonly EntreeCache[] = await deps.cache.lire(file);
    for (const { numero, corps } of rendu) {
      cache = mettreEnCache(cache, { numero, reponse: corps.reponse, etat: corps.etat, luLe, expireLe });
    }
    await deps.cache.ecrire(file, cache);
    const demandes = lot.map((numero) => ({ file, numero }));
    await deps.file.retirer(demandes);
    await deps.file.noterEnvoi(maintenant);
    envois.push(maintenant);
    envoyes++;
  }
  return { envoyes, issue: 'vide', alertes };
}
