// Persistance de utilisation_parametre et de version_paquet contre une INTERFACE ; faux en mémoire tout ou rien, ajout seul.
import { valider, type EcritureValidee } from '../../../../packages/noyau/src/ecritures/etats.js';
import type { Ecriture } from '../../../../packages/noyau/src/ecritures/modele.js';
import { rejouer, type PaquetParametres, type RegleAuJour, type UtilisationParametre } from '../../../../packages/parametres/src/paquet.js';
import type { ParametreLegal } from '../../../../packages/parametres/src/au-jour.js';
import { verifierPaysSociete, verifierUtilisations } from '../../../../packages/parametres/src/pays.js';

export type EcritureStockee = Ecriture & { appliqueRegleLegale: boolean; versionPaquet: string | null };

export interface TransactionCompta {
  ecriture(id: string): Promise<EcritureStockee | null>;
  ecrireEcriture(e: EcritureStockee): Promise<void>;
  utilisations(ecritureId: string): Promise<readonly UtilisationParametre[]>;
  ajouterUtilisation(u: UtilisationParametre): Promise<void>;
}
/** Tout ou rien : si `travail` échoue, rien n'est écrit et l'erreur remonte telle quelle. */
export interface PortCompta {
  transaction<T>(travail: (tx: TransactionCompta) => Promise<T>): Promise<T>;
}

export class ErreurCompta extends Error {
  constructor(readonly code: 'version_paquet_absente' | 'utilisation_en_double' | 'ecriture_inconnue') {
    super(code);
    this.name = 'ErreurCompta';
  }
}

interface Etat { ecritures: EcritureStockee[]; utilisations: UtilisationParametre[] }
const copier = (e: Etat): Etat => structuredClone(e);

export function creerComptaMemoire(): { port: PortCompta; instantane(): Etat } {
  let valide: Etat = { ecritures: [], utilisations: [] };
  let file: Promise<unknown> = Promise.resolve();

  const ouvrir = (etat: Etat): TransactionCompta => ({
    ecriture: async (id) => structuredClone(etat.ecritures.find((e) => e.id === id) ?? null),
    ecrireEcriture: async (e) => {
      if (e.appliqueRegleLegale && (e.versionPaquet === null || e.versionPaquet === ''))
        throw new ErreurCompta('version_paquet_absente');
      const i = etat.ecritures.findIndex((x) => x.id === e.id);
      const c = structuredClone(e);
      if (i < 0) etat.ecritures.push(c);
      else etat.ecritures[i] = c;
    },
    utilisations: async (ecritureId) => structuredClone(etat.utilisations.filter((u) => u.ecritureId === ecritureId)),
    ajouterUtilisation: async (u) => {
      if (!etat.ecritures.some((e) => e.id === u.ecritureId)) throw new ErreurCompta('ecriture_inconnue');
      if (etat.utilisations.some((x) => x.ecritureId === u.ecritureId && x.parametreId === u.parametreId))
        throw new ErreurCompta('utilisation_en_double');
      etat.utilisations.push({ ...u });
    },
  });

  const port: PortCompta = {
    transaction<T>(travail: (tx: TransactionCompta) => Promise<T>): Promise<T> {
      const tour = file.then(async () => {
        const travailEnCours = copier(valide);
        const resultat = await travail(ouvrir(travailEnCours));
        valide = travailEnCours;
        return resultat;
      });
      file = tour.catch(() => undefined);
      return tour;
    },
  };
  return { port, instantane: () => copier(valide) };
}

export interface DemandeEnregistrement {
  ecriture: Ecriture; regles: readonly RegleAuJour[]; paquet: PaquetParametres; paysSociete: string; dateReference: string;
}

/** Pays de la société d'abord (refus = aucune transaction), puis l'écriture et une ligne par paramètre distinct, en une transaction. */
export async function enregistrerEcriture(
  port: PortCompta,
  d: DemandeEnregistrement,
): Promise<{ ok: true } | { ok: false; code: 'pays_hors_union' | 'version_incoherente' }> {
  const pays = verifierPaysSociete(d.paysSociete, d.paquet, d.dateReference);
  if (!pays.ok) return { ok: false, code: pays.code };
  if (d.regles.some((r) => r.versionPaquet !== d.paquet.version)) return { ok: false, code: 'version_incoherente' };
  const parametres = [...new Set(d.regles.map((r) => r.parametreId))];
  await port.transaction(async (tx) => {
    const avecRegle = parametres.length > 0;
    await tx.ecrireEcriture({ ...d.ecriture, appliqueRegleLegale: avecRegle, versionPaquet: avecRegle ? d.paquet.version : null });
    for (const parametreId of parametres)
      await tx.ajouterUtilisation({ ecritureId: d.ecriture.id, parametreId, versionPaquet: d.paquet.version, dateReference: d.dateReference });
  });
  return { ok: true };
}

export interface DonneesValidation { numero: string; validePar: string; valideLe: string }
export type ResultatValidation =
  | { ok: true; ecriture: EcritureValidee }
  | { ok: false; code: 'ecriture_inconnue' | 'version_paquet_absente' | 'utilisation_parametre_absente' };

/** Refus = rien d'écrit : `verifierUtilisations` puis `valider` dans une même transaction. */
export function validerEcriture(port: PortCompta, ecritureId: string, v: DonneesValidation): Promise<ResultatValidation> {
  return port.transaction<ResultatValidation>(async (tx) => {
    const stockee = await tx.ecriture(ecritureId);
    if (stockee === null) return { ok: false, code: 'ecriture_inconnue' };
    const controle = verifierUtilisations(stockee, await tx.utilisations(ecritureId));
    if (!controle.ok) return controle;
    const validee = valider(stockee, v.numero, v.validePar, v.valideLe);
    await tx.ecrireEcriture({ ...stockee, ...validee });
    return { ok: true, ecriture: validee };
  });
}

/** Lignes de paramètre relues dans la version ENREGISTRÉE de chaque utilisation. */
export function rejouerEcriture(port: PortCompta, ecritureId: string, paquets: readonly PaquetParametres[]): Promise<ParametreLegal[]> {
  return port.transaction(async (tx) => (await tx.utilisations(ecritureId)).map((u) => rejouer(u, paquets)));
}
