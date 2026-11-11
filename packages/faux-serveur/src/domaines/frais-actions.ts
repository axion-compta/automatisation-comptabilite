import { http, HttpResponse, type HttpHandler } from 'msw';
import { configEssai } from '../../../../apps/serveur/src/domaines/frais-validation.js';
import { genererFrais } from '../../../donnees-fictives/src/frais.js';
import { CompletementFrais, NouveauFrais } from '../../../contrat/src/domaines/frais-actions.js';
import { creerServiceFraisActions, ErreurActions } from '../../../contrat/src/domaines/frais-actions-service.js';
import { CorpsRemboursement, CorpsValidation } from '../../../contrat/src/domaines/frais-validation.js';
import { creerServiceFraisValidation, ErreurValidation } from '../../../contrat/src/domaines/frais-validation-service.js';
import { CleIdempotence } from '../../../contrat/src/schemas.js';
import type { ContexteFaux } from '../registres/types.js';

const STATUTS: Record<string, number> = { PERSONNE_DIFFERENTE: 403, FRAIS_INCONNU: 404, VERSION_PERIMEE: 412, ENTREE_INVALIDE: 400 };
const VERSION = /^[1-9]\d{0,8}$/;
const PERSONNE = /^.{1,50}$/;

/** Cinq routes d'écriture des frais : mêmes services que le vrai serveur, état en mémoire propre à chaque instance. */
export function handlersFraisActions(ctx: ContexteFaux): HttpHandler[] {
  const jeu = genererFrais();
  const actions = creerServiceFraisActions({ jeu });
  const validation = creerServiceFraisValidation(jeu, configEssai());
  const mauvaise = () => ctx.erreur('BAD_REQUEST', 400);
  /** Exécute le service ; une erreur du contrat devient la réponse du vrai serveur (409 par défaut). */
  const dire = (calcul: () => unknown, statut = 200) => {
    try {
      return HttpResponse.json({ body: calcul() }, { status: statut });
    } catch (e) {
      if (e instanceof ErreurValidation) return ctx.erreur(e.code, STATUTS[e.code] ?? 409, e.totalCentimes === undefined ? undefined : { totalCentimes: e.totalCentimes });
      if (e instanceof ErreurActions) return ctx.erreur(e.code, STATUTS[e.code] ?? 409);
      throw e;
    }
  };
  const lire = async (request: Request, avecPersonne: boolean) => {
    await ctx.attendre();
    const cle = CleIdempotence.safeParse(request.headers.get('idempotency-key'));
    const personne = request.headers.get('x-personne') ?? '';
    const corps: unknown = await request.json().catch(() => undefined);
    return cle.success && (!avecPersonne || PERSONNE.test(personne)) ? { cle: cle.data, personne, corps } : undefined;
  };
  return [
    http.post(ctx.base + '/frais/valider', async ({ request }) => {
      const e = await lire(request, true);
      const c = CorpsValidation.safeParse(e?.corps);
      return e && c.success ? dire(() => validation.valider(c.data, e.personne, e.cle)) : mauvaise();
    }),
    http.post(ctx.base + '/frais/:id/proposer', async ({ request, params }) => {
      const e = await lire(request, false);
      return e ? dire(() => validation.proposer(String(params['id']), e.cle)) : mauvaise();
    }),
    http.post(ctx.base + '/remboursements', async ({ request }) => {
      const e = await lire(request, false);
      const c = CorpsRemboursement.safeParse(e?.corps);
      return e && c.success ? dire(() => validation.preparer(c.data, e.cle), 201) : mauvaise();
    }),
    http.post(ctx.base + '/frais', async ({ request }) => {
      const e = await lire(request, true);
      const c = NouveauFrais.safeParse(e?.corps);
      return e && c.success ? dire(() => actions.creer(c.data, e.personne, e.cle), 201) : mauvaise();
    }),
    http.patch(ctx.base + '/frais/:id', async ({ request, params }) => {
      const e = await lire(request, true);
      const version = request.headers.get('if-match') ?? '';
      const c = CompletementFrais.safeParse(e?.corps);
      return e && c.success && VERSION.test(version) ? dire(() => actions.completer(String(params['id']), c.data, Number(version), e.personne, e.cle)) : mauvaise();
    }),
  ];
}
