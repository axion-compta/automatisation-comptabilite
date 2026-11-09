import { describe, expect, it } from 'vitest';
import { executerAutomatique, verifierListe, type ActionAuto, type PortConsoleAuto, type RegistreAuto } from '../automatique.js';

const REGISTRE: RegistreAuto = {
  'tiers.renommer': { niveau: 'B', reversible: true },
  'ecriture.valider': { niveau: 'B', reversible: false },
  'periode.cloturer': { niveau: 'M', reversible: true },
  'exercice.supprimer': { niveau: 'I', reversible: false },
};
function faux(liste: readonly string[], verdict: unknown = 'automatique') {
  const appels: string[] = [];
  const lignes: Array<{ acteur: string; evenement: string; outil: string; niveau: string }> = [];
  const console_: PortConsoleAuto = {
    lireManifeste: async () => ({ actionsAutomatiquesAutorisees: liste }),
    classerAction: async (outil) => { appels.push(outil); return verdict as 'automatique'; },
  };
  const journal = { noter: (l: { acteur: string; evenement: string; outil: string; niveau: string }) => { lignes.push(l); } };
  return { deps: { console: console_, journal, registre: REGISTRE, agent: 'agent_chat' }, appels, lignes };
}
function action(outil = 'tiers.renommer', niveau: 'B' | 'M' | 'I' = 'B') {
  const trace: string[] = [];
  const a: ActionAuto = { outil, niveau, appliquer: async () => { trace.push('appliquee'); }, annuler: async () => { trace.push('annulee'); } };
  return { a, trace };
}

describe('actions automatiques', () => {
  it('liste-vide-rien-d-automatique', async () => {
    for (const liste of [[], undefined, null, 'tiers.renommer', [''], [42]]) {
      const f = faux(liste as never);
      const { a, trace } = action();
      const r = await executerAutomatique(f.deps, a);
      expect(r.etat).toBe('rien');
      expect(trace).toEqual([]);
      expect(f.appels).toEqual([]);
      expect(f.lignes).toEqual([]);
    }
    const f = faux([]);
    f.deps.console.lireManifeste = async () => { throw new Error('console absente'); };
    expect((await executerAutomatique(f.deps, action().a)).etat).toBe('rien');
  });

  it('niveau-m-refuse-dans-la-liste', async () => {
    for (const nom of ['periode.cloturer', 'exercice.supprimer', 'ecriture.valider', 'outil.inconnu']) {
      expect(() => verifierListe([nom], REGISTRE)).toThrow('liste_refusee');
      const f = faux([nom]);
      const { a, trace } = action(nom, 'M');
      await expect(executerAutomatique(f.deps, a)).rejects.toThrow('liste_refusee');
      expect(trace).toEqual([]);
      expect(f.appels).toEqual([]);
    }
    expect(() => verifierListe(['tiers.renommer'], REGISTRE)).not.toThrow();
    const f = faux(['tiers.renommer']);
    const { a, trace } = action('tiers.renommer', 'M');
    await expect(executerAutomatique(f.deps, a)).rejects.toThrow('niveau_refuse');
    expect(trace).toEqual([]);
  });

  it('brouillon-ne-fait-rien', async () => {
    for (const verdict of ['brouillon', 'autre', '', null, 1, true]) {
      const f = faux(['tiers.renommer'], verdict);
      const { a, trace } = action();
      const r = await executerAutomatique(f.deps, a);
      expect(r.etat).toBe('brouillon');
      expect(trace).toEqual([]);
      expect(f.lignes).toEqual([]);
    }
    const f = faux(['tiers.renommer']);
    f.deps.console.classerAction = async () => { throw new Error('console absente'); };
    const { a, trace } = action();
    expect((await executerAutomatique(f.deps, a)).etat).toBe('brouillon');
    expect(trace).toEqual([]);
  });

  it('automatique-journalise-et-annulable', async () => {
    const f = faux(['tiers.renommer']);
    const { a, trace } = action();
    const r = await executerAutomatique(f.deps, a);
    expect(r.etat).toBe('automatique');
    expect(trace).toEqual(['appliquee']);
    expect(f.appels).toEqual(['tiers.renommer']);
    expect(f.lignes).toEqual([{ acteur: 'agent:agent_chat', evenement: 'chat.automatique', outil: 'tiers.renommer', niveau: 'B' }]);
    await r.annuler?.();
    await r.annuler?.();
    expect(trace).toEqual(['appliquee', 'annulee']);
    expect(f.lignes.map((l) => l.evenement)).toEqual(['chat.automatique', 'chat.annulation']);
    expect(f.lignes.every((l) => l.acteur === 'agent:agent_chat')).toBe(true);
  });

  it('journal-en-echec-annule-l-action', async () => {
    const f = faux(['tiers.renommer']);
    f.deps.journal.noter = () => { throw new Error('journal ferme'); };
    const { a, trace } = action();
    await expect(executerAutomatique(f.deps, a)).rejects.toThrow('journal ferme');
    expect(trace).toEqual(['appliquee', 'annulee']);
  });

  it('nom-d-agent-invalide-refuse', async () => {
    for (const agent of ['', 'Agent X', 'a:b']) {
      const f = faux(['tiers.renommer']);
      const { a, trace } = action();
      await expect(executerAutomatique({ ...f.deps, agent }, a)).rejects.toThrow('agent_invalide');
      expect(trace).toEqual([]);
    }
  });
});
