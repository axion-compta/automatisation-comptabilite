import type { FastifyInstance } from 'fastify';
import { cheminSociete } from '../../../../../packages/contrat/src/prefixe-routes.js';
import type { RouteLue } from '../../../../../packages/contrat/src/verifier-securite.js';
import { ROLES, type Permission, type Role } from '../../../../../packages/noyau/src/securite/types.js';
import type { Session } from '../../../../../packages/noyau/src/session/port.js';
import type { FournisseurSession } from '../../domaines/controles-actions.js';
import { verifierRequeteSociete, type VerdictRequete } from '../../securite/societe.js';

export type Nature = 'autre-societe' | 'autre-client' | 'inexistant';
export type Cas = { cle: string; route: string; role: Role; nature: Nature; verdict: VerdictRequete<never> };

// Données fictives : deux sociétés d'un même client, une société d'un autre client.
export const SOC_MIENNE = 'soc-1';
export const SOC_SOEUR = 'soc-2';
export const SOC_AUTRE_CLIENT = 'soc-9';
export const SOC_INCONNUE = 'soc-zz';

const PERMISSIONS: Permission[] = ['compta-lire'];

export const sessionDuRole = (role: Role): Session => ({
  personneId: `pers-${role}`, nature: 'personne', organisationId: 'org-a', organisations: ['org-a'],
  societeId: SOC_MIENNE, societes: [SOC_MIENNE, SOC_SOEUR], roles: [role], permissions: PERMISSIONS,
  revendications: { acr: 'mfa', authTime: 1 },
});

export const cheminDe = (route: RouteLue, societe: string): string => cheminSociete(route.chemin).replace('{s}', societe);
export const cleDe = (r: RouteLue): string => `${r.methode} ${r.chemin} (${r.operationId})`;

const CIBLES: Record<Nature, string> = { 'autre-societe': SOC_SOEUR, 'autre-client': SOC_AUTRE_CLIENT, inexistant: SOC_INCONNUE };

/** Un appel par route, par rôle et par nature de cible : autre société, autre client, objet inexistant. */
export function genererCas(routes: readonly RouteLue[]): Cas[] {
  return routes.flatMap((route) =>
    ROLES.flatMap((role) =>
      (Object.keys(CIBLES) as Nature[]).map((nature) => ({
        cle: `${cleDe(route)} | ${role} | ${nature}`,
        route: cleDe(route),
        role,
        nature,
        verdict: verifierRequeteSociete({
          session: sessionDuRole(role),
          chemin: cheminDe(route, CIBLES[nature]),
          societesDuCorps: [],
        }),
      })),
    ),
  );
}

/** Routes du contrat sans aucun cas généré pour un des rôles : toute valeur ici met la CI au rouge. */
export function routesSansTest(routes: readonly RouteLue[], cas: readonly Cas[]): string[] {
  return routes
    .map(cleDe)
    .filter((cle) => ROLES.some((role) => !(['autre-societe', 'autre-client'] as Nature[]).every((n) => cas.some((c) => c.route === cle && c.role === role && c.nature === n))));
}

export type Appel = { route: string; role: Role; nature: Nature; url: string; statut: number; corps: string };
export const OBJETS: Record<Nature, string> = { 'autre-societe': 'obj-soc-2', 'autre-client': 'obj-cl-9', inexistant: 'obj-zz' };
export const ROLE_ENTETE = 'x-role-isolation';

/** Session du rôle demandé par l'en-tête ; `vus` garde chaque rôle lu, pour prouver que l'en-tête voyage. */
export const fournisseurDeRoles = (vus: Role[] = []): FournisseurSession => (entetes) => {
  const role = ROLES.find((r) => r === entetes[ROLE_ENTETE]) ?? 'lecture';
  vus.push(role);
  return { sorte: 'personne', par: `pers-${role}`, permissions: sessionDuRole(role).permissions, reauthentifie: true };
};

/** Seul le dernier identifiant change selon la nature ; les autres segments gardent une valeur fixe. */
export const urlReelle = (route: RouteLue, objet: string): string => {
  const params = route.chemin.replace('{s}', SOC_MIENNE).match(/\{[^}]+\}/g) ?? [];
  const dernier = params[params.length - 1];
  return route.chemin.replace('{s}', SOC_MIENNE).replace(/\{[^}]+\}/g, (m) => (m === dernier ? objet : SEGMENT_FIXE));
};
const SEGMENT_FIXE = 'seg-1';
export const aUnObjet = (route: RouteLue): boolean => /\{(?!s\})[^}]+\}/.test(route.chemin);

type Def = { type?: string; shape?: Record<string, Zod>; entries?: Record<string, unknown>; values?: unknown[]; options?: Zod[]; innerType?: Zod; element?: Zod };
type Zod = { _zod?: { def?: Def }; safeParse: (v: unknown) => { success: boolean } };

