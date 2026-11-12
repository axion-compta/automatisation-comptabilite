import { http, HttpResponse, type HttpHandler } from 'msw';
import { PREFIXE_ROUTES_SOCIETE } from '../../../contrat/src/prefixe-routes.js';
import { CorpsConfirmation, CorpsValeurChamp } from '../../../contrat/src/domaines/profil-champs.js';
import { ErreurChamp, type ServiceProfilChamps } from '../../../contrat/src/domaines/profil-champs-service.js';
import { Apercu, ChangementConfirme, CorpsConfirmationChangement, DemandeChangement } from '../../../contrat/src/domaines/profil-changements.js';
import { ErreurChangement, creerServiceProfilChangements } from '../../../contrat/src/domaines/profil-changements-service.js';
import { ChampProfilV1 } from '../../../contrat/src/domaines/profil.js';
import { EnTeteEcriture } from '../../../contrat/src/schemas.js';

const PREFIXE = PREFIXE_ROUTES_SOCIETE.replace('{s}', ':s');
const STATUTS: Record<string, number> = {
  CLE_INCONNUE: 404, CLE_REUTILISEE: 409, RIEN_A_CONFIRMER: 409, PERIODE_DEPOSEE: 409, APERCU_INCONNU: 404, APERCU_PERIME: 409,
};
const erreur = (code: string, status: number) => HttpResponse.json({ defined: status !== 400, code, status, message: code }, { status });

/**
 * Écritures du profil sur le service `champs` reçu : c'est le même objet que celui des lectures,
 * une écriture se voit donc à la lecture suivante. L'état vit avec le service (un par appel de `creerHandlers`).
 */
export function creerHandlersProfilEcriture(base: string, attendre: () => Promise<void>, champs: ServiceProfilChamps): HttpHandler[] {
  const changements = creerServiceProfilChangements(champs);
  const aujourdhui = () => new Date().toISOString().slice(0, 10);
  /** Chaque route est servie sans préfixe (écrans E45 et E39) et sous le préfixe de la société. */
  const ecriture = (chemin: string, f: (corps: unknown, cle: string, params: Record<string, string>) => unknown) =>
    [chemin, PREFIXE + chemin].map((c) => http.post(base + c, async ({ request, params }) => {
      await attendre();
      const entete = EnTeteEcriture.safeParse({ 'idempotency-key': request.headers.get('idempotency-key') ?? undefined });
      if (!entete.success) return erreur('BAD_REQUEST', 400);
      const corps: unknown = await request.json().catch(() => undefined);
      try {
        const sortie = f(corps, entete.data['idempotency-key'], params as Record<string, string>);
        return sortie === undefined ? erreur('BAD_REQUEST', 400) : HttpResponse.json({ body: sortie });
      } catch (e) {
        if (e instanceof ErreurChamp || e instanceof ErreurChangement) return erreur(e.code, STATUTS[e.code] ?? 400);
        throw e;
      }
    }));

  return [
    ...ecriture('/profil/champs/:cle', (corps, cle, { cle: k }) => {
      const c = CorpsValeurChamp.safeParse(corps);
      return c.success ? ChampProfilV1.parse(champs.ajouter(k!, cle, c.data, aujourdhui())) : undefined;
    }),
    ...ecriture('/profil/champs/:cle/confirmer', (corps, cle, { cle: k }) => {
      const c = CorpsConfirmation.safeParse(corps);
      return c.success ? ChampProfilV1.parse(champs.confirmer(k!, cle, c.data, aujourdhui())) : undefined;
    }),
    ...ecriture('/profil/changements/apercu', (corps) => {
      const c = DemandeChangement.safeParse(corps);
      return c.success ? Apercu.parse(changements.apercu(c.data, aujourdhui())) : undefined;
    }),
    ...ecriture('/profil/changements', (corps, cle) => {
      const c = CorpsConfirmationChangement.safeParse(corps);
      return c.success ? ChangementConfirme.parse(changements.confirmer(c.data.apercuId, cle, aujourdhui())) : undefined;
    }),
  ];
}
