import { http, HttpResponse, type HttpHandler } from 'msw';
import { contrat } from '../../../contrat/src/routes.js';
import { DemandeExport } from '../../../contrat/src/domaines/exports.js';
import { creerServiceExports, ErreurExport, type CodeErreurExport } from '../../../contrat/src/domaines/exports-service.js';

const erreur = (code: string, status: number, defined = true) => HttpResponse.json({ defined, code, status, message: code }, { status });
/** Codes et statuts : ceux déclarés au contrat (`exporter`). */
const ERREURS: Record<CodeErreurExport, [string, number]> = {
  liste_non_exportable: ['LISTE_NON_EXPORTABLE', 404],
  filtre_invalide: ['FILTRE_INVALIDE', 400],
  export_trop_gros: ['EXPORT_TROP_GROS', 413],
  export_en_tache_a_venir: ['EXPORT_EN_TACHE_A_VENIR', 501],
};
type Schema = { safeParse: (v: unknown) => { success: boolean } };

/** Handler de `POST /exports`, branché sur le MÊME service que le vrai serveur ; l'empreinte (Web Crypto) marche en Node et dans le navigateur. */
export function creerHandlersExports(base: string, attendre: () => Promise<void>, ...reste: unknown[]): HttpHandler[] {
  void reste;
  const service = creerServiceExports();
  const entree = contrat.exports.exporter['~orpc'].inputSchema as Schema;
  return [
    http.post(base + '/exports', async ({ request }) => {
      await attendre();
      const corps: unknown = await request.json().catch(() => undefined);
      const cle = request.headers.get('idempotency-key') ?? undefined;
      if (!entree.safeParse({ headers: { 'idempotency-key': cle }, body: corps }).success) return erreur('BAD_REQUEST', 400, false);
      const demande = DemandeExport.safeParse(corps);
      if (!demande.success) return erreur('CHAMP_INCONNU', 400);
      try {
        return HttpResponse.json(await service.exporter(cle as string, demande.data));
      } catch (e) {
        if (!(e instanceof ErreurExport)) throw e;
        return erreur(...ERREURS[e.code]);
      }
    }),
  ];
}
