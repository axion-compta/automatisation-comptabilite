// Moteur d'évaluation des alertes (AL-R1) : idempotent, sans horloge ni identifiant internes.
// Codes seulement, aucun texte affiché. Les entrées ne sont jamais modifiées.
import { ETATS_ALERTE_ACTIFS, rangGravite, type CauseJournal, type EtatAlerte, type GraviteAlerte } from '../interface/types.js';

export interface Alerte {
  id: string;
  regle: string;
  objetType: string;
  objetId: string;
  periode?: string;
  cle: string;
  gravite: GraviteAlerte;
  etat: EtatAlerte;
  echeanceLe?: string;
  version: number;
}

export interface LigneJournal {
  alerteId: string;
  deEtat?: EtatAlerte;
  aEtat: EtatAlerte;
  deGravite?: GraviteAlerte;
  aGravite: GraviteAlerte;
  cause: CauseJournal;
  acteurType: 'humain' | 'systeme';
  le: string;
}

export interface Constat {
  regle: string;
  objetType: string;
  objetId: string;
  periode?: string;
  gravite: GraviteAlerte;
  echeanceLe?: string;
}

export class ErreurAlerte extends Error {
  override name = 'ErreurAlerte';
  readonly code = 'cle_invalide';
  constructor() {
    super('cle_invalide');
  }
}

const SEPARATEUR = '|';

export function cleDedoublonnage(regle: string, objetType: string, objetId: string, periode?: string): string {
  const parties = periode === undefined ? [regle, objetType, objetId] : [regle, objetType, objetId, periode];
  for (const p of parties) {
    if (typeof p !== 'string' || p === '' || p.includes(SEPARATEUR)) throw new ErreurAlerte();
  }
  return parties.join(SEPARATEUR);
}

const estActive = (a: Alerte): boolean => ETATS_ALERTE_ACTIFS.includes(a.etat);

/** Un constat par clé : le plus grave l'emporte, le premier en cas d'égalité. */
function dedoublonner(constats: readonly Constat[]): Map<string, Constat> {
  const parCle = new Map<string, Constat>();
  for (const c of constats) {
    const cle = cleDedoublonnage(c.regle, c.objetType, c.objetId, c.periode);
    const deja = parCle.get(cle);
    if (deja === undefined || rangGravite(c.gravite) > rangGravite(deja.gravite)) parCle.set(cle, c);
  }
  return parCle;
}

export function evaluer(
  existantes: readonly Alerte[],
  constats: readonly Constat[],
  regles: readonly string[],
  horodatage: string,
  nouvelId: () => string,
): { alertes: Alerte[]; journal: LigneJournal[] } {
  const parCle = dedoublonner(constats);
  const alertes = existantes.map((a) => ({ ...a }));
  const journal: LigneJournal[] = [];
  const noter = (a: Alerte, aEtat: EtatAlerte, aGravite: GraviteAlerte, cause: CauseJournal, ancienne?: Alerte): void => {
    const ligne: LigneJournal = { alerteId: a.id, aEtat, aGravite, cause, acteurType: 'systeme', le: horodatage };
    if (ancienne !== undefined) {
      ligne.deEtat = ancienne.etat;
      ligne.deGravite = ancienne.gravite;
    }
    journal.push(ligne);
  };

  for (const a of alertes) {
    if (!estActive(a) || !regles.includes(a.regle) || parCle.has(a.cle)) continue;
    const avant = { ...a };
    a.etat = 'resolue_auto';
    a.version += 1;
    noter(a, a.etat, a.gravite, 'fermeture_auto', avant);
  }

  for (const [cle, c] of parCle) {
    const active = alertes.find((a) => a.cle === cle && estActive(a));
    const ignoree = alertes.find((a) => a.cle === cle && a.etat === 'ignoree');
    const cible = active ?? ignoree;
    if (cible !== undefined) {
      const monte = rangGravite(c.gravite) > rangGravite(cible.gravite);
      if (cible.gravite === c.gravite || (active === undefined && !monte)) continue;
      const avant = { ...cible };
      cible.gravite = c.gravite;
      if (active === undefined) cible.etat = 'ouverte';
      cible.version += 1;
      noter(cible, cible.etat, cible.gravite, 'evaluation', avant);
      continue;
    }
    const nouvelle: Alerte = {
      id: nouvelId(),
      regle: c.regle,
      objetType: c.objetType,
      objetId: c.objetId,
      cle,
      gravite: c.gravite,
      etat: 'ouverte',
      version: 1,
    };
    if (c.periode !== undefined) nouvelle.periode = c.periode;
    if (c.echeanceLe !== undefined) nouvelle.echeanceLe = c.echeanceLe;
    alertes.push(nouvelle);
    noter(nouvelle, 'ouverte', c.gravite, 'evaluation');
  }
  return { alertes, journal };
}
