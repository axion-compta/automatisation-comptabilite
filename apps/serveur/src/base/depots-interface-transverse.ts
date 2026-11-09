// Dépôts du lot 15 : interfaces et adaptateur en mémoire (aucune base réelle ; l'adaptateur PostgreSQL attend la console).
export type CodeErreurDepot = 'doublon' | 'inconnue' | 'ajout_seul' | 'montant_invalide';
export class ErreurDepot extends Error {
  override name = 'ErreurDepot';
  constructor(readonly code: CodeErreurDepot) { super(code); }
}
// Tables « par personne » : exceptions au test d'isolation par société.
export const TABLES_PAR_PERSONNE = ['preference_personne', 'resume_email_envoi'] as const;

export type EtatAlerte = 'ouverte' | 'reportee' | 'fermee';
export type Alerte = { id: string; regleId: string; cleDedoublonnage: string; etat: EtatAlerte; ouverteLe: string; reporteeJusquau: string | null };
export type EvenementJournal = { id: string; alerteId: string; le: string; evenement: 'ouverte' | 'reportee' | 'fermee' | 'rouverte'; par: string };
export type Instantane = { id: string; le: string; indicateur: string; montantCentimes: number };
export type Echeance = { id: string; libelle: string; le: string; montantCentimes: number | null };
export type Notification = { id: string; destinataireId: string; texte: string; le: string; lue: boolean };
export type EvenementUsage = { id: string; evenement: string; le: string };
export type ExportFichier = { id: string; nom: string; empreinte: string; le: string };
export type Ecriture = { id: string; montantCentimes: number };

export interface Lignes<T> { ajouter(societeId: string, l: T): void; lister(societeId: string): readonly T[] }
export interface DepotAlertes extends Lignes<Alerte> {
  lire(societeId: string, id: string): Alerte | undefined;
  changerEtat(societeId: string, id: string, etat: EtatAlerte): void;
}
export interface DepotJournal extends Lignes<EvenementJournal> {
  modifier(societeId: string, id: string, l: Partial<EvenementJournal>): never;
  supprimer(societeId: string, id: string): never;
}
export interface DepotNotifications extends Lignes<Notification> { marquerLue(societeId: string, id: string): void }
export interface DepotCompteurs {
  validerEcriture(societeId: string, e: Ecriture): void;
  nombreEcritures(societeId: string): number;
  incrementerMenu(societeId: string, entree: string): void;
  nombreMenu(societeId: string, entree: string): number;
}
export interface DepotPersonnes {
  definirPreference(personneId: string, cle: string, valeur: string): void;
  preferences(personneId: string): Readonly<Record<string, string>>;
  noterResume(personneId: string, jour: string): void;
  resumes(personneId: string): readonly string[];
}
export interface DepotsInterfaceTransverse {
  alertes: DepotAlertes; journal: DepotJournal; instantanes: Lignes<Instantane>; compteurs: DepotCompteurs;
  echeances: Lignes<Echeance>; personnes: DepotPersonnes; notifications: DepotNotifications;
  usage: Lignes<EvenementUsage>; exports: Lignes<ExportFichier>;
  termes: { definir(code: string, libelle: string): void; lire(code: string): string | undefined };
}

const copie = <T>(v: T): Readonly<T> => Object.freeze(structuredClone(v));
const centimes = (n: number | null): void => {
  if (n !== null && !Number.isSafeInteger(n)) throw new ErreurDepot('montant_invalide');
};
const actif = (e: EtatAlerte): boolean => e !== 'fermee';

