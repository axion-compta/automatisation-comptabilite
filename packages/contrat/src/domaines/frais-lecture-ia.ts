import { oc } from '@orpc/contract';
import { z } from 'zod';
import { centimes } from '../../../noyau/src/argent/index.js';
import { determinerPayeur, type ResultatPayeur } from '../../../noyau/src/frais/payeur.js';
import { cheminSociete } from '../prefixe-routes.js';

const Id = z.string().min(1).max(50);
const Texte = z.string().trim().min(1).max(200);
export const MENTION_IA = 'Préparé par IA, à valider';

/** Ce que lit le fournisseur sur un ticket. Tout champ peut manquer : jamais d'estimation. */
export const LectureTicket = z.object({
  fournisseur: Texte.optional(),
  date: z.iso.date().optional(),
  ttcCentimes: z.number().int().min(0).optional(),
  tvaParTaux: z.array(z.object({ tauxCentiemes: z.number().int().min(0), montantCentimes: z.number().int().min(0) })).max(10).optional(),
  quatreChiffres: z.string().regex(/^\d{4}$/).optional(),
  couverts: z.number().int().min(1).max(500).optional(),
  confiance: z.enum(['sure', 'incertaine']),
});
export type LectureTicket = z.infer<typeof LectureTicket>;

/** Port du fournisseur d'IA (liste fermée D43). Aucun fournisseur réel : l'adaptateur de ce lot est un faux. */
export interface FournisseurLectureIa {
  lireTicket(pieceId: string): Promise<unknown>;
  proposerDistance(depart: string, arrivee: string): Promise<{ kmDixiemes: number } | undefined>;
}

export const BrouillonLu = z.object({
  statut: z.enum(['brouillon', 'a_completer']),
  mention: z.literal(MENTION_IA),
  fournisseurDisponible: z.boolean(),
  confiance: z.enum(['sure', 'incertaine']).optional(),
  champs: z.object({ fournisseur: z.string().optional(), date: z.string().optional(), ttcCentimes: z.number().int().optional(), tvaParTaux: LectureTicket.shape.tvaParTaux, quatreChiffres: z.string().optional(), couverts: z.number().int().optional(), kmDixiemes: z.number().int().optional() }),
  manquants: z.array(z.string()),
  payeur: z.object({ payeur: z.string(), regle: z.number().int(), question: z.string().optional() }),
  distanceProposee: z.object({ kmDixiemes: z.number().int().min(0), mention: z.literal(MENTION_IA), retenue: z.literal(false) }).optional(),
});
export type BrouillonLu = z.infer<typeof BrouillonLu>;

export const lireTicketFrais = oc
  .route({ method: 'POST', path: cheminSociete('/frais/lecture-ticket') as `/${string}`, inputStructure: 'detailed', operationId: 'lireTicketFrais', tags: ['lecture-par-post', 'sans-effet', 'acces:lecture'] })
  .errors({ ENTREE_INVALIDE: { status: 400 } })
  .input(z.object({ params: z.object({ s: z.string().min(1) }), body: z.object({ pieceId: Id, depart: Texte.optional(), arrivee: Texte.optional() }) }))
  .output(z.object({ body: BrouillonLu }));

export const fraisLectureIa = { lireTicketFrais };

/** Contexte bancaire de l'essai (fictif). Le payeur vient des règles du noyau, jamais de l'IA. */
export interface ContexteBanque { cartesSociete: readonly string[]; releveImporte: boolean; fenetreJours: number }
const BANQUE_ESSAI: ContexteBanque = { cartesSociete: ['4242'], releveImporte: false, fenetreJours: 3 };

const payeurDe = (l: LectureTicket | undefined, banque: ContexteBanque): ResultatPayeur =>
  determinerPayeur({
    ticket: l?.ttcCentimes !== undefined && l.date !== undefined ? { montantTtc: centimes(l.ttcCentimes), date: l.date, ...(l.quatreChiffres === undefined ? {} : { quatreChiffres: l.quatreChiffres }) } : { montantTtc: centimes(0), date: '2000-01-01' },
    lignes: [],
    ...banque,
  });

/** Service : lecture du ticket puis distance proposée. Fournisseur absent, en panne ou incohérent : brouillon vide. */
export function creerServiceLectureIa(fournisseur: FournisseurLectureIa, banque: ContexteBanque = BANQUE_ESSAI) {
  const vide = (): BrouillonLu => ({ statut: 'brouillon', mention: MENTION_IA, fournisseurDisponible: false, champs: {}, manquants: ['fournisseur', 'date', 'ttcCentimes'], payeur: { payeur: 'a_confirmer', regle: 4, question: 'qui_a_paye' } });
  return {
    async preparer(pieceId: string, trajet?: { depart?: string | undefined; arrivee?: string | undefined }): Promise<BrouillonLu> {
      let lu: LectureTicket;
      try {
        lu = LectureTicket.parse(await fournisseur.lireTicket(pieceId));
      } catch {
        return vide();
      }
      const { confiance, ...champs } = lu;
      const manquants = (['fournisseur', 'date', 'ttcCentimes'] as const).filter((k) => lu[k] === undefined);
      const p = payeurDe(manquants.length === 0 ? lu : undefined, banque);
      const sortie: BrouillonLu = { statut: confiance === 'sure' && manquants.length === 0 ? 'brouillon' : 'a_completer', mention: MENTION_IA, fournisseurDisponible: true, confiance, champs, manquants: [...manquants], payeur: { payeur: p.payeur, regle: p.regle, ...(p.question === undefined ? {} : { question: p.question }) } };
      const depart = trajet?.depart?.trim();
      const arrivee = trajet?.arrivee?.trim();
      if (depart && arrivee) {
        const d = await fournisseur.proposerDistance(depart, arrivee).catch(() => undefined);
        if (d !== undefined && Number.isInteger(d.kmDixiemes) && d.kmDixiemes >= 0) sortie.distanceProposee = { kmDixiemes: d.kmDixiemes, mention: MENTION_IA, retenue: false };
      }
      return sortie;
    },
    /** Seul geste qui recopie la distance proposée dans les km du brouillon. */
    retenirDistance(b: BrouillonLu): BrouillonLu {
      if (b.distanceProposee === undefined) return b;
      return { ...b, champs: { ...b.champs, kmDixiemes: b.distanceProposee.kmDixiemes } };
    },
  };
}

/** Faux fournisseur : réponses enregistrées (données fictives), aucun appel réseau. */
export function creerFauxFournisseurLecture(options: { tickets?: Record<string, unknown>; distances?: Record<string, number>; indisponible?: boolean } = {}): FournisseurLectureIa & { appelsDistance: number } {
  const faux = {
    appelsDistance: 0,
    async lireTicket(pieceId: string): Promise<unknown> {
      const r = options.tickets?.[pieceId];
      if (options.indisponible || r === undefined) throw new Error('fournisseur_indisponible');
      return r;
    },
    async proposerDistance(depart: string, arrivee: string) {
      faux.appelsDistance += 1;
      const km = options.distances?.[`${depart}>${arrivee}`];
      return km === undefined ? undefined : { kmDixiemes: km };
    },
  };
  return faux;
}
