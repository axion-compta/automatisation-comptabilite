// Faux service en mémoire de la console et des bases clients (D29) : verrou par organisation,
// état en_creation puis pret, panne injectable entre la création de la base et les migrations.
import type { ParametresFinContrat } from '../abonnement/fin-contrat.js';
import type { Session } from '../session/port.js';
import {
  creerEspace, geler, inviter, supprimer, suspendre,
  type Contexte, type EtatMiseEnService, type Resultat, type Retour,
} from './operations.js';
import type { EnsembleMiseEnService, EtatBase, EtatEspace, PortBaseClient, PortConsole } from './port.js';

const MIGRATIONS_PREVUES = 3;
const SERVICE = {
  personneId: 'service-memoire', nature: 'service', organisationId: 'console', organisations: [], societeId: 'console',
  societes: [], roles: [], permissions: [], revendications: {},
} as unknown as Session;
const PARAMETRES_FIN: ParametresFinContrat = { joursAvantEffacement: 30, joursRappelAvantEffacement: 23, joursRelancesSansAccuse: [7, 14] };
const INSTANT = new Date(Date.UTC(2031, 4, 10, 8)).toISOString();
const CONTEXTE: Contexte = { horodatage: INSTANT, aujourdhui: INSTANT.slice(0, 10), longueurMaxMotif: 200, parametresFin: PARAMETRES_FIN };

export type ServiceMemoire = EnsembleMiseEnService & {
  /** La prochaine création échoue une fois, après la création de la base et avant les migrations. */
  injecterPanne(): void;
  nombreBases(): number;
};

export function creerServiceMemoire(contexte: Contexte = CONTEXTE): ServiceMemoire {
  let etat: EtatMiseEnService = { organisations: {}, cles: {} };
  const statuts = new Map<string, EtatEspace>();
  const bases = new Map<string, number>();
  const verrous = new Map<string, Promise<unknown>>();
  let panne = false;

  const base: PortBaseClient = {
    creerBase: (nom) => {
      const nouvelle = !bases.has(nom);
      if (nouvelle) bases.set(nom, 0);
      return Promise.resolve(nouvelle);
    },
    appliquerMigrations: (nom) => {
      const faites = bases.get(nom);
      if (faites === undefined) return Promise.reject(new Error('base_absente'));
      bases.set(nom, MIGRATIONS_PREVUES);
      return Promise.resolve(MIGRATIONS_PREVUES - faites);
    },
    verifierEtat: (nom): Promise<EtatBase> => Promise.resolve({ existe: bases.has(nom), migrationsAppliquees: bases.get(nom) ?? 0 }),
  };

  // File d'attente par organisation : un seul appel à la fois, les autres attendent leur tour.
  const verrouiller = <T>(id: string, travail: () => Promise<T>): Promise<T> => {
    const suite = (verrous.get(id) ?? Promise.resolve()).then(travail, travail);
    verrous.set(id, suite.catch(() => undefined));
    return suite;
  };
  const appliquer = (r: Resultat): Retour => { etat = r.etat; return r.retour; };
  const operation = <D extends { organisationId: string }>(f: (d: D, e: EtatMiseEnService, s: Session, c: Contexte) => Resultat) =>
    (d: D): Promise<Retour> => verrouiller(d.organisationId, () => Promise.resolve(appliquer(f(d, etat, SERVICE, contexte))));

  const portConsole: PortConsole = {
    creerEspace: (d) => verrouiller(d.identifiant, async () => {
      const r = creerEspace(d, etat, SERVICE, contexte);
      etat = r.etat;
      const retour = r.retour as { organisationId: string; base: string };
      if (!statuts.has(d.identifiant)) statuts.set(d.identifiant, 'en_creation');
      if (statuts.get(d.identifiant) === 'en_creation') {
        await base.creerBase(retour.base);
        if (panne) { panne = false; throw new Error('panne_simulee'); }
        await base.appliquerMigrations(retour.base);
        statuts.set(d.identifiant, 'pret');
      }
      return { ...retour, etat: 'pret' as const, rejoue: r.rejoue };
    }),
    inviter: operation(inviter),
    suspendre: operation(suspendre),
    geler: operation(geler),
    supprimer: operation(supprimer),
    etatEspace: (id) => Promise.resolve(statuts.get(id) ?? null),
  };

  return { console: portConsole, bases: base, injecterPanne: () => { panne = true; }, nombreBases: () => bases.size };
}
