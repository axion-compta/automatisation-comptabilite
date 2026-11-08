import { http, HttpResponse, type HttpHandler } from 'msw';
import { EtatDemande, EtatDoublon, EtatTrou, QueryLignes } from '../../../contrat/src/domaines/banque.js';
import { creerServiceBanque } from '../../../contrat/src/domaines/banque-service.js';

const erreur = (code: string, status: number, defined = false) =>
  HttpResponse.json({ defined, code, status, message: code }, { status });
const PANNES: Record<string, [string, number]> = { '403': ['FORBIDDEN', 403], '409': ['CONFLIT_VERSION', 409], '423': ['RESSOURCE_VERROUILLEE', 423] };

/** Handlers des 3 routes de la banque (lecture seule), branchés sur le service du contrat. Pannes : en-tête x-panne (403, 409, 423). */
export function creerHandlersBanque(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const service = creerServiceBanque();
  const panne = (request: Request) => {
    const p = PANNES[request.headers.get('x-panne') ?? ''];
    return p ? erreur(p[0], p[1]) : undefined;
  };
  return [
    http.get(base + '/banque/comptes', async ({ request }) => {
      await attendre();
      return panne(request) ?? HttpResponse.json(service.comptes());
    }),
    http.get(base + '/banque/lignes', async ({ request }) => {
      await attendre();
      const refus = panne(request);
      if (refus) return refus;
      const q = new URL(request.url).searchParams;
      const noms = ['etat', 'compte', 'du', 'au', 'limite', 'decalage'];
      if (noms.some((n) => q.getAll(n).length > 1)) return erreur('BAD_REQUEST', 400);
      const query = QueryLignes.safeParse(Object.fromEntries(noms.flatMap((n) => (q.has(n) ? [[n, q.get(n)]] : []))));
      if (!query.success) return erreur('BAD_REQUEST', 400);
      const page = service.lignes(query.data);
      return page ? HttpResponse.json(page) : erreur('COMPTE_INCONNU', 404, true);
    }),
    http.get(base + '/banque/comptes/:compte/couverture', async ({ request, params }) => {
      await attendre();
      const refus = panne(request);
      if (refus) return refus;
      const ex = new URL(request.url).searchParams.getAll('exercice_id');
      const compte = decodeURIComponent(String(params['compte']));
      if (ex.length > 1 || ex[0] === '' || compte === '') return erreur('BAD_REQUEST', 400);
      const c = service.couverture(compte);
      return c ? HttpResponse.json(c) : erreur('COMPTE_INCONNU', 404, true);
    }),
    ...(['trous', 'demandes', 'doublons'] as const).map((nom) =>
      http.get(base + '/banque/' + nom, async ({ request }) => {
        await attendre();
        const refus = panne(request);
        if (refus) return refus;
        const etats = new URL(request.url).searchParams.getAll('etat');
        const schema = { trous: EtatTrou, demandes: EtatDemande, doublons: EtatDoublon }[nom];
        const etat = etats.length === 0 ? { success: true as const, data: undefined } : schema.safeParse(etats.length === 1 ? etats[0] : etats);
        return etat.success ? HttpResponse.json(service[nom](etat.data)) : erreur('BAD_REQUEST', 400);
      }),
    ),
    http.get(base + '/banque/lignes/:ligne/explication', async ({ request, params }) => {
      await attendre();
      const refus = panne(request);
      if (refus) return refus;
      const id = decodeURIComponent(String(params['ligne']));
      const e = id.trim() === '' ? undefined : service.explication(id);
      return e ? HttpResponse.json(e) : erreur('LIGNE_INCONNUE', 404, true);
    }),
  ];
}
