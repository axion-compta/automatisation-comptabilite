import { http, HttpResponse, type HttpHandler } from 'msw';
import { QueryAlertes } from '../../../contrat/src/domaines/alertes.js';
import { creerServiceAlertes, ErreurService } from '../../../contrat/src/domaines/alertes-service.js';
import { EnTeteEcriture } from '../../../contrat/src/schemas.js';
import type { OptionsFauxServeur } from '../handlers.js';

const erreur = (code: string, status: number) => HttpResponse.json({ defined: status === 404, code, status, message: code }, { status });
const PANNES: Record<number, string> = { 403: 'FORBIDDEN', 409: 'CONFLIT_VERSION', 423: 'RESSOURCE_VERROUILLEE' };
const STATUTS: Record<string, number> = {
  alerte_inconnue: 404, report_invalide: 422, report_apres_echeance: 422, motif_requis: 422, report_interdit: 403, bloquant_non_ignorable: 403,
  role_lecture: 403, role_insuffisant: 403, version_perimee: 409, alerte_inactive: 409, delai_annulation_depasse: 409,
};
const NOMS = ['etat', 'entree', 'limite', 'decalage'];

/** Query stricte : champ inconnu ou paramètre répété = 400 ; `undefined` si refusée. */
function lireQuery(url: string) {
  const q = new URL(url).searchParams;
  const cles = [...q.keys()];
  if (cles.some((k) => !NOMS.includes(k)) || NOMS.some((n) => q.getAll(n).length > 1)) return undefined;
  const r = QueryAlertes.safeParse(Object.fromEntries(cles.map((k) => [k, q.get(k)])));
  return r.success ? r.data : undefined;
}

/** Handlers des alertes (liste) et des compteurs : même service en mémoire que le vrai serveur, un service neuf par fabrique. */
export function creerHandlersAlertes(base: string, attendre: () => Promise<void>, options: OptionsFauxServeur = {}): HttpHandler[] {
  const service = creerServiceAlertes();
  const CODES: Record<string, string> = { role_lecture: 'ROLE_INSUFFISANT', version_perimee: 'CONFLIT_VERSION' };
  /** Panne `x-panne` (403, 409, 423) ou défaut des options, sur les trois routes d'écriture. */
  const panne = (request: Request, id: string) => {
    const demandee = Number(request.headers.get('x-panne'));
    const n = PANNES[demandee] ? demandee : Number(options.panne);
    if (!PANNES[n]) return undefined;
    const version = service.lister().body.find((a) => a.id === id)?.version ?? 1;
    return n === 409 ? HttpResponse.json({ defined: true, code: PANNES[n], status: 409, message: PANNES[n], data: { versionActuelle: version } }, { status: 409 }) : erreur(PANNES[n] as string, n);
  };
  /** Écriture : panne, en-tête, exercice et corps vérifiés, puis le MÊME service que la lecture. */
  const ecrire = (action: 'reporter' | 'ignorer' | 'annuler', champ: 'jours' | 'motif' | null): HttpHandler =>
    http.post(base + `/exercices/:exercice/alertes/:id/${action}`, async ({ request, params }) => {
      await attendre();
      const coupure = panne(request, String(params['id']));
      if (coupure) return coupure;
      const entete = EnTeteEcriture.safeParse({ 'idempotency-key': request.headers.get('idempotency-key') ?? undefined });
      const corps = (await request.json().catch(() => undefined)) as Record<string, unknown> | undefined;
      const cles = corps && typeof corps === 'object' ? Object.keys(corps).sort().join() : '';
      const attendu = (champ ? [champ, 'version'] : ['version']).sort().join();
      const valeur = champ ? corps?.[champ] : 0;
      const bon = champ === 'jours' ? Number.isInteger(valeur) : champ === 'motif' ? typeof valeur === 'string' : true;
      if (!entete.success || cles !== attendu || !bon || !Number.isInteger(corps?.['version'])) return erreur('BAD_REQUEST', 400);
      if (!service.exerciceConnu(String(params['exercice']))) return erreur('EXERCICE_INCONNU', 404);
      const [k, id, v] = [entete.data['idempotency-key'], String(params['id']), corps?.['version'] as number];
      try {
        return HttpResponse.json(action === 'reporter' ? service.reporter(k, id, valeur as number, v) : action === 'ignorer' ? service.ignorer(k, id, valeur as string, v) : service.annuler(k, id, v));
      } catch (e) {
        if (!(e instanceof ErreurService)) throw e;
        const code = CODES[e.code] ?? e.code.toUpperCase();
        const statut = STATUTS[e.code] ?? 409;
        return HttpResponse.json({ defined: true, code, status: statut, message: code, ...(e.versionActuelle !== undefined ? { data: { versionActuelle: e.versionActuelle } } : {}) }, { status: statut });
      }
    });
  return [
    ecrire('reporter', 'jours'), ecrire('ignorer', 'motif'), ecrire('annuler', null),
    http.get(base + '/exercices/:exercice/alertes', async ({ request, params }) => {
      await attendre();
      if (!service.exerciceConnu(String(params['exercice']))) return erreur('EXERCICE_INCONNU', 404);
      const query = lireQuery(request.url);
      return query ? HttpResponse.json(service.lister(query)) : erreur('BAD_REQUEST', 400);
    }),
    http.get(base + '/exercices/:exercice/compteurs', async ({ params }) => {
      await attendre();
      return service.exerciceConnu(String(params['exercice'])) ? HttpResponse.json(service.compteurs()) : erreur('EXERCICE_INCONNU', 404);
    }),
  ];
}
