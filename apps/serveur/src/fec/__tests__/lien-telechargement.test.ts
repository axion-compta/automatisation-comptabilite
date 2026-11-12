import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { empreinteSha256 } from '../../../../../packages/noyau/src/documents/empreinte.js';
import { fichierFec } from '../../../../../packages/noyau/src/fec/fichier.js';
import { rapportFec } from '../../../../../packages/noyau/src/fec/rapport.js';
import { creerLienExpirant, ErreurLienExpirant, lireLienExpirant, type Signataire } from '../../documents/lien-expirant.js';
import { DepotDocumentsMemoire } from '../../persistance/declarations-memoire.js';
import { creerLiensFec, type LigneJournalFec } from '../lien-telechargement.js';

const CLE = 'k'.repeat(32);
const signataire: Signataire = {
  signer: async (c) => createHmac('sha256', CLE).update(c).digest('base64url'),
  verifier: async (c, s) => s === createHmac('sha256', CLE).update(c).digest('base64url'),
};
const MS = 1000;
const MINUTE = 60 * MS;
const A = 'societe-a';
const B = 'societe-b';
const MAINTENANT = Date.UTC(2026, 0, 15, 10, 0, 0);
const DUREE = 5 * MINUTE;
const REGLAGES = { dureeLienMs: DUREE, reauthMaxMs: 10 * MINUTE, attenteApresRecuperationMs: 60 * MINUTE };
const NUL = centimes(0);
const OCTETS = fichierFec({ entete: 'JournalCode|EcritureNum', lignes: ['VT|1', 'VT|2'], totalDebit: NUL, totalCredit: NUL }, { finDeLigne: '\n', marqueOrdreOctets: false, finDeLigneFinale: true });
const SHA = empreinteSha256(OCTETS);
const rapportOk = rapportFec({ octets: OCTETS, ecarts: [], reglesVerifiees: 3, reglesNonExecutees: [], totalDebit: NUL, totalCredit: NUL, nombreLignes: 2, versionLogiciel: 'test', versionPaquet: 'test' }, 3);
const rapportBloquant = { ...rapportOk, telechargementAutorise: false };

type Cfg = { type?: 'fec' | 'etat'; sha?: string; stocke?: Uint8Array | null; rapport?: typeof rapportOk };
function monde(cfg: Cfg = {}) {
  const maintenant = { ms: MAINTENANT };
  const documents = new DepotDocumentsMemoire();
  documents.ajouterVersion(A, { id: 'doc-1', type: cfg.type ?? 'fec', exerciceId: 'ex-1', statut: 'brouillon', sha256: cfg.sha ?? SHA, versionLogiciel: 'test', versionPaquet: 'test', preparePar: 'axion', prepareLe: '2026-01-01T00:00:00Z', resultatControles: 'ok' });
  const journal: LigneJournalFec[] = [];
  const mfa = { acr: 'mfa', authTime: (MAINTENANT - MINUTE) / MS };
  const sessions: Record<string, { revendications?: { acr?: string; authTime?: number }; personneId: string | null; derniereRecuperationMs?: number }> = {
    ok: { revendications: mfa, personneId: 'personne-1' },
    autre: { revendications: mfa, personneId: 'personne-2' },
    sansfacteur: { revendications: { authTime: mfa.authTime }, personneId: 'personne-1' },
    ancienne: { revendications: { acr: 'mfa', authTime: (MAINTENANT - 11 * MINUTE) / MS }, personneId: 'personne-1' },
    recup: { revendications: mfa, personneId: 'personne-1', derniereRecuperationMs: MAINTENANT - MINUTE },
    sanspersonne: { revendications: mfa, personneId: null },
  };
  const liens = creerLiensFec(
    {
      documents,
      stockage: { lire: async (s) => (s === A ? (cfg.stocke === undefined ? OCTETS : cfg.stocke) : null) },
      rapports: { rapport: async () => cfg.rapport ?? rapportOk },
      session: { revendications: async (id) => sessions[id] ?? { personneId: null } },
      journal: { ajouter: async (l) => void journal.push(l) },
      signataire,
      horloge: { maintenantMs: () => maintenant.ms },
    },
    REGLAGES,
  );
  const jeton = async (sessionId = 'ok'): Promise<string> => {
    const r = await liens.demanderLien({ societeId: A, documentId: 'doc-1', sessionId });
    if (r.statut !== 201) throw new Error('lien attendu');
    return r.url.slice(r.url.lastIndexOf('/') + 1);
  };
  return { liens, journal, maintenant, jeton };
}
const demande = (m: ReturnType<typeof monde>, sessionId = 'ok', documentId = 'doc-1') => m.liens.demanderLien({ societeId: A, documentId, sessionId });

