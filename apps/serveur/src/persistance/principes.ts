// Ports de persistance des principes (gestes, refus, mémoire de correction, interrupteurs) et base en mémoire.
// Aucune migration SQL, aucun pilote de base : la migration réelle implémentera ces ports plus tard.
import { CATALOGUE_GESTES, type CodeGeste, type Geste, type TypeActeur } from '../../../../packages/noyau/src/principes/gestes.js';
import type { CorrectionClassement } from '../../../../packages/noyau/src/principes/memoire-correction.js';
import { creerInterrupteur, type EtatInterrupteur } from '../../../../packages/noyau/src/principes/interrupteurs.js';

export type CodeErreurPersistance = 'ajout_seul' | 'entree_invalide' | 'interrupteur_inconnu';

export class ErreurPersistance extends Error {
  override name = 'ErreurPersistance';
  readonly code: CodeErreurPersistance;
  constructor(code: CodeErreurPersistance, message: string = code) {
    super(message);
    this.code = code;
  }
}

export interface RefusGeste {
  id: string;
  societeId: string;
  geste: CodeGeste | null;
  operationId: string;
  acteurType: TypeActeur;
  code: string;
  canal: string;
  horodatage: number;
}

export interface DepotGestes { lister(): Promise<readonly Geste[]> }
export interface DepotRefus {
  ajouter(r: RefusGeste): Promise<void>;
  lister(societeId: string): Promise<readonly RefusGeste[]>;
}
export interface DepotCorrections {
  ajouter(c: CorrectionClassement): Promise<void>;
  lister(societeId: string): Promise<readonly CorrectionClassement[]>;
}
export interface DepotInterrupteurs {
  lire(societeId: string, code: string): Promise<EtatInterrupteur | null>;
  enregistrer(societeId: string, etat: EtatInterrupteur): Promise<void>;
  lister(societeId: string): Promise<readonly EtatInterrupteur[]>;
}
export interface BasePrincipes {
  gestes: DepotGestes;
  refus: DepotRefus;
  corrections: DepotCorrections;
  interrupteurs: DepotInterrupteurs;
  amorcer(o: { societeId: string; codesInterrupteurs: readonly string[]; maintenant: number }): Promise<void>;
}

const invalide = (m: string): ErreurPersistance => new ErreurPersistance('entree_invalide', m);
function texte(v: string, nom: string): void {
  if (typeof v !== 'string' || v.trim() === '') throw invalide(`${nom} ne peut pas être vide.`);
}
function instant(v: number, nom: string): void {
  if (!Number.isSafeInteger(v)) throw invalide(`${nom} doit être un entier sûr.`);
}
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function creerBaseMemoire(): BasePrincipes {
  let gestes: readonly Geste[] = [];
  const refus = new Map<string, RefusGeste>();
  const corrections = new Map<string, CorrectionClassement>();
  const interrupteurs = new Map<string, Map<string, EtatInterrupteur>>();
  const codesGestes = new Set<string>(CATALOGUE_GESTES.map((g) => g.code));
  const interrupteursDe = (societeId: string): Map<string, EtatInterrupteur> => interrupteurs.get(societeId) ?? new Map();

  return {
    gestes: { async lister() { return gestes.map((g) => ({ ...g })); } },
    refus: {
      async ajouter(r) {
        texte(r.societeId, 'societeId');
        texte(r.id, 'id');
        instant(r.horodatage, 'horodatage');
        if (r.geste !== null && !codesGestes.has(r.geste)) throw invalide('Geste hors catalogue.');
        if (refus.has(r.id)) throw new ErreurPersistance('ajout_seul', 'Refus déjà enregistré.');
        refus.set(r.id, { ...r });
      },
      async lister(societeId) {
        texte(societeId, 'societeId');
        return [...refus.values()].filter((r) => r.societeId === societeId)
          .sort((a, b) => a.horodatage - b.horodatage || cmp(a.id, b.id)).map((r) => ({ ...r }));
      },
    },
    corrections: {
      async ajouter(c) {
        texte(c.societeId, 'societeId');
        texte(c.ecritureId, 'ecritureId');
        const cle = JSON.stringify([c.societeId, c.ecritureId]);
        if (corrections.has(cle)) throw new ErreurPersistance('ajout_seul', 'Correction déjà enregistrée.');
        corrections.set(cle, { ...c });
      },
      async lister(societeId) {
        texte(societeId, 'societeId');
        return [...corrections.values()].filter((c) => c.societeId === societeId)
          .sort((a, b) => cmp(a.date, b.date) || cmp(a.ecritureId, b.ecritureId)).map((c) => ({ ...c }));
      },
    },
    interrupteurs: {
      async lire(societeId, code) {
        texte(societeId, 'societeId');
        const e = interrupteursDe(societeId).get(code);
        return e ? { ...e } : null;
      },
      async enregistrer(societeId, etat) {
        texte(societeId, 'societeId');
        instant(etat.depuis, 'depuis');
        const table = interrupteurs.get(societeId);
        if (!table?.has(etat.code)) throw new ErreurPersistance('interrupteur_inconnu', 'Interrupteur non amorcé.');
        table.set(etat.code, { ...etat });
      },
      async lister(societeId) {
        texte(societeId, 'societeId');
        return [...interrupteursDe(societeId).values()].sort((a, b) => cmp(a.code, b.code)).map((e) => ({ ...e }));
      },
    },
    async amorcer({ societeId, codesInterrupteurs, maintenant }) {
      texte(societeId, 'societeId');
      instant(maintenant, 'maintenant');
      codesInterrupteurs.forEach((c) => texte(c, 'code'));
      const neufs = codesInterrupteurs.map((code) => creerInterrupteur(code, maintenant));
      gestes = CATALOGUE_GESTES.map((g) => ({ ...g }));
      const table = interrupteurs.get(societeId) ?? new Map<string, EtatInterrupteur>();
      for (const e of neufs) if (!table.has(e.code)) table.set(e.code, e);
      interrupteurs.set(societeId, table);
    },
  };
}
