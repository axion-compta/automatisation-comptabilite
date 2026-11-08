import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import type { ReponseReverification, TraceEcartee } from '../../../../packages/contrat/src/domaines/controles-actions.js';
import { ecarter } from '../../../../packages/noyau/src/controles/garde-fou.js';
import type { Resultat, TraceControle } from '../../../../packages/noyau/src/controles/moteur.js';

/** Personne connectée, fournie par l'interface de session (faux fournisseur en essai ; jamais lue dans l'entrée). */
export interface Session { sorte: 'personne' | 'agent'; par: string; permissions: readonly string[]; reauthentifie: boolean }
export type FournisseurSession = (entetes: Record<string, string | string[] | undefined>) => Session | undefined;
export interface ContexteSession { session?: Session | undefined }

export const SEPARATEUR = '~';
export interface OptionsActions { traces?: TraceControle[]; horloge?: () => string }
type Refus = 'inconnue' | 'non_ecartable' | 'permission_manquante' | 'reauthentification_requise' | 'motif_obligatoire' | 'auteur_obligatoire' | 'horodatage_anterieur';
export type ResultatActions<T> = { ok: true; valeur: T } | { ok: false; refus: Refus };

const OUVERT: readonly Resultat[] = ['ALERTE', 'IMPOSSIBLE'];
const essai = (regleId: string, resultat: Resultat): TraceControle => ({ horodatage: '2026-04-01T08:00:00Z', declencheur: 'nocturne', regleId, versionRegle: 1, objetType: 'piece', objetId: 'p1', resultat });
const exerciceDe = (t: TraceControle): string => `EX${t.horodatage.slice(0, 4)}`;

/** Service en mémoire, sans base : traces fictives, horloge injectée, rejeu par clé d'idempotence. */
export function creerServiceControlesActions(options: OptionsActions = {}) {
  const horloge = options.horloge ?? (() => new Date().toISOString());
  const traces = new Map<string, TraceControle>();
  for (const t of options.traces ?? [essai('CC-T01', 'ALERTE'), essai('TVA-C01', 'ALERTE')]) traces.set(t.regleId + SEPARATEUR + t.objetId, t);
  const rejeux = new Map<string, unknown>();
  const unefois = <T>(cle: string, produire: () => ResultatActions<T>): ResultatActions<T> => {
    const vu = rejeux.get(cle);
    if (vu !== undefined) return vu as ResultatActions<T>;
    const r = produire();
    if (r.ok) rejeux.set(cle, r);
    return r;
  };
  return {
    ecarter(s: Session, id: string, motif: string, cle: string): ResultatActions<TraceEcartee> {
      return unefois(`${s.par}|ecarter|${id}|${cle}`, () => {
        const trace = traces.get(id);
        if (!trace) return { ok: false, refus: 'inconnue' };
        const r = ecarter(trace, { motif, permissions: s.permissions, reauthentifie: s.reauthentifie, par: s.par, horodatage: horloge() });
        if (!r.ok) return { ok: false, refus: r.code };
        traces.set(id, r.trace);
        return { ok: true, valeur: { regleId: r.trace.regleId, objetId: r.trace.objetId, resultat: 'ECARTE', motif: r.trace.motif, par: r.trace.par, horodatage: r.trace.horodatage } };
      });
    },
    reverifier(s: Session, exercice: string, cle: string): ResultatActions<ReponseReverification> {
      return unefois(`${s.par}|reverifier|${exercice}|${cle}`, () => {
        const choisies = [...traces.values()].filter((t) => exerciceDe(t) === exercice);
        if (choisies.length === 0) return { ok: false, refus: 'inconnue' };
        return { ok: true, valeur: { exercice, verifiees: choisies.length, ouvertes: choisies.filter((t) => OUVERT.includes(t.resultat)).length } };
      });
    },
  };
}
export type ServiceControlesActions = ReturnType<typeof creerServiceControlesActions>;

export function routesControlesActions(service: ServiceControlesActions = creerServiceControlesActions()) {
  const os = implement(contrat.controlesActions).$context<ContexteSession>();
  const sessionHumaine = (contexte: ContexteSession, errors: { NON_AUTHENTIFIE: () => Error; ACTEUR_NON_HUMAIN: () => Error }): Session => {
    if (!contexte.session) throw errors.NON_AUTHENTIFIE();
    if (contexte.session.sorte !== 'personne') throw errors.ACTEUR_NON_HUMAIN();
    return contexte.session;
  };
  return {
    ecarterControle: os.ecarterControle.handler(({ input, context, errors }) => {
      const s = sessionHumaine(context, errors);
      const r = service.ecarter(s, input.params.trace, input.body.motif, input.headers['idempotency-key']);
      if (r.ok) return { body: r.valeur };
      if (r.refus === 'inconnue') throw errors.TRACE_INCONNUE();
      if (r.refus === 'permission_manquante') throw errors.PERMISSION_MANQUANTE();
      if (r.refus === 'reauthentification_requise') throw errors.REAUTHENTIFICATION_REQUISE();
      const code = r.refus === 'non_ecartable' ? 'controle_non_ecartable' : r.refus;
      throw errors.REFUS({ data: { code } });
    }),
    reverifierControles: os.reverifierControles.handler(({ input, context, errors }) => {
      const r = service.reverifier(sessionHumaine(context, errors), input.body.exercice, input.headers['idempotency-key']);
      if (!r.ok) throw errors.EXERCICE_INCONNU();
      return { body: r.valeur };
    }),
  };
}
