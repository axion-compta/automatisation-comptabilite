// Routes d'import de relevé (V3-BAN-001, V3-BAN-091) : gestionnaires purs rendant { statut, corps }. Données fictives en test, aucune base.
import { createHash } from 'node:crypto';
import { fichierDejaImporte, lignesNouvelles, numeroterOccurrences } from '../../../../packages/noyau/src/banque/doublons.js';
import { analyserReleve, type ContexteAnalyse, type EntreeReleve, type RapportImport } from '../../../../packages/noyau/src/banque/import/analyse.js';
import { ErreurProfil, verifierProfil, type ProfilImport } from '../../../../packages/noyau/src/banque/import/profil.js';
import { normaliserLibelle } from '../../../../packages/noyau/src/banque/libelles/normaliser.js';
import type { Contexte, DepotBanque, Rangee } from './depot.js';
import { avecIdempotence, proteger, reponse, type RegistreIdempotence, type ReponseHttp } from './reponses-http.js';
/** deposerSiAbsent n'écrit jamais par-dessus : l'original reste intact. */
export interface StockageOriginaux { deposerSiAbsent(societeId: string, empreinte: string, octets: Uint8Array): Promise<void>; lire(societeId: string, empreinte: string): Promise<Uint8Array> }
/** Rend null si le format n'est pas reconnu ; les adaptateurs PDF et XLSX se branchent ici. */
export interface LecteurReleve { lire(octets: Uint8Array): Promise<EntreeReleve | null> }
export type DependancesImport = {
  depot: DepotBanque; originaux: StockageOriginaux; lecteur: LecteurReleve;
  hacherIban: (ibanBrut: string | undefined) => string | undefined;
  idempotence: RegistreIdempotence;
  lancerRapprochement: (a: { societeId: string; compteId: string; importId: string }) => Promise<void>;
  parametres: { taillesApercu: number; limitesXml: ContexteAnalyse['limitesXml']; villes: readonly string[] };
};
const sha256 = (o: Uint8Array | string): string => createHash('sha256').update(o).digest('hex');
const texteEntete = (e: EntreeReleve): string | undefined => (e.format === 'csv' ? e.texte.split('\n')[0] : e.format === 'tableur' ? e.lignes[0]?.join(';') : undefined);
const largeur = (e: EntreeReleve): number => (e.format === 'csv' ? (e.texte.split('\n')[0] ?? '').split(/[;,\t]/).length : e.format === 'tableur' ? Math.max(0, ...e.lignes.map((l) => l.length)) : 0);
const FINI = ['confirme', 'annule'];
type Analyse = { rapport: RapportImport; entree: EntreeReleve };
async function analyser(deps: DependancesImport, ctx: Contexte, job: Rangee): Promise<Analyse | null> {
  const entree = await deps.lecteur.lire(await deps.originaux.lire(ctx.societeId, job['sha'] as string));
  if (entree === null) return null;
  const comptes = (await deps.depot.lister(ctx, 'compte_bancaire')).map((c) => ({ id: c.id, ferme: c['ferme'] === true, ...(typeof c['ibanHache'] === 'string' ? { ibanHache: c['ibanHache'] } : {}) }));
  const rapport = analyserReleve(entree, {
    comptes, taillesApercu: deps.parametres.taillesApercu, limitesXml: deps.parametres.limitesXml, ibanHache: deps.hacherIban,
    ...(job['profil'] !== undefined ? { profil: job['profil'] as ProfilImport } : {}),
    ...(typeof job['compteId'] === 'string' ? { compteChoisi: job['compteId'] } : {}),
  });
  return { rapport, entree };
}
function corpsImport(job: Rangee, { rapport: r }: Analyse): unknown {
  return { importId: job.id, etat: FINI.includes(job['etat'] as string) ? job['etat'] : r.etat, questions: r.questions, apercu: r.apercu, compteurs: r.compteurs, ...(r.motifRefus !== undefined ? { motifRefus: r.motifRefus } : {}) };
}
const majJob = (deps: DependancesImport, ctx: Contexte, job: Rangee, ch: Record<string, unknown>) => deps.depot.modifier(ctx, 'import_job', job.id, job.version, ch);
export const deposer = (deps: DependancesImport, ctx: Contexte, e: { cle: string; octets: Uint8Array; compteId?: string }): Promise<ReponseHttp> =>
  avecIdempotence(deps.idempotence, ctx.societeId, e.cle, { sha: sha256(e.octets), compteId: e.compteId }, () => proteger(async () => {
    const { depot } = deps;
    if (!(await depot.lister(ctx, 'consentement_banque')).some((c) => c['donneLe'] && !c['retireLe'])) return reponse(403, 'consentement_absent');
    const sha = sha256(e.octets);
    const deja = fichierDejaImporte(sha, (await depot.lister(ctx, 'fichier_source')).map((f) => ({ empreinte: f['empreinte'] as string, recuLe: f['recuLe'] as string })));
    if (deja.deja) return { statut: 200, corps: { etat: 'deja_importe', recuLe: deja.recuLe } };
    const entree = await deps.lecteur.lire(e.octets);
    if (entree === null) return reponse(422, 'format_inconnu');
    const texte = texteEntete(entree);
    const empreinteEntete = texte === undefined ? undefined : sha256(texte);
    const memo = empreinteEntete === undefined ? undefined : (await depot.lister(ctx, 'profil_import', { empreinteEntete }))[0];
    await deps.originaux.deposerSiAbsent(ctx.societeId, sha, e.octets);
    const fichier = await depot.ajouter(ctx, 'fichier_source', { empreinte: sha, recuLe: ctx.horodatage });
    const compteId = e.compteId ?? memo?.['compteId'];
    const job = await depot.ajouter(ctx, 'import_job', {
      fichierId: fichier.id, sha, etat: 'apercu',
      ...(empreinteEntete !== undefined ? { empreinteEntete } : {}), ...(memo ? { profil: memo['profil'] } : {}), ...(compteId !== undefined ? { compteId } : {}),
    });
    const a = (await analyser(deps, ctx, job))!;
    return { statut: 202, corps: corpsImport(await majJob(deps, ctx, job, { etat: a.rapport.etat }), a) };
  }));
