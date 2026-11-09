import type { implement } from '@orpc/server';
import type { contrat } from '../../../../packages/contrat/src/routes.js';
import { choisir, ErreurConfidentialite, type OptionConfidentialite } from '../../../../packages/noyau/src/juridique/confidentialite.js';
import type { VerdictNiveau } from '../../../../packages/noyau/src/securite/connexion.js';
import type { ObligationsJuridiques } from '../../../../packages/contrat/src/domaines/juridique.js';
import type { ReponseEcritureJuridique } from '../../../../packages/contrat/src/domaines/juridique-ecriture.js';

export type SessionJuridique = { personneId: string; representantLegal: boolean; niveau: VerdictNiveau };
/** Fourni plus tard par la console ; ici seulement l'interface. Aucun en-tête de requête ne choisit l'acteur. */
export interface PortSession { lire(exigence: 'ordinaire' | 'recent'): SessionJuridique | undefined }
export interface PortTrace { ecrire(ligne: { action: string; exercice: string; objet: string; par: string; le: string }): void }
export type Ports = { session: PortSession; trace: PortTrace; horloge: () => string; lire: (exercice: string) => ObligationsJuridiques | null };

type Raison = Exclude<VerdictNiveau, { ok: true }>['raison'];
export type Refus = { erreur: 'EXERCICE_INCONNU' | 'OBJET_INCONNU' | 'REPRESENTANT_LEGAL_REQUIS' | 'NON_APPLICABLE' | 'DEJA_FAIT' } | { erreur: 'REAUTHENTIFICATION_REQUISE'; raison: Raison };
export type Resultat = { ok: ReponseEcritureJuridique } | Refus;

/** Service par défaut : aucune session, tout est refusé en 401. */
export const sessionAbsente: PortSession = { lire: () => undefined };
const traceNulle: PortTrace = { ecrire: () => undefined };
const jourSysteme = (): string => new Date().toISOString().slice(0, 10);

export function creerServiceEcritureJuridique(ports: Partial<Ports> & Pick<Ports, 'lire'>) {
  const { session, trace, horloge } = { session: sessionAbsente, trace: traceNulle, horloge: jourSysteme, ...ports };
  const traites = new Set<string>();
  const rejeux = new Map<string, { empreinte: string; reponse: ReponseEcritureJuridique }>();

  /** Un seul chemin : session, idempotence, exercice, règle propre à l'effet, puis une ligne de trace. */
  function agir(exigence: 'ordinaire' | 'recent', cle: string, action: string, exercice: string, objet: string, regle: (o: ObligationsJuridiques, s: SessionJuridique, le: string) => Refus | { etat: string }): Resultat {
    const s = session.lire(exigence);
    if (s === undefined) return { erreur: 'REAUTHENTIFICATION_REQUISE', raison: 'non_authentifie' };
    if (!s.niveau.ok) return { erreur: 'REAUTHENTIFICATION_REQUISE', raison: s.niveau.raison };
    if (exigence === 'recent' && !s.representantLegal) return { erreur: 'REPRESENTANT_LEGAL_REQUIS' };
    const empreinte = [action, exercice, objet].join('|');
    const rejeu = rejeux.get(cle);
    if (rejeu !== undefined) return rejeu.empreinte === empreinte ? { ok: rejeu.reponse } : { erreur: 'DEJA_FAIT' };
    const o = ports.lire(exercice);
    if (o === null) return { erreur: 'EXERCICE_INCONNU' };
    const le = horloge();
    const r = regle(o, s, le);
    if ('erreur' in r) return r;
    if (traites.has(empreinte)) return { erreur: 'DEJA_FAIT' };
    traites.add(empreinte);
    const reponse = { objet, etat: r.etat, par: s.personneId, le };
    rejeux.set(cle, { empreinte, reponse });
    trace.ecrire({ action, exercice, objet, par: s.personneId, le });
    return { ok: reponse };
  }

  const option = (o: ObligationsJuridiques): OptionConfidentialite => (o.confidentialite.proposee ? { proposee: true, choix: 'non_choisi' } : { proposee: false, carte: null });
  const piece = (action: string, etat: string) => (cle: string, exercice: string, objet: string): Resultat =>
    agir('ordinaire', cle, action, exercice, objet, (o) => (o.cartes.some((c) => c.objetId === objet) ? { etat } : { erreur: 'OBJET_INCONNU' }));

  return {
    validerRapport: (cle: string, exercice: string, rapport: 'gestion' | 'sci'): Resultat =>
      agir('recent', cle, 'rapport_valide', exercice, rapport, (o) => {
        const applicable = rapport === 'gestion' ? o.rapportGestion.statut === 'brouillon' : o.forme === 'FORME_SCI';
        return applicable ? { etat: 'valide' } : { erreur: 'NON_APPLICABLE' };
      }),
    choisirConfidentialite: (cle: string, exercice: string, choix: 'demandee' | 'refusee'): Resultat =>
      agir('ordinaire', cle, 'confidentialite_choisie', exercice, 'confidentialite', (o, s, le) => {
        try {
          return { etat: choisir(option(o), { choix, par: s.personneId, le }).choix };
        } catch (e) {
          if (e instanceof ErreurConfidentialite && e.code === 'option_non_proposee') return { erreur: 'NON_APPLICABLE' };
          throw e;
        }
      }),
    enregistrerPieceDecision: piece('decision_piece_enregistree', 'deposee'),
    enregistrerPieceConvention: piece('convention_piece_enregistree', 'archivee'),
  };
}
export type ServiceEcritureJuridique = ReturnType<typeof creerServiceEcritureJuridique>;

type Erreurs = Record<string, (o?: { data: unknown }) => Error>;
type Entree = { params: { exercice: string; objet: string; rapport: 'gestion' | 'sci' }; headers: Record<string, string>; body: { choix: 'demandee' | 'refusee' } };
type Contexte = { input: Entree; errors: Erreurs };
type Os = ReturnType<typeof implement<typeof contrat.juridique>>;

/** Traduit le résultat du service en réponse ou en erreur typée ; une exception inconnue remonte telle quelle. */
const issue = (r: Resultat, errors: Erreurs) => {
  if ('ok' in r) return { body: r.ok };
  throw (errors[r.erreur] as NonNullable<Erreurs[string]>)('raison' in r ? { data: { raison: r.raison } } : undefined);
};

export function implementerEcritureJuridique(os: Os, service: ServiceEcritureJuridique) {
  const lier = (f: (cle: string, i: Entree) => Resultat) => ((c: Contexte) => issue(f(c.input.headers['idempotency-key'] as string, c.input), c.errors)) as never;
  return {
    validerRapport: os.validerRapport.handler(lier((k, i) => service.validerRapport(k, i.params.exercice, i.params.rapport))),
    choisirConfidentialite: os.choisirConfidentialite.handler(lier((k, i) => service.choisirConfidentialite(k, i.params.exercice, i.body.choix))),
    enregistrerPieceDecision: os.enregistrerPieceDecision.handler(lier((k, i) => service.enregistrerPieceDecision(k, i.params.exercice, i.params.objet))),
    enregistrerPieceConvention: os.enregistrerPieceConvention.handler(lier((k, i) => service.enregistrerPieceConvention(k, i.params.exercice, i.params.objet))),
  };
}
