import { describe, expect, it } from 'vitest';
import { empreinteSha256 } from '../../../../../packages/noyau/src/documents/empreinte.js';
import { composerPaquet, ErreurPaquet } from '../../../../../packages/noyau/src/exports/paquet.js';
import { messagesDeclarations } from '../../../../../packages/textes/src/documents/declarations.js';
import {
  envoyerLienComptable, ErreurEnvoiComptable, lireExportComptable, ouvrirLienComptable, preparerExportComptable,
  type LienEnregistre, type PaquetComptable, type TraceComptable,
} from '../envoi-comptable.js';

const A = 'societe-a';
const B = 'societe-b';
const CAMILLE = 'camille.fictif@exemple.fr';
const MS = 1000;
const MINUTE = 60 * MS;
const T0 = Date.UTC(2026, 0, 15, 10, 0, 0);
const DUREE = 5 * MINUTE;
const REGLAGES = { reauthMaxMs: 10 * MINUTE, attenteApresRecuperationMs: 60 * MINUTE };
const FORMAT = { separateurCsv: ';', finDeLigne: '\n' };
const BASE_URL = 'https://exemple.fr/lien/';
const enc = (t: string) => new TextEncoder().encode(t);
const piece = (ref: string) => ({ pieceRef: ref, ecritureIds: [`E-${ref}`], nom: `${ref}.jpg`, octets: enc(`photo ${ref}`), empreinteOriginale: empreinteSha256(enc(`photo ${ref}`)) });
const ENTREE = { mode: 'autonome', exerciceStatut: 'cloture', travail: false, documents: [], pieces: [piece('P1'), piece('P2'), piece('P3')] } as never;
const RECENT = { acr: 'mfa', authTime: (T0 - MINUTE) / MS };
const ANCIEN = { acr: 'mfa', authTime: (T0 - 11 * MINUTE) / MS };

function monde(courrielEnEchec = false) {
  const paquets = new Map<string, PaquetComptable>();
  const liens: LienEnregistre[] = [];
  const mails: { a: string; url: string; expireLeMs: number }[] = [];
  const traces: { societeId: string; trace: TraceComptable }[] = [];
  const ports = {
    paquets: {
      enregistrer: async (s: string, p: PaquetComptable) => void paquets.set(`${s}/${p.id}`, p),
      lire: async (s: string, id: string) => paquets.get(`${s}/${id}`) ?? null,
    },
    liens: {
      enregistrer: async (l: LienEnregistre) => void liens.push(l),
      parEmpreinte: async (e: string) => liens.find((l) => l.empreinteJeton === e) ?? null,
    },
    courriel: {
      envoyer: async (m: { a: string; url: string; expireLeMs: number }) => {
        if (courrielEnEchec) throw new Error('panne');
        mails.push(m);
      },
    },
    historique: { ajouter: async (societeId: string, trace: TraceComptable) => void traces.push({ societeId, trace }) },
  };
  return { ports, paquets, liens, mails, traces };
}
const demande = (o: object = {}) => ({
  societeId: A, paquetId: 'paq-1', destinataire: CAMILLE, par: 'personne-1', revendications: RECENT,
  maintenantMs: T0, reglagesConnexion: REGLAGES, dureeLienMs: DUREE, baseUrl: BASE_URL, ...o,
});
async function pret(courrielEnEchec = false) {
  const m = monde(courrielEnEchec);
  await preparerExportComptable({ societeId: A, exerciceId: 'ex-1', entree: ENTREE, options: FORMAT, id: 'paq-1', maintenantMs: T0 }, m.ports);
  return m;
}
const jetonDe = (m: ReturnType<typeof monde>) => (m.mails[0]?.url ?? '').slice(BASE_URL.length);