describe('lien de téléchargement du FEC', () => {
  it('lien-201-url-et-echeance', async () => {
    const r = await demande(monde());
    expect(r.statut).toBe(201);
    if (r.statut !== 201) return;
    expect(r.url.startsWith('/fec/telechargement/')).toBe(true);
    expect(r.expire_le).toBe(new Date(MAINTENANT + DUREE).toISOString());
    expect(JSON.stringify(r)).not.toContain(CLE);
  });

  it('k4-sans-reauth-401', async () => {
    const m = monde();
    const cas = [['inconnue', 'non_authentifie'], ['sansfacteur', 'mfa_requis'], ['ancienne', 'reauthentification_requise'], ['recup', 'recuperation_recente']];
    for (const [session, code] of cas) expect(await demande(m, session)).toEqual({ statut: 401, code });
  });

  it('k4-lien-expire-410', async () => {
    const m = monde();
    const jeton = await m.jeton();
    for (const delta of [DUREE, DUREE + 1]) {
      m.maintenant.ms = MAINTENANT + delta;
      expect(await m.liens.telecharger({ jeton, societeId: A, sessionId: 'ok' })).toEqual({ statut: 410, code: 'lien_expire' });
    }
    m.maintenant.ms = MAINTENANT + DUREE - 1;
    expect((await m.liens.telecharger({ jeton, societeId: A, sessionId: 'ok' })).statut).toBe(200);
  });

  it('k4-une-ligne-par-telechargement', async () => {
    const m = monde();
    const jeton = await m.jeton();
    const r1 = await m.liens.telecharger({ jeton, societeId: A, sessionId: 'ok' });
    const r2 = await m.liens.telecharger({ jeton, societeId: A, sessionId: 'autre' });
    expect(r1).toEqual({ statut: 200, octets: OCTETS });
    expect(r2.statut).toBe(200);
    expect(m.journal.map((l) => l.personneId)).toEqual(['personne-1', 'personne-2']);
    expect(m.journal[0]).toEqual({ documentId: 'doc-1', societeId: A, personneId: 'personne-1', le: new Date(MAINTENANT).toISOString(), sha256: SHA });
    expect(JSON.stringify(m.journal)).not.toContain(jeton);
    for (const [sessionId, jetonTente] of [['inconnue', jeton], ['sanspersonne', jeton], ['ok', jeton + 'x'], ['ok', '']] as const) {
      await m.liens.telecharger({ jeton: jetonTente, societeId: A, sessionId });
    }
    expect(await m.liens.telecharger({ jeton, societeId: A, sessionId: 'sanspersonne' })).toEqual({ statut: 401, code: 'session_absente' });
    expect(m.journal).toHaveLength(2);
  });

  it('telechargement-refuse-409', async () => {
    expect(await demande(monde({ rapport: rapportBloquant }))).toEqual({ statut: 409, code: 'telechargement_refuse' });
  });

  it('empreinte-differente-409', async () => {
    expect(await demande(monde({ stocke: new Uint8Array([1, 2]) }))).toEqual({ statut: 409, code: 'empreinte_differente' });
    expect(await demande(monde({ stocke: null }))).toEqual({ statut: 409, code: 'empreinte_differente' });
    expect(await demande(monde({ sha: 'a'.repeat(64) }))).toEqual({ statut: 409, code: 'empreinte_differente' });
  });

  it('signature-falsifiee-404', async () => {
    const m = monde();
    const jeton = await m.jeton();
    const dernier = jeton.slice(-1);
    const falsifie = jeton.slice(0, -1) + (dernier === 'A' ? 'B' : 'A');
    for (const j of [falsifie, '', jeton.slice(0, jeton.indexOf('.')), jeton.slice(0, -5), 'a.b.c']) {
      expect(await m.liens.telecharger({ jeton: j, societeId: A, sessionId: 'ok' })).toEqual({ statut: 404, code: 'introuvable' });
    }
    expect(m.journal).toHaveLength(0);
  });

  it('autre-societe-404', async () => {
    const m = monde();
    const jeton = await m.jeton();
    const autre = await m.liens.telecharger({ jeton, societeId: B, sessionId: 'ok' });
    const inexistant = await m.liens.telecharger({ jeton: 'x.y', societeId: B, sessionId: 'ok' });
    expect(autre).toEqual(inexistant);
    expect(autre).toEqual({ statut: 404, code: 'introuvable' });
    expect(await m.liens.demanderLien({ societeId: B, documentId: 'doc-1', sessionId: 'ok' })).toEqual(inexistant);
    expect(m.journal).toHaveLength(0);
  });

  it('duree-invalide', async () => {
    for (const dureeMs of [NaN, Infinity, 0, -1, 1.5]) {
      await expect(creerLienExpirant({ societeId: A, objetId: 'o', maintenantMs: MAINTENANT, dureeMs }, signataire)).rejects.toBeInstanceOf(ErreurLienExpirant);
    }
    const { jeton } = await creerLienExpirant({ societeId: A, objetId: 'o', maintenantMs: MAINTENANT, dureeMs: DUREE }, signataire);
    expect(await lireLienExpirant(jeton, { societeId: A, maintenantMs: MAINTENANT }, signataire)).toEqual({ ok: true, objetId: 'o' });
  });

  it('document-pas-fec-404', async () => {
    const m = monde({ type: 'etat' });
    expect(await demande(m)).toEqual({ statut: 404, code: 'introuvable' });
    expect(await demande(monde(), 'ok', 'doc-inconnu')).toEqual({ statut: 404, code: 'introuvable' });
  });
});
