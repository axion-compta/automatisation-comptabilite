// Service des trois écritures de la TVA : préparer, valider (réauthentification), enregistrer l'accusé. Codes seulement, aucun texte.
// La réauthentification vient du port (console) : ce module ne calcule jamais lui-même qu'une personne s'est réauthentifiée.
import { createHash } from 'node:crypto';
import type { DeclarationTva } from '../../../../packages/contrat/src/domaines/tva.js';
import type { RegleControle, TraceControle } from '../../../../packages/noyau/src/controles/moteur.js';
import { verifierAvantAction } from '../../../../packages/noyau/src/controles/garde-fou.js';
import { reponseGardeFou } from '../../../../packages/noyau/src/controles/reponses.js';
import type { ResultatFormules } from '../../../../packages/noyau/src/declarations/formules.js';
import { etatMention } from '../../../../packages/noyau/src/documents/mention.js';
import type { VerdictNiveau } from '../../../../packages/noyau/src/securite/connexion.js';
import type { DepotDocumentsProduits, DepotTva, DeclarationEnregistree, PeriodeTvaEnregistree } from '../persistance/declarations.js';
import type { DepotPiecesEnregistrees } from '../pieces/ports.js';

export interface PortReauthentification { verifier(sessionId: string): Promise<{ verdict: VerdictNiveau; personneId: string | null }> }
export interface SourceControles { traces(societeId: string, periodeId: string): Promise<readonly TraceControle[]>; regles(): readonly RegleControle<unknown>[] }
export interface SourceFormules { calculer(societeId: string, periodeId: string): Promise<ResultatFormules> }
export interface PortsEcritureTva {
  documents: DepotDocumentsProduits;
  tva: DepotTva;
  reauth: PortReauthentification;
  pieces: Pick<DepotPiecesEnregistrees, 'parId'>;
  controles: SourceControles;
  formules: SourceFormules;
  horloge: { maintenant(): string };
  versions: { logiciel: string; paquet: number };
}

export type CorpsDeclaration = Omit<DeclarationTva, 'statut'> & { statut: DeclarationTva['statut'] | 'preparee' };
export interface Reponse { statut: number; corps: unknown }
const rep = (statut: number, code: string, extra: object = {}): Reponse => ({ statut, corps: { code, ...extra } });
const INTROUVABLE = (): Reponse => rep(404, 'introuvable');
const TRANSITION = (): Reponse => rep(409, 'transition_interdite');
const vide = (t: string): boolean => typeof t !== 'string' || t.trim() === '';