function lignes<T extends { id: string }>(verifier: (l: T) => void = () => undefined): Lignes<T> & { lire(s: string, id: string): T | undefined; remplacer(s: string, l: T): void } {
  const m = new Map<string, Map<string, T>>();
  const de = (s: string): Map<string, T> => m.get(s) ?? m.set(s, new Map()).get(s)!;
  return {
    ajouter(s, l) {
      verifier(l);
      if (de(s).has(l.id)) throw new ErreurDepot('doublon');
      de(s).set(l.id, structuredClone(l));
    },
    remplacer(s, l) {
      if (!de(s).has(l.id)) throw new ErreurDepot('inconnue');
      de(s).set(l.id, structuredClone(l));
    },
    lire: (s, id) => { const l = de(s).get(id); return l === undefined ? undefined : copie(l); },
    lister: (s) => Object.freeze([...de(s).values()].map(copie)),
  };
}

const simple = <T extends { id: string }>(v?: (l: T) => void): Lignes<T> => { const t = lignes<T>(v); return { ajouter: t.ajouter, lister: t.lister }; };

export function creerDepotsInterfaceMemoire(options: { nouvelId: () => string }): DepotsInterfaceTransverse {
  const a = lignes<Alerte>();
  const doublonActif = (s: string, l: Alerte): boolean =>
    actif(l.etat) && a.lister(s).some((x) => x.id !== l.id && actif(x.etat) && x.cleDedoublonnage === l.cleDedoublonnage);
  const ecritures = lignes<Ecriture>((e) => centimes(e.montantCentimes));
  const nbEcritures = new Map<string, number>();
  const menu = new Map<string, number>();
  const prefs = new Map<string, Record<string, string>>();
  const resumes = new Map<string, string[]>();
  const termes = new Map<string, string>();
  const notifs = lignes<Notification>();
  const journal = lignes<EvenementJournal>();
  const refus = (): never => { throw new ErreurDepot('ajout_seul'); };

  return {
    alertes: {
      ajouter(s, l) {
        if (doublonActif(s, l)) throw new ErreurDepot('doublon');
        a.ajouter(s, l.id === '' ? { ...l, id: options.nouvelId() } : l);
      },
      lire: a.lire,
      lister: a.lister,
      changerEtat(s, id, etat) {
        const l = a.lire(s, id);
        if (l === undefined) throw new ErreurDepot('inconnue');
        const suivant = { ...l, etat };
        if (doublonActif(s, suivant)) throw new ErreurDepot('doublon');
        a.remplacer(s, suivant);
      },
    },
    journal: { ajouter: journal.ajouter, lister: journal.lister, modifier: refus, supprimer: refus },
    instantanes: simple<Instantane>((l) => centimes(l.montantCentimes)),
    compteurs: {
      validerEcriture(s, e) {
        ecritures.ajouter(s, e);
        nbEcritures.set(s, (nbEcritures.get(s) ?? 0) + 1);
      },
      nombreEcritures: (s) => nbEcritures.get(s) ?? 0,
      incrementerMenu(s, entree) { const k = JSON.stringify([s, entree]); menu.set(k, (menu.get(k) ?? 0) + 1); },
      nombreMenu: (s, entree) => menu.get(JSON.stringify([s, entree])) ?? 0,
    },
    echeances: simple<Echeance>((l) => centimes(l.montantCentimes)),
    personnes: {
      definirPreference(p, cle, valeur) { prefs.set(p, { ...(prefs.get(p) ?? {}), [cle]: valeur }); },
      preferences: (p) => copie(prefs.get(p) ?? {}),
      noterResume(p, jour) { const l = resumes.get(p) ?? []; if (!l.includes(jour)) resumes.set(p, [...l, jour]); },
      resumes: (p) => Object.freeze([...(resumes.get(p) ?? [])]),
    },
    notifications: {
      ajouter: notifs.ajouter,
      lister: notifs.lister,
      marquerLue(s, id) {
        const n = notifs.lire(s, id);
        if (n === undefined) throw new ErreurDepot('inconnue');
        notifs.remplacer(s, { ...n, lue: true });
      },
    },
    usage: simple<EvenementUsage>(),
    exports: simple<ExportFichier>(),
    termes: { definir: (c, l) => { termes.set(c, l); }, lire: (c) => termes.get(c) },
  };
}