/** Valeur minimale lue dans le schéma zod : sert à ne pas s'arrêter à la validation. */
export function exemple(schema: Zod | undefined): unknown {
  const d = schema?._zod?.def;
  if (!d) return undefined;
  if (d.type === 'object') return Object.fromEntries(Object.entries(d.shape ?? {}).filter(([, v]) => !v.safeParse(undefined).success).map(([k, v]) => [k, exemple(v)]));
  if (d.type === 'enum') return Object.values(d.entries ?? {})[0];
  if (d.type === 'literal') return d.values?.[0];
  if (d.type === 'union') return exemple(d.options?.[0]);
  if (d.type === 'array') return [];
  if (d.type === 'number' || d.type === 'int') return 1;
  if (d.type === 'boolean') return true;
  if (d.innerType) return exemple(d.innerType);
  return 'cle-isolation-0001';
}

/** Routes dont le schéma d'entrée ne se remplit pas avec une valeur minimale (format précis) : liste figée. */
export const VALIDATION_NON_REMPLIE: readonly string[] = Object.freeze([
  'GET /exercices/{exercice}/calendrier (lireCalendrier)', 'GET /siren/{siren} (lireSiren)', 'GET /tva-intracom/{numero}/verification (verifierTva)',
  'PATCH /api/compta/v1/societes/{s}/frais/{id} (completerFrais)', 'POST /api/compta/v1/societes/{s}/profil/champs/{cle}/confirmer (confirmerChamp)',
  'POST /api/compta/v1/societes/{s}/ventes/{id}/corrections (corrigerVente)', 'POST /api/compta/v1/societes/{s}/ventes/{id}/valider (validerVente)',
  'POST /exercices/{exercice}/juridique/rapports/{rapport}/valider (validerRapport)', 'POST /exercices/{exercice}/tva/periodes/{periode}/payee (cocherTvaPayee)',
  'PUT /exercices/{exercice}/tva/pieces/{piece}/rattachement (modifierRattachement)', 'PUT /preferences/{cle} (ecrirePreference)',
]);

/** Corps et en-têtes valides pour une route, sauf l'identifiant qui change selon la nature. */
export function entreeValide(route: RouteLue): { headers: Record<string, string>; payload?: unknown } {
  const e = exemple(route.entree as Zod | undefined) as { headers?: Record<string, string>; body?: unknown } | undefined;
  return { headers: Object.fromEntries(Object.entries(e?.headers ?? {}).map(([k, v]) => [k, String(v)])), payload: e?.body };
}

/** Un appel HTTP réel (`inject`) par route à identifiant, par rôle et par nature d'objet. */
export async function appelerRoutes(app: FastifyInstance, routes: readonly RouteLue[]): Promise<Appel[]> {
  const appels: Appel[] = [];
  for (const route of routes.filter(aUnObjet)) {
    const { headers, payload } = entreeValide(route);
    for (const role of ROLES) {
      for (const nature of Object.keys(OBJETS) as Nature[]) {
        const url = urlReelle(route, OBJETS[nature]);
        const rep = await app.inject({ method: route.methode as 'GET', url, headers: { ...headers, [ROLE_ENTETE]: role }, ...(payload === undefined ? {} : { payload: payload as object }) });
        appels.push({ route: cleDe(route), role, nature, url, statut: rep.statusCode, corps: rep.body });
      }
    }
  }
  return appels;
}

/** Appels arrêtés par la validation d'entrée avant tout traitement : ils ne prouvent rien sur l'isolation. */
export const arretsDeValidation = (appels: readonly Appel[]): string[] => [...new Set(appels.filter((a) => a.statut === 400 && a.corps.includes('"BAD_REQUEST"')).map((a) => a.route))].sort();

export const estDeuxCents = (statut: number): boolean => statut >= 200 && statut < 300;
export const estErreurClient = (statut: number): boolean => statut >= 400 && statut < 500;

/** Réponses HTTP 2xx : une route qui livre un objet d'une autre société ou inexistant apparaît ici. */
export const reponsesDeuxCents = (appels: readonly Appel[]): string[] =>
  appels.filter((a) => estDeuxCents(a.statut)).map((a) => `${a.route} | ${a.role} | ${a.nature}`);

// Cas C01 à C25 : L06-T35 en rejoue une partie ; le reste est écrit ici ou renvoyé à sa fiche.
export const COUVERTURE: Readonly<Record<string, string>> = Object.freeze({
  C01: 'ici', C03: 'ici', C22: 'ici',
  C23: 'ici',
  C02: 'L06-T35', C04: 'L06-T35', C05: 'L06-T35', C06: 'L06-T35', C07: 'L06-T35', C09: 'L06-T35', C11: 'L06-T35',
  C12: 'L06-T35', C13: 'L06-T35', C14: 'L06-T35', C17: 'L06-T35', C19: 'L06-T35', C24: 'L06-T35', C25: 'L06-T35',
  C10: 'renvoi lot 05', C20: 'renvoi L06-T43',
  C08: 'enonce-absent', C15: 'enonce-absent', C16: 'enonce-absent', C18: 'enonce-absent', C21: 'enonce-absent',
});

/** Défaut de fiche : sans l'énoncé de 08-cas-de-test.md, ces cas n'ont ni test ni fiche cible. */
export const ENONCE_ABSENT = Object.entries(COUVERTURE).filter(([, v]) => v === 'enonce-absent').map(([k]) => k).sort();