export const lireImport = (deps: DependancesImport, ctx: Contexte, id: string): Promise<ReponseHttp> => proteger(async () => {
  const job = await deps.depot.lire(ctx, 'import_job', id);
  const a = await analyser(deps, ctx, job);
  return a === null ? reponse(422, 'format_inconnu') : { statut: 200, corps: corpsImport(job, a) };
});
export const repondre = (deps: DependancesImport, ctx: Contexte, id: string, e: { cle: string; compteId?: string; profil?: ProfilImport }): Promise<ReponseHttp> =>
  avecIdempotence(deps.idempotence, ctx.societeId, e.cle, { id, compteId: e.compteId, profil: e.profil }, () => proteger(async () => {
    const job = await deps.depot.lire(ctx, 'import_job', id);
    if (FINI.includes(job['etat'] as string)) return reponse(409, 'etat_incompatible');
    const avant = await analyser(deps, ctx, job);
    if (avant === null) return reponse(422, 'format_inconnu');
    try { if (e.profil !== undefined) verifierProfil(e.profil, largeur(avant.entree)); } catch (err) { if (err instanceof ErreurProfil) return reponse(422, 'profil_invalide'); throw err; }
    const maj = await majJob(deps, ctx, job, { ...(e.compteId !== undefined ? { compteId: e.compteId } : {}), ...(e.profil !== undefined ? { profil: e.profil } : {}) });
    const a = (await analyser(deps, ctx, maj))!;
    return { statut: 200, corps: corpsImport(await majJob(deps, ctx, maj, { etat: a.rapport.etat }), a) };
  }));
export const confirmer = (deps: DependancesImport, ctx: Contexte, id: string, cle: string): Promise<ReponseHttp> => {
  if (ctx.acteur.type === 'ia') return Promise.resolve(reponse(403, 'reserve_a_une_personne'));
  return avecIdempotence(deps.idempotence, ctx.societeId, cle, { id }, () => proteger(async () => {
    const { depot } = deps;
    const job = await depot.lire(ctx, 'import_job', id);
    if (FINI.includes(job['etat'] as string)) return reponse(409, 'etat_incompatible');
    const a = await analyser(deps, ctx, job);
    if (a === null || a.rapport.etat === 'refuse') return reponse(409, 'etat_incompatible');
    const { releves, questions } = a.rapport;
    if (questions.length > 0 || releves.some((r) => r.rattachement.type !== 'compte')) return reponse(409, 'questions_ouvertes');
    const bilan = { creees: 0, dejaPresentes: 0, rejetees: 0 };
    const comptes = new Set<string>();
    for (const { releve, rattachement } of releves) {
      const compteId = rattachement.type === 'compte' ? rattachement.compteId : '';
      const lues = numeroterOccurrences(releve.lignes.map((l) => ({ ...l, compteId, libelleNormalise: normaliserLibelle(l.libelleBrut, deps.parametres.villes).normalise })));
      const nouvelles = lignesNouvelles(await depot.lister(ctx, 'ligne_bancaire', { compteId }) as unknown as { empreinte: string; occurrence: number }[], lues);
      const rel = await depot.ajouter(ctx, 'releve', { compteId, importId: id });
      for (const l of nouvelles) await depot.ajouter(ctx, 'ligne_bancaire', { ...l, releveId: rel.id, importId: id });
      for (const r of releve.rejets) await depot.ajouter(ctx, 'ligne_rejetee', { importId: id, rang: r.rang, motif: r.motif });
      comptes.add(compteId);
      Object.assign(bilan, { creees: bilan.creees + nouvelles.length, dejaPresentes: bilan.dejaPresentes + lues.length - nouvelles.length, rejetees: bilan.rejetees + releve.rejets.length });
    }
    if (job['empreinteEntete'] !== undefined && job['profil'] !== undefined && (await depot.lister(ctx, 'profil_import', { empreinteEntete: job['empreinteEntete'] })).length === 0) await depot.ajouter(ctx, 'profil_import', { empreinteEntete: job['empreinteEntete'], profil: job['profil'], ...(comptes.size === 1 ? { compteId: [...comptes][0] } : {}) });
    await majJob(deps, ctx, job, { etat: 'confirme' });
    for (const compteId of comptes) await deps.lancerRapprochement({ societeId: ctx.societeId, compteId, importId: id });
    return { statut: 200, corps: bilan };
  }));
};