export function creerEcritureTva(p: PortsEcritureTva) {
  const memoire = new Map<string, { empreinte: string; reponse: Reponse }>();
  async function idempotent(societeId: string, cle: string, empreinte: unknown, agir: () => Promise<Reponse>): Promise<Reponse> {
    if (vide(cle)) return rep(400, 'cle_manquante');
    const k = JSON.stringify([societeId, cle]);
    const e = JSON.stringify(empreinte);
    const vu = memoire.get(k);
    if (vu) return vu.empreinte === e ? vu.reponse : rep(409, 'cle_reutilisee');
    const reponse = await agir();
    if (reponse.statut < 400) memoire.set(k, { empreinte: e, reponse });
    return reponse;
  }
  const refusGarde = async (societeId: string, periodeId: string): Promise<Reponse | null> =>
    reponseGardeFou(verifierAvantAction(await p.controles.traces(societeId, periodeId), p.controles.regles(), 'tva'));

  async function corps(societeId: string, d: DeclarationEnregistree, periode: PeriodeTvaEnregistree): Promise<CorpsDeclaration> {
    const doc = p.documents.parId(societeId, d.documentId);
    if (doc === null) throw new Error('document_absent');
    const traces = await p.controles.traces(societeId, d.periodeId);
    const m = etatMention({ statut: doc.statut === 'valide' ? 'valide' : 'a_valider', nature: 'officiel', ...(doc.validePar !== undefined && { validePar: doc.validePar }), ...(doc.valideLe !== undefined && { valideLe: doc.valideLe }) });
    return {
      id: d.id, periodeId: d.periodeId, formulaire: periode.formulaire, millesime: new Date(periode.debut).getUTCFullYear(),
      mention: m.mention, versionPaquet: Number(doc.versionPaquet), statut: periode.statut === 'preparee' ? 'preparee' : (periode.statut as 'validee' | 'deposee_par_client'),
      validePar: doc.validePar ?? null, valideLe: doc.valideLe ?? null,
      cases: d.cases.map((c) => ({ code: c.code, montantCentimes: Number(c.montant), baseCentimes: null, sources: c.sources })),
      controles: traces.map((t) => ({ regleId: t.regleId, resultat: t.resultat === 'OK' ? 'ok' as const : 'ecart' as const })),
    };
  }
  async function chargerDeclaration(societeId: string, declarationId: string): Promise<{ d: DeclarationEnregistree; periode: PeriodeTvaEnregistree } | null> {
    const d = p.tva.declaration(societeId, declarationId);
    const periode = d === null ? null : p.tva.periode(societeId, d.periodeId);
    return d === null || periode === null ? null : { d, periode };
  }
  return {
    preparer(a: { societeId: string; periodeId: string; cle: string; personneId: string }): Promise<Reponse> {
      const { cle, ...reste } = a;
      return idempotent(a.societeId, cle, ['preparer', reste], async () => {
        const periode = p.tva.periode(a.societeId, a.periodeId);
        if (periode === null) return INTROUVABLE();
        if (periode.statut !== 'ouverte') return TRANSITION();
        const refus = await refusGarde(a.societeId, a.periodeId);
        if (refus !== null) return refus;
        const f = await p.formules.calculer(a.societeId, a.periodeId);
        if (f.bloque) return rep(422, f.code, { ligne: f.ligne });
        const documentId = `document-${a.periodeId}`;
        const sha256 = createHash('sha256').update(JSON.stringify([a.periodeId, f.cases])).digest('hex');
        p.documents.ajouterVersion(a.societeId, {
          id: documentId, type: 'declaration_tva', exerciceId: periode.exerciceId, statut: 'a_valider', sha256,
          versionLogiciel: p.versions.logiciel, versionPaquet: String(p.versions.paquet), preparePar: a.personneId, prepareLe: p.horloge.maintenant(), resultatControles: 'ok',
        });
        const d = p.tva.enregistrerDeclaration(a.societeId, { id: `declaration-${a.periodeId}`, periodeId: a.periodeId, documentId, resultat: f });
        const suite = p.tva.changerStatutPeriode(a.societeId, a.periodeId, 'preparee');
        return { statut: 201, corps: await corps(a.societeId, d, suite) };
      });
    },
    valider(a: { societeId: string; declarationId: string; cle: string; sessionId: string }): Promise<Reponse> {
      const { cle, ...reste } = a;
      return idempotent(a.societeId, cle, ['valider', reste], async () => {
        const c = await chargerDeclaration(a.societeId, a.declarationId);
        if (c === null) return INTROUVABLE();
        if (c.periode.statut !== 'preparee') return TRANSITION();
        const { verdict, personneId } = await p.reauth.verifier(a.sessionId);
        if (!verdict.ok) return rep(401, verdict.raison);
        if (personneId === null || vide(personneId)) return rep(401, 'non_authentifie');
        const refus = await refusGarde(a.societeId, c.d.periodeId);
        if (refus !== null) return refus;
        p.documents.valider(a.societeId, c.d.documentId, { par: personneId, le: p.horloge.maintenant() });
        const suite = p.tva.changerStatutPeriode(a.societeId, c.d.periodeId, 'validee');
        return { statut: 200, corps: await corps(a.societeId, c.d, suite) };
      });
    },
    enregistrerAccuse(a: { societeId: string; declarationId: string; cle: string; pieceId: string }): Promise<Reponse> {
      const { cle, ...reste } = a;
      return idempotent(a.societeId, cle, ['accuse', reste], async () => {
        const c = await chargerDeclaration(a.societeId, a.declarationId);
        if (c === null) return INTROUVABLE();
        if (c.periode.statut !== 'validee') return TRANSITION();
        const piece = vide(a.pieceId) ? null : await p.pieces.parId(a.pieceId);
        if (piece === null || piece.societeId !== a.societeId) return rep(422, 'accuse_manquant');
        p.tva.enregistrerAccuse(a.societeId, { id: `accuse-${c.d.periodeId}`, periodeId: c.d.periodeId, pieceId: a.pieceId, saisiPar: 'client', saisiLe: p.horloge.maintenant() });
        return { statut: 201, corps: { declarationId: c.d.id, periodeId: c.d.periodeId, statut: 'deposee_par_client', pieceId: a.pieceId } };
      });
    },
  };
}
