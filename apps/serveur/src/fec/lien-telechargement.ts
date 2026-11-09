// Lien de téléchargement du FEC : réauthentification, courte durée, une ligne de journal par téléchargement.
// Tout passe par des ports (stockage, session, journal, clé) : aucun réseau, aucune base, données fictives en test.
import { empreinteSha256 } from '../../../../packages/noyau/src/documents/empreinte.js';
import type { RapportFec } from '../../../../packages/noyau/src/fec/rapport.js';
import { exigerNiveau, type Revendications } from '../../../../packages/noyau/src/securite/connexion.js';
import { REPONSE_INTROUVABLE } from '../../../../packages/noyau/src/securite/societe.js';
import { creerLienExpirant, lireLienExpirant, type Signataire } from '../documents/lien-expirant.js';
import type { DepotDocumentsProduits } from '../persistance/declarations.js';

export interface StockageFichiers {
  lire(societeId: string, documentId: string): Promise<Uint8Array | null>;
}
export interface LigneJournalFec { documentId: string; societeId: string; personneId: string; le: string; sha256: string }
export interface PortsLiensFec {
  documents: DepotDocumentsProduits;
  stockage: StockageFichiers;
  rapports: { rapport(societeId: string, documentId: string): Promise<RapportFec | null> };
  session: { revendications(sessionId: string): Promise<{ revendications?: Revendications; personneId: string | null; derniereRecuperationMs?: number }> };
  journal: { ajouter(ligne: LigneJournalFec): Promise<void> };
  signataire: Signataire;
  horloge: { maintenantMs(): number };
}
export interface ReglagesLiensFec { dureeLienMs: number; reauthMaxMs: number; attenteApresRecuperationMs: number }
export type ReponseDemande =
  | { statut: 201; url: string; expire_le: string }
  | { statut: 401 | 404 | 409; code: string };
export type ReponseTelechargement =
  | { statut: 200; octets: Uint8Array }
  | { statut: 401 | 404 | 409 | 410; code: string };

const PREFIXE_URL = '/fec/telechargement/';
const refus = (statut: 401 | 404 | 409 | 410, code: string): { statut: 401 | 404 | 409 | 410; code: string } => ({ statut, code });

export function creerLiensFec(ports: PortsLiensFec, reglages: ReglagesLiensFec) {
  const fec = (societeId: string, documentId: string) => {
    const d = ports.documents.parId(societeId, documentId);
    return d !== null && d.type === 'fec' ? d : null;
  };

  async function demanderLien(e: { societeId: string; documentId: string; sessionId: string }): Promise<ReponseDemande> {
    const doc = fec(e.societeId, e.documentId);
    if (doc === null) return REPONSE_INTROUVABLE;
    const s = await ports.session.revendications(e.sessionId);
    const maintenantMs = ports.horloge.maintenantMs();
    const verdict = exigerNiveau(s.revendications, 'exporter_fec', maintenantMs, reglages, s.derniereRecuperationMs);
    if (!verdict.ok) return refus(401, verdict.raison) as ReponseDemande;
    const rapport = await ports.rapports.rapport(e.societeId, e.documentId);
    if (rapport === null || !rapport.telechargementAutorise) return refus(409, 'telechargement_refuse') as ReponseDemande;
    const octets = await ports.stockage.lire(e.societeId, e.documentId);
    if (octets === null || empreinteSha256(octets) !== doc.sha256) return refus(409, 'empreinte_differente') as ReponseDemande;
    const lien = await creerLienExpirant({ societeId: e.societeId, objetId: e.documentId, maintenantMs, dureeMs: reglages.dureeLienMs }, ports.signataire);
    return { statut: 201, url: PREFIXE_URL + lien.jeton, expire_le: new Date(lien.expireLe).toISOString() };
  }

  async function telecharger(e: { jeton: string; societeId: string; sessionId: string }): Promise<ReponseTelechargement> {
    const s = await ports.session.revendications(e.sessionId);
    if (s.revendications === undefined || s.personneId === null || s.personneId === '') return refus(401, 'session_absente') as ReponseTelechargement;
    const maintenantMs = ports.horloge.maintenantMs();
    const lu = await lireLienExpirant(e.jeton, { societeId: e.societeId, maintenantMs }, ports.signataire);
    if (!lu.ok) return lu.code === 'lien_expire' ? refus(410, 'lien_expire') : REPONSE_INTROUVABLE;
    const doc = fec(e.societeId, lu.objetId);
    if (doc === null) return REPONSE_INTROUVABLE;
    const octets = await ports.stockage.lire(e.societeId, lu.objetId);
    if (octets === null || empreinteSha256(octets) !== doc.sha256) return refus(409, 'empreinte_differente');
    await ports.journal.ajouter({ documentId: doc.id, societeId: e.societeId, personneId: s.personneId, le: new Date(maintenantMs).toISOString(), sha256: doc.sha256 });
    return { statut: 200, octets };
  }

  return { demanderLien, telecharger };
}
