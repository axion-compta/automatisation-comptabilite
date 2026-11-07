import { describe, expect, it } from 'vitest';
import {
  CONFIANCES, ETATS_PROPOSITION, FOURNISSEURS_CHAT, ISSUES_APPEL_IA, PERSONNES_CHAT, SOURCES_PROPOSITION, genererChat,
  type JeuChat,
} from '../chat.js';

const jeu = genererChat();
const tous = (j: JeuChat) => [...j.conversations, ...j.messages, ...j.propositions, ...j.decisions, ...j.appels];
const nombres = (v: unknown): number[] =>
  typeof v === 'number' ? [v] : v !== null && typeof v === 'object' ? Object.values(v).flatMap(nombres) : [];

describe('donnees fictives du chat', () => {
  it('meme-graine-memes-donnees', () => {
    expect(JSON.stringify(genererChat(42))).toBe(JSON.stringify(genererChat(42)));
    expect(JSON.stringify(genererChat())).toBe(JSON.stringify(jeu));
    expect([jeu.conversations.length, jeu.messages.length, jeu.propositions.length, jeu.decisions.length, jeu.appels.length]).toEqual([4, 20, 5, 10, 10]);
  });
  it('autre-graine-autres-donnees', () => {
    expect(JSON.stringify(genererChat(1))).not.toBe(JSON.stringify(genererChat(2)));
    expect(genererChat(1).conversations.map((c) => c.id)).not.toEqual(genererChat(2).conversations.map((c) => c.id));
  });
  it('deux-societes-separees', () => {
    const soc = new Map(jeu.conversations.map((c) => [c.id, c.societe]));
    expect(jeu.conversations.filter((c) => c.societe === 'soc_a').length).toBe(3);
    expect(jeu.conversations.filter((c) => c.societe === 'soc_b').length).toBe(1);
    for (const c of jeu.conversations) expect(PERSONNES_CHAT[c.societe]).toContain(c.personne);
    for (const m of jeu.messages) {
      expect(soc.get(m.conversation)).toBe(m.societe);
      expect(m.auteur === 'assistant' || PERSONNES_CHAT[m.societe].includes(m.auteur)).toBe(true);
    }
    const prop = new Map(jeu.propositions.map((p) => [p.id, p.societe]));
    for (const p of jeu.propositions) {
      expect(soc.get(p.conversation)).toBe(p.societe);
      expect(jeu.messages.find((m) => m.id === p.message)).toMatchObject({ conversation: p.conversation, societe: p.societe });
    }
    for (const d of jeu.decisions) expect(prop.get(d.proposition)).toBe(d.societe);
    for (const a of jeu.appels) expect(soc.get(a.conversation)).toBe(a.societe);
  });
  it('montants-entiers', () => {
    const n = nombres(tous(jeu));
    expect(n.length).toBeGreaterThan(30);
    expect(n.every((x) => Number.isSafeInteger(x) && x >= 0)).toBe(true);
    expect(jeu.propositions.every((p) => p.montantCentimes >= 100)).toBe(true);
    for (const x of tous(jeu)) for (const d of [(x as { le?: string }).le, (x as { ouverteLe?: string }).ouverteLe]) {
      if (d !== undefined) expect(d).toMatch(/^2031-(0[1-9]|1[0-2])-(0[1-9]|1\d|2[0-8])$/);
    }
  });
  it('identifiants-uniques', () => {
    const ids = tous(jeu).map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    const pref = { conversations: 'cnv_', messages: 'msg_', propositions: 'prp_', decisions: 'dec_', appels: 'app_' } as const;
    for (const [liste, p] of Object.entries(pref)) {
      for (const x of jeu[liste as keyof JeuChat]) expect(x.id).toMatch(new RegExp(`^${p}[0-9a-f]{8}$`));
    }
  });
  it('toutes-les-issues-presentes', () => {
    expect(new Set(jeu.appels.map((a) => a.issue))).toEqual(new Set(ISSUES_APPEL_IA));
    expect(new Set(jeu.propositions.map((p) => p.etat))).toEqual(new Set(ETATS_PROPOSITION));
    expect(new Set(jeu.decisions.map((d) => d.source))).toEqual(new Set(SOURCES_PROPOSITION));
    expect(new Set(jeu.decisions.map((d) => d.confiance))).toEqual(new Set(CONFIANCES));
    expect([...ISSUES_APPEL_IA]).toEqual(['ok', 'secours', 'refus_gardien', 'hors_schema', 'arret']);
    expect([...ETATS_PROPOSITION]).toEqual(['proposee', 'appliquee', 'annulee', 'expiree', 'refusee']);
    expect([...SOURCES_PROPOSITION]).toEqual(['regle_societe', 'historique', 'ia_exemples', 'ia_seule']);
    expect([...CONFIANCES]).toEqual(['sur', 'a_verifier', 'douteux']);
  });
  it('aucun-texte-dans-les-appels', () => {
    const permis = ['id', 'conversation', 'societe', 'issue', 'tokensEntree', 'tokensSortie', 'dureeMs', 'le'];
    for (const a of jeu.appels) {
      expect(Object.keys(a).sort()).toEqual([...permis].sort());
      for (const [k, v] of Object.entries(a)) {
        if (typeof v === 'string' && !['id', 'conversation', 'societe', 'issue', 'le'].includes(k)) throw new Error(k);
        if (typeof v === 'string') expect(v).toMatch(/^[a-z0-9_-]+$/);
      }
    }
  });
  it('noms-fictifs-seulement', () => {
    const brut = JSON.stringify(jeu);
    expect(brut).not.toMatch(/@|\d{9}|FR\d{2}/);
    for (const m of jeu.messages) {
      const nom = FOURNISSEURS_CHAT.find((f) => m.texte.includes(f));
      expect(nom).toBeDefined();
      expect(m.texte.replace(nom as string, '')).toMatch(/^(Facture de {2}à enregistrer|Proposition pour )$/);
    }
    expect(new Set(jeu.propositions.map((p) => p.fournisseur)).size).toBeGreaterThan(0);
    for (const p of jeu.propositions) expect(FOURNISSEURS_CHAT).toContain(p.fournisseur);
  });
});