describe('envoi au comptable', () => {
  it('x1-paquet-prepare-et-relu', async () => {
    const m = await pret();
    const attendu = composerPaquet(ENTREE, FORMAT);
    const lu = await lireExportComptable(m.ports, A, 'paq-1');
    expect(lu?.indexPieces).toBe(attendu.indexPieces);
    expect(lu?.indexPieces.trim().split('\n')).toHaveLength(4);
    expect(lu?.manifeste).toBe(attendu.manifeste);
    expect(lu?.creeLe).toBe(T0);
    const r = await preparerExportComptable({ societeId: A, exerciceId: 'ex-1', entree: ENTREE, options: FORMAT, id: 'paq-2', maintenantMs: T0 }, m.ports);
    expect(r).toEqual({ id: 'paq-2', nbFichiers: 4, exclus: [] });
    const mauvaise = { ...(ENTREE as object), pieces: [{ ...piece('P1'), ecritureIds: [] }] } as never;
    await expect(preparerExportComptable({ societeId: A, exerciceId: 'ex-1', entree: mauvaise, options: FORMAT, id: 'paq-3', maintenantMs: T0 }, m.ports)).rejects.toBeInstanceOf(ErreurPaquet);
    expect(await lireExportComptable(m.ports, A, 'paq-3')).toBeNull();
  });

  it('x2-envoi-apres-reauth-trace-envoye', async () => {
    const m = await pret();
    expect(await envoyerLienComptable(demande(), m.ports)).toEqual({ ok: true, expireLeMs: T0 + DUREE });
    expect(m.mails).toHaveLength(1);
    expect(m.mails[0]?.a).toBe(CAMILLE);
    expect(m.mails[0]?.url.startsWith(BASE_URL)).toBe(true);
    expect(m.mails[0]?.expireLeMs).toBe(T0 + DUREE);
    expect(m.traces).toEqual([{ societeId: A, trace: { type: 'envoi_comptable', par: 'personne-1', leMs: T0, paquetId: 'paq-1' } }]);
  });

  it('sans-reauth-refuse-ni-mail-ni-trace', async () => {
    const m = await pret();
    expect(await envoyerLienComptable(demande({ revendications: ANCIEN }), m.ports)).toEqual({ ok: false, code: 'reauthentification_requise' });
    expect(await envoyerLienComptable(demande({ revendications: undefined }), m.ports)).toEqual({ ok: false, code: 'non_authentifie' });
    expect(m.mails).toHaveLength(0);
    expect(m.traces).toHaveLength(0);
    expect(m.liens).toHaveLength(0);
  });

  it('x3-lien-expire-410', async () => {
    const m = await pret();
    await envoyerLienComptable(demande(), m.ports);
    const jeton = jetonDe(m);
    const attendu = { etat: 'expire', code: 'lien_expire' };
    expect(await ouvrirLienComptable(jeton, T0 + DUREE, m.ports)).toEqual(attendu);
    expect(await ouvrirLienComptable(jeton, T0 + DUREE + 1, m.ports)).toEqual(attendu);
    expect((await ouvrirLienComptable(jeton, T0 + DUREE - 1, m.ports)).etat).toBe('ok');
    expect(Object.keys(messagesDeclarations)).toContain('lien_expire');
    expect(m.traces.filter((t) => t.trace.type === 'ouverture_lien_comptable')).toHaveLength(1);
  });

  it('lien-valide-ouvre-le-paquet-et-trace', async () => {
    const m = await pret();
    await envoyerLienComptable(demande(), m.ports);
    const r = await ouvrirLienComptable(jetonDe(m), T0 + MINUTE, m.ports);
    expect(r.etat === 'ok' && r.paquet.id).toBe('paq-1');
    expect(m.traces.at(-1)).toEqual({ societeId: A, trace: { type: 'ouverture_lien_comptable', leMs: T0 + MINUTE, paquetId: 'paq-1' } });
  });

  it('jeton-inconnu', async () => {
    const m = await pret();
    await envoyerLienComptable(demande(), m.ports);
    expect(await ouvrirLienComptable('jeton-inventé', T0, m.ports)).toEqual({ etat: 'inconnu' });
    expect(await ouvrirLienComptable('', T0, m.ports)).toEqual({ etat: 'inconnu' });
    expect(m.traces.filter((t) => t.trace.type === 'ouverture_lien_comptable')).toHaveLength(0);
  });

  it('jeton-jamais-stocke-en-clair', async () => {
    const m = await pret();
    await envoyerLienComptable(demande(), m.ports);
    const jeton = jetonDe(m);
    expect(jeton.length).toBeGreaterThan(0);
    expect(m.liens[0]?.empreinteJeton).toMatch(/^[0-9a-f]{64}$/);
    for (const v of [m.liens, m.traces, [...m.paquets.values()]]) expect(JSON.stringify(v)).not.toContain(jeton);
    await envoyerLienComptable(demande(), m.ports);
    expect(m.mails[1]?.url).not.toBe(m.mails[0]?.url);
  });

  it('autre-societe-ne-voit-ni-n-envoie', async () => {
    const m = await pret();
    expect(await lireExportComptable(m.ports, B, 'paq-1')).toBeNull();
    expect(await envoyerLienComptable(demande({ societeId: B }), m.ports)).toEqual({ ok: false, code: 'paquet_introuvable' });
    expect(m.mails).toHaveLength(0);
    expect(m.traces).toHaveLength(0);
  });

  it('mail-en-echec-aucune-trace', async () => {
    const m = await pret(true);
    await expect(envoyerLienComptable(demande(), m.ports)).rejects.toThrow('panne');
    expect(m.traces).toHaveLength(0);
  });

  it('parametres-invalides', async () => {
    const m = await pret();
    for (const dureeLienMs of [Number.NaN, Infinity, 0, -1, 1.5]) {
      await expect(envoyerLienComptable(demande({ dureeLienMs }), m.ports)).rejects.toMatchObject({ code: 'duree_invalide' });
    }
    for (const maintenantMs of [Number.NaN, Infinity, -1, 0.5]) {
      await expect(envoyerLienComptable(demande({ maintenantMs }), m.ports)).rejects.toBeInstanceOf(ErreurEnvoiComptable);
      await expect(ouvrirLienComptable('x', maintenantMs, m.ports)).rejects.toMatchObject({ code: 'instant_invalide' });
    }
    for (const destinataire of ['', 'camille.fictif', 'camille@exemple', '@exemple.fr', 'a b@exemple.fr']) {
      expect(await envoyerLienComptable(demande({ destinataire }), m.ports)).toEqual({ ok: false, code: 'destinataire_invalide' });
    }
    expect(m.mails).toHaveLength(0);
    expect(m.traces).toHaveLength(0);
  });
});
