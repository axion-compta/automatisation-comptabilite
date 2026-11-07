import { describe, expect, it } from 'vitest';
import { recevoir, type ContexteCourriel, type MessageAnalyse, type PieceJointe } from '../recevoir.js';
import { AntivirusMemoire, DepotMemoire, HorlogeFixe, StockageMemoire } from '../../ports-memoire.js';
import type { ContexteEntree } from '../../etape-entree.js';

const LIMITE = 1_000_000;
const DOMAINE = 'depot.exemple.fr';
const SOCIETE = 'soc-fictive';
const JETON = 'a'.repeat(16) + 'b'.repeat(16);
const JETON_REVOQUE = 'c'.repeat(32);
const texte = (t: string): Uint8Array => new TextEncoder().encode(t);
const pdf = (n: number): PieceJointe => ({ nom: `facture-${n}.pdf`, octets: texte(`%PDF-1.7 fictif ${n}`) });

const message = (extra: Partial<MessageAnalyse> = {}): MessageAnalyse => ({
  messageId: 'msg-1@exemple.fr', destinataire: `pieces+${JETON}@${DOMAINE}`, expediteur: 'fournisseur@exemple.fr',
  spf: 'pass', dkim: 'pass', corps: 'Bonjour, ci-joint.', pieces: [pdf(1), pdf(2), pdf(3)], ...extra,
});

function monter(analyse: MessageAnalyse | null = message(), connus: string[] = ['fournisseur@exemple.fr']) {
  const depot = new DepotMemoire();
  const stockage = new StockageMemoire();
  const gardes: MessageAnalyse[] = [];
  const entree: ContexteEntree = {
    societeId: SOCIETE, nouvelId: (() => { let i = 0; return () => `p${++i}`; })(), stockage, depot, horloge: new HorlogeFixe('2026-01-01T00:00:00.000Z'),
    antivirus: new AntivirusMemoire(), decompresser: () => new Uint8Array(),
    reglage: { archive: { ratioMax: 100, totalMaxOctets: LIMITE, nombreMax: 500 }, image: { coteMax: 5000, pixelsMax: 10_000_000 }, limites: { tailleMaxOctets: LIMITE, pagesMaxFileNormale: 10, pagesMaxModele: 10 }, delaisRelanceMinutes: [5] },
  };
  const ctx: ContexteCourriel = {
    domaine: DOMAINE,
    analyseur: { async analyser(_o, format) { return format === 'eml' || format === 'msg' ? analyse : null; } },
    jetons: { async resoudre(j) { return j === JETON ? { societeId: SOCIETE, revoque: false } : j === JETON_REVOQUE ? { societeId: SOCIETE, revoque: true } : null; } },
    expediteurConnu: async (_s, adresse) => connus.includes(adresse),
    corpsEstFacture: (corps) => corps.includes('FACTURE'),
    quarantaine: { async garder(_s, m) { gardes.push(m); } },
    entree: () => entree,
  };
  return { ctx, depot, stockage, gardes };
}

describe('réception de courriel (T-LEC-5)', () => {
  it('trois-pdf-trois-pieces-liees', async () => {
    const { ctx, depot } = monter();
    const r = await recevoir(texte('brut'), 'eml', ctx);
    expect(r.statut).toBe('recu');
    expect(r.societeId).toBe(SOCIETE);
    expect(r.messageId).toBe('msg-1@exemple.fr');
    expect(r.pieces).toHaveLength(3);
    expect(new Set(r.pieces.map((p) => p.piece.id)).size).toBe(3);
    expect(r.pieces.every((p) => p.piece.etat === 'quarantaine')).toBe(true);
    expect(depot.nombre()).toBe(3);
    expect(r.origine).toBe('verifiee');
    expect(r.contexteCorps).toBe('Bonjour, ci-joint.');
  });

  it('format-msg-accepte-autre-format-refuse', async () => {
    const { ctx } = monter();
    expect((await recevoir(texte('brut'), 'msg', ctx)).pieces).toHaveLength(3);
    const r = await recevoir(texte('brut'), 'doc', ctx);
    expect(r).toMatchObject({ statut: 'refuse', code: 'message_illisible', pieces: [] });
  });

  it('dkim-en-echec-quarantaine', async () => {
    for (const echec of [{ dkim: 'fail' as const }, { spf: 'fail' as const }]) {
      const m = message(echec);
      const { ctx, depot, stockage, gardes } = monter(m);
      const r = await recevoir(texte('brut'), 'eml', ctx);
      expect(r).toMatchObject({ statut: 'quarantaine', pieces: [], origine: 'origine_non_verifiee', contexteCorps: '' });
      expect(gardes).toEqual([m]);
      expect(depot.nombre()).toBe(0);
      expect(stockage.taille()).toBe(0);
    }
  });

  it('expediteur-inconnu-origine-non-verifiee', async () => {
    const { ctx } = monter(message({ expediteur: 'inconnu@exemple.fr' }));
    const r = await recevoir(texte('brut'), 'eml', ctx);
    expect(r.statut).toBe('recu');
    expect(r.origine).toBe('origine_non_verifiee');
    expect(r.pieces).toHaveLength(3);
  });

  it('expediteur-connu-sans-authentification-non-verifiee', async () => {
    const { ctx } = monter(message({ spf: 'none', dkim: 'none' }));
    const r = await recevoir(texte('brut'), 'eml', ctx);
    expect(r.statut).toBe('recu');
    expect(r.origine).toBe('origine_non_verifiee');
  });

  it('facture-dans-le-corps', async () => {
    const { ctx } = monter(message({ corps: 'FACTURE fictive à régler', pieces: [] }));
    const r = await recevoir(texte('brut'), 'eml', ctx);
    expect(r.motifs).toEqual(['facture_dans_corps']);
    expect(r.aVerifier).toBe(true);
    const sans = await recevoir(texte('brut'), 'eml', monter().ctx);
    expect(sans.motifs).toEqual([]);
    expect(sans.aVerifier).toBe(false);
  });

  it('jeton-revoque-refuse', async () => {
    for (const destinataire of [`pieces+${JETON_REVOQUE}@${DOMAINE}`, `pieces+${'d'.repeat(32)}@${DOMAINE}`, `pieces+${JETON}@autre.exemple.fr`, `pieces+court@${DOMAINE}`, `${SOCIETE}@${DOMAINE}`]) {
      const { ctx, depot, gardes } = monter(message({ destinataire }));
      const r = await recevoir(texte('brut'), 'eml', ctx);
      expect(r).toMatchObject({ statut: 'refuse', code: 'jeton_invalide', pieces: [], origine: 'origine_non_verifiee' });
      expect(depot.nombre()).toBe(0);
      expect(gardes).toEqual([]);
    }
  });

  it('adresse-en-majuscules-reconnue', async () => {
    const { ctx } = monter(message({ destinataire: `Pieces+${JETON}@${DOMAINE.toUpperCase()}` }));
    expect((await recevoir(texte('brut'), 'eml', ctx)).statut).toBe('recu');
  });
});
