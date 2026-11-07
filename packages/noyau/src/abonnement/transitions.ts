// Réception de l'état voulu : rejeu des versions et journal des transitions. Fonction pure.
import { etatDuModule, verifierEtatVoulu } from './etats.js';
import {
  ErreurAbonnement, verifierDate, verifierHorodatage,
  type EtatAcces, type EtatVoulu, type EvenementJournal,
} from './types.js';

export type SourceEtat = 'console' | 'reglage_local';
export type EtatAccesCourant = { etat: EtatAcces; version: number; recuLe: string; source: SourceEtat };
export type ContexteReception = { horodatage: string; aujourdhui: string; source: SourceEtat; auteur: string; branche: boolean };
export type ResultatReception = { courant: EtatAccesCourant | null; evenements: EvenementJournal[]; reprise: boolean };

const DEPUIS_PAUSE: readonly EtatAcces[] = ['LECTURE_SEULE', 'SUSPENDU'];
const VERS_SERVICE: readonly EtatAcces[] = ['ESSAI', 'ACTIF', 'DELAI_DE_GRACE'];

export function recevoirEtatVoulu(courant: EtatAccesCourant | null, voulu: EtatVoulu, ctx: ContexteReception): ResultatReception {
  verifierEtatVoulu(voulu);
  verifierHorodatage(ctx.horodatage);
  verifierDate(ctx.aujourdhui);
  if (typeof ctx.auteur !== 'string' || ctx.auteur.trim() === '') throw new ErreurAbonnement('auteur_manquant');
  const evt = (type: EvenementJournal['type'], donnees: EvenementJournal['donnees']): ResultatReception => ({
    courant, reprise: false, evenements: [{ type, horodatage: ctx.horodatage, donnees }],
  });
  if (ctx.source === 'reglage_local' && ctx.branche) {
    return evt('acces.reglage_local_ignore', { version: voulu.version, auteur: ctx.auteur });
  }
  if (courant !== null && voulu.version <= courant.version) {
    return evt('acces.version_ignoree', { recue: voulu.version, connue: courant.version });
  }
  const nouveau = etatDuModule(voulu, ctx.aujourdhui);
  const suivant: EtatAccesCourant = { etat: nouveau, version: voulu.version, recuLe: ctx.horodatage, source: ctx.source };
  const ancien = courant === null ? null : courant.etat;
  if (ancien === nouveau) return { courant: suivant, evenements: [], reprise: false };
  return {
    courant: suivant,
    reprise: ancien !== null && DEPUIS_PAUSE.includes(ancien) && VERS_SERVICE.includes(nouveau),
    evenements: [{
      type: 'acces.etat_change', horodatage: ctx.horodatage,
      donnees: { ancien, nouveau, source: ctx.source, auteur: ctx.auteur, version: voulu.version },
    }],
  };
}
