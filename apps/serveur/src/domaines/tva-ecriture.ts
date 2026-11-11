import type { implement } from '@orpc/server';
import type { contrat } from '../../../../packages/contrat/src/routes.js';
import { demanderInclureSousReserve, ErreurSousReserve, passerEnSousReserve, type LigneTvaAchat } from '../../../../packages/noyau/src/tva/sous-reserve.js';
import { deplacerPiece, ErreurRattachement, type Rattachement } from '../../../../packages/noyau/src/tva/rattachement.js';
import { carteTva } from '../../../../packages/noyau/src/tva/rappel-paiement.js';
export type Acteur = { type: 'personne' | 'ia'; id: string; role: string };
/** Fourni plus tard par la console (D29). Aucun en-tête de requête ne choisit l'acteur. */
export interface PortSession { lire(): { acteur: Acteur } | undefined }
export type LigneJournal = { type: 'refus_reglage' | 'tva_payee_cochee' | 'passage_sous_reserve' | 'rattachement_modifie'; par: string; le: string; [detail: string]: unknown };
/** La persistance du journal attend la console : ici seulement l'interface. */
export interface PortJournal { ecrire(ligne: LigneJournal): void }
/** État FICTIF en mémoire. */
export type EtatTva = { lignes: LigneTvaAchat[]; rattachements: Rattachement[]; periodesDeposees: string[] };
export type Ports = { session: PortSession; journal: PortJournal; horloge: () => string; etat: EtatTva };
type Code = 'NON_AUTHENTIFIE' | 'REGLAGE_VERROUILLE' | 'ACTEUR_NON_HUMAIN' | 'OBJET_INCONNU' | 'PERIODE_BLOQUEE' | 'TRANSITION_INTERDITE' | 'PERIODE_DEPOSEE' | 'MOIS_IDENTIQUE' | 'DEJA_FAIT';
export type Resultat = { ok: unknown } | { erreur: Code };
/** Service par défaut : aucune session, tout est refusé en 401. */
export const sessionAbsente: PortSession = { lire: () => undefined };
const journalNul: PortJournal = { ecrire: () => undefined };
const jourSysteme = (): string => new Date().toISOString().slice(0, 10);
export function creerServiceEcritureTva(ports: Partial<Ports> = {}) {
  const { session, journal, horloge } = { session: sessionAbsente, journal: journalNul, horloge: jourSysteme, ...ports };
  const source = ports.etat ?? { lignes: [], rattachements: [], periodesDeposees: [] };
  const copie = (e: EtatTva): EtatTva => ({ lignes: e.lignes.map((l) => ({ ...l })), rattachements: e.rattachements.map((r) => ({ ...r })), periodesDeposees: [...e.periodesDeposees] });
  const etat = copie(source);
  const traites = new Set<string>();
  const rejeux = new Map<string, { empreinte: string; resultat: Resultat }>();
  const refusVus = new Set<string>();
  /** Session, rejeu de la même clé, objet déjà traité, règle propre à l'effet, puis une ligne de journal. */
  function agir(cle: string, empreinte: string, unique: boolean, regle: (a: Acteur, le: string) => { reponse: unknown; ligne: { type: LigneJournal['type']; [detail: string]: unknown } } | { erreur: Code }): Resultat {
    const s = session.lire();
    if (s === undefined) return { erreur: 'NON_AUTHENTIFIE' };
    const rejeu = rejeux.get(cle);
    if (rejeu !== undefined) return rejeu.empreinte === empreinte ? rejeu.resultat : { erreur: 'DEJA_FAIT' };
    if (unique && traites.has(empreinte)) return { erreur: 'DEJA_FAIT' };
    const le = horloge();
    const r = regle(s.acteur, le);
    if ('erreur' in r) return r;
    if (unique) traites.add(empreinte);
    const resultat = { ok: r.reponse };
    rejeux.set(cle, { empreinte, resultat });
    journal.ecrire({ ...r.ligne, par: s.acteur.id, le });
    return resultat;
  }
  const mois = (piece: string) => etat.rattachements.find((r) => r.pieceId === piece)?.mois;
  return {
    etat: (): EtatTva => copie(etat),
    /** Refus pour tout rôle ; une ligne de refus par tentative de clé nouvelle ; rien n'est modifié. */
    modifierInclureSousReserve(cle: string): Resultat {
      const s = session.lire();
      if (s === undefined) return { erreur: 'NON_AUTHENTIFIE' };
      if (!refusVus.has(cle)) {
        refusVus.add(cle);
        const refus = demanderInclureSousReserve(s.acteur);
        journal.ecrire({ type: refus.journal.type, par: refus.journal.par, le: horloge(), reglage: refus.journal.reglage });
      }
      return { erreur: 'REGLAGE_VERROUILLE' };
    },
    cocherTvaPayee: (cle: string, exercice: string, periode: string): Resultat =>
      agir(cle, ['payee', exercice, periode].join('|'), true, (a, le) => {
        if (!etat.rattachements.some((r) => r.mois === periode) && !etat.periodesDeposees.includes(periode)) return { erreur: 'OBJET_INCONNU' };
        const enDoute = new Set(etat.lignes.filter((l) => l.certitude === 'en_doute' && mois(l.pieceId) === periode).map((l) => l.pieceId));
        const carte = carteTva({ declaration: null, piecesEnDoute: enDoute.size, paiement: { par: a.id, le, origine: 'coche' } });
        if (carte.etat !== 'payee') return { erreur: 'PERIODE_BLOQUEE' };
        return { reponse: carte, ligne: { type: 'tva_payee_cochee', periode, origine: 'coche' } };
      }),
    passerLigneEnSousReserve: (cle: string, exercice: string, ligne: string, motif: string): Resultat =>
      agir(cle, ['sous-reserve', exercice, ligne].join('|'), true, (a, le) => {
        const l = etat.lignes.find((x) => x.id === ligne);
        if (l === undefined) return { erreur: 'OBJET_INCONNU' };
        try {
          const r = passerEnSousReserve(l, { acteur: a, motif, pieceId: l.pieceId, le });
          etat.lignes = etat.lignes.map((x) => (x.id === ligne ? r.ligne : x));
          return { reponse: r, ligne: { type: 'passage_sous_reserve', ligne, motif, pieceId: l.pieceId } };
        } catch (e) {
          if (e instanceof ErreurSousReserve && e.code === 'ia_non_autorisee') return { erreur: 'ACTEUR_NON_HUMAIN' };
          if (e instanceof ErreurSousReserve && e.code === 'transition_interdite') return { erreur: 'TRANSITION_INTERDITE' };
          throw e;
        }
      }),
    modifierRattachement: (cle: string, exercice: string, piece: string, nouveauMois: string): Resultat =>
      agir(cle, ['rattachement', exercice, piece, nouveauMois].join('|'), false, (a, le) => {
        try {
          const r = deplacerPiece(etat.rattachements, { pieceId: piece, nouveauMois, par: a.id, le }, etat.periodesDeposees);
          etat.rattachements = r.rattachements;
          const reponse = { ancien_mois: r.journal.ancienMois, nouveau_mois: r.journal.nouveauMois, par: a.id, le, periodes_a_recalculer: r.periodesARecalculer };
          return { reponse, ligne: { type: 'rattachement_modifie', piece, ancien_mois: r.journal.ancienMois, nouveau_mois: r.journal.nouveauMois } };
        } catch (e) {
          if (e instanceof ErreurRattachement && e.code === 'piece_inconnue') return { erreur: 'OBJET_INCONNU' };
          if (e instanceof ErreurRattachement && e.code === 'periode_deposee') return { erreur: 'PERIODE_DEPOSEE' };
          if (e instanceof ErreurRattachement && e.code === 'mois_identique') return { erreur: 'MOIS_IDENTIQUE' };
          throw e;
        }
      }),
  };
}
export type ServiceEcritureTva = ReturnType<typeof creerServiceEcritureTva>;
type Erreurs = Record<string, () => Error>;
type Entree = { params: Record<string, string>; headers: Record<string, string>; body: Record<string, string> };
type Os = ReturnType<typeof implement<typeof contrat.tva>>;
const issue = (r: Resultat, errors: Erreurs) => {
  if ('ok' in r) return { body: r.ok };
  throw (errors[r.erreur] as () => Error)();
};
export function implementerEcritureTva(os: Os, service: ServiceEcritureTva) {
  const lier = (f: (cle: string, i: Entree) => Resultat) => (({ input, errors }: { input: Entree; errors: Erreurs }) => issue(f(input.headers['idempotency-key'] as string, input), errors)) as never;
  return {
    modifierInclureSousReserve: os.modifierInclureSousReserve.handler(lier((k) => service.modifierInclureSousReserve(k))),
    cocherTvaPayee: os.cocherTvaPayee.handler(lier((k, i) => service.cocherTvaPayee(k, i.params['exercice'] as string, i.params['periode'] as string))),
    passerLigneEnSousReserve: os.passerLigneEnSousReserve.handler(lier((k, i) => service.passerLigneEnSousReserve(k, i.params['exercice'] as string, i.params['ligne'] as string, i.body['motif'] as string))),
    modifierRattachement: os.modifierRattachement.handler(lier((k, i) => service.modifierRattachement(k, i.params['exercice'] as string, i.params['piece'] as string, i.body['nouveau_mois'] as string))),
  };
}
