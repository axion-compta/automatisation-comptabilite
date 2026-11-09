// Adaptateur en mémoire du journal de vérification : mêmes règles que la table (ajout seul, tout ou rien).
import { historiqueObjet, type LigneJournal } from '../../../../packages/noyau/src/controles/journal.js';
import { ErreurJournalVerification, type ContexteJournal, type JournalVerification } from './journal-verification.js';

const VERSION_REGLE_MIN = 1;
const vide = (s: unknown): boolean => typeof s !== 'string' || s.trim() === '';
const entierFini = (n: unknown): boolean => typeof n === 'number' && Number.isInteger(n);

function verifierContexte(ctx: ContexteJournal): void {
  if (vide(ctx?.societe)) throw new ErreurJournalVerification('contexte_invalide');
}

function verifierLigne(l: LigneJournal): void {
  const champsVides = [l.versionParametres, l.horodatage, l.regleId, l.objetType, l.objetId].some(vide);
  const versionKo = !entierFini(l.versionRegle) || l.versionRegle < VERSION_REGLE_MIN;
  const ecartKo = l.ecartCentimes !== undefined && !entierFini(l.ecartCentimes);
  const valeurKo = typeof l.valeur === 'number' && !Number.isFinite(l.valeur);
  if (champsVides || versionKo || ecartKo || valeurKo) throw new ErreurJournalVerification('ligne_invalide');
}

interface Stockee { id: string; societe: string; ligne: LigneJournal }

export function creerJournalVerificationMemoire(options: { nouvelId: () => string }): JournalVerification {
  const stock: Stockee[] = [];
  return {
    async ajouterLot(ctx, lignes) {
      verifierContexte(ctx);
      lignes.forEach(verifierLigne);
      for (const ligne of lignes) stock.push({ id: options.nouvelId(), societe: ctx.societe, ligne: Object.freeze({ ...ligne }) });
    },
    async historique(ctx, objetType, objetId) {
      verifierContexte(ctx);
      const siennes = stock.filter((s) => s.societe === ctx.societe).map((s) => s.ligne);
      return historiqueObjet(siennes, objetType, objetId).map((l) => ({ ...l }));
    },
    async modifier(ctx) {
      verifierContexte(ctx);
      throw new ErreurJournalVerification('ajout_seul');
    },
    async supprimer(ctx) {
      verifierContexte(ctx);
      throw new ErreurJournalVerification('ajout_seul');
    },
  };
}
