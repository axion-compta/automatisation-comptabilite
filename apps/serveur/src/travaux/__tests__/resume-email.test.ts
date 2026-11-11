import { describe, expect, it } from 'vitest';
import { creerFauxPlanificateur } from '../../../../../packages/noyau/src/exploitation/planificateur.js';
import {
  creerTravailResume, dateLocale, desinscrire, inscrireTravailResume, instantEnvoi,
  type Courriel, type PersonneResume, type PortJetons, type PortResume,
} from '../resume-email.js';

function monde(personnes: PersonneResume[], opts: { accesSortant?: boolean; echecs?: number } = {}) {
  const envoyes: Courriel[] = [];
  const pris = new Set<string>();
  const journal: string[] = [];
  let echecsRestants = opts.echecs ?? 0;
  let n = 0;
  const jetonsValides = new Map<string, string>();
  const resume: PortResume = {
    personnes: async () => personnes,
    dejaEnvoyes: async () => [...pris].map((k) => ({ personneId: k.split('|')[0] ?? '', dateEnvoi: k.split('|')[1] ?? '' })),
    reserver: async (p, d) => (pris.has(`${p}|${d}`) ? false : (pris.add(`${p}|${d}`), true)),
    liberer: async (p, d) => { pris.delete(`${p}|${d}`); },
    journaliser: async (l) => { journal.push(`${l.personneId}:${l.issue}`); },
  };
  const jetons: PortJetons = {
    creer: async (p) => { n += 1; const j = `jeton${n}`; jetonsValides.set(j, p); return j; },
    consommer: async (j) => { const p = jetonsValides.get(j) ?? null; jetonsValides.delete(j); return p; },
  };
  const travail = creerTravailResume({
    resume, jetons, accesSortant: opts.accesSortant ?? true, baseLiens: 'https://app.exemple.fr',
    envoi: { envoyer: async (c) => { if (echecsRestants > 0) { echecsRestants -= 1; throw new Error('x'); } envoyes.push(c); } },
  });
  return { travail, envoyes, journal, jetons };
}
const alice: PersonneResume = {
  personneId: 'p1', adresse: 'alice@exemple.fr', actifs: true, comptes: { a_valider: 3, echeance: 1 },
};

describe('conversion de l’heure choisie', () => {
  it('07:30 Paris = 06:30 UTC en hiver, 05:30 UTC en été', () => {
    expect(new Date(instantEnvoi('2026-01-15', 7, 30, 'Europe/Paris')).toISOString()).toBe('2026-01-15T06:30:00.000Z');
    expect(new Date(instantEnvoi('2026-07-15', 7, 30, 'Europe/Paris')).toISOString()).toBe('2026-07-15T05:30:00.000Z');
  });
  it('le jour du changement d’heure (29/03/2026) : 07:30 Paris = 05:30 UTC', () => {
    expect(new Date(instantEnvoi('2026-03-29', 7, 30, 'Europe/Paris')).toISOString()).toBe('2026-03-29T05:30:00.000Z');
  });
  it('date locale : 23:30 UTC est déjà le lendemain à Paris', () => {
    expect(dateLocale('2026-01-15T23:30:00Z', 'Europe/Paris')).toBe('2026-01-16');
  });
});

describe('résumé quotidien', () => {
  it('rien à faire : pas d’envoi', async () => {
    const m = monde([{ ...alice, comptes: {} }]);
    expect(await m.travail.passer('2026-01-15T07:00:00Z')).toBe(0);
    expect(m.envoyes).toHaveLength(0);
  });
  it('avant l’heure choisie : pas d’envoi ; à l’heure : un envoi', async () => {
    const m = monde([alice]);
    await m.travail.passer('2026-01-15T06:29:00Z');
    expect(m.envoyes).toHaveLength(0);
    await m.travail.passer('2026-01-15T06:30:00Z');
    expect(m.envoyes).toHaveLength(1);
    expect(m.envoyes[0]?.destinataire).toBe('alice@exemple.fr');
  });
  it('jamais deux envois le même jour, même après coupure et reprise', async () => {
    const m = monde([alice]);
    await m.travail.passer('2026-01-15T06:30:00Z');
    await m.travail.passer('2026-01-15T06:31:00Z');
    await m.travail.passer('2026-01-15T12:00:00Z');
    expect(m.envoyes).toHaveLength(1);
    await m.travail.passer('2026-01-16T06:30:00Z');
    expect(m.envoyes).toHaveLength(2);
  });
  it('reprise tardive : un seul envoi au premier passage après l’heure', async () => {
    const m = monde([alice]);
    await m.travail.passer('2026-01-15T10:00:00Z');
    expect(m.envoyes).toHaveLength(1);
  });
  it('personne désactivée ou sans accès sortant : inactif', async () => {
    const a = monde([{ ...alice, actifs: false }]);
    await a.travail.passer('2026-01-15T10:00:00Z');
    const b = monde([alice], { accesSortant: false });
    await b.travail.passer('2026-01-15T10:00:00Z');
    expect(a.envoyes.length + b.envoyes.length).toBe(0);
  });
  it('un échec d’envoi libère le jour : nouvel essai au passage suivant, un seul envoi au final', async () => {
    const m = monde([alice], { echecs: 1 });
    await expect(m.travail.passer('2026-01-15T06:30:00Z')).rejects.toThrow('envois_en_echec');
    await m.travail.passer('2026-01-15T06:31:00Z');
    expect(m.envoyes).toHaveLength(1);
    expect(m.journal).toEqual(['p1:echec', 'p1:envoye']);
  });
  it('le rendu ne contient ni montant ni nom de tiers, ni mot interdit', async () => {
    const m = monde([{ ...alice, comptes: { a_valider: 1, echeance: 2, urgent: 1, cabinet: 1 } }]);
    await m.travail.passer('2026-01-15T10:00:00Z');
    const { texte, sujet } = m.envoyes[0] as Courriel;
    const tout = `${sujet}\n${texte}`;
    expect(tout).not.toMatch(/€|EUR|euro/i);
    expect(tout.replace(/https?:\/\/\S+/g, '')).not.toMatch(/\d+[.,]\d{2}/);
    expect(tout).not.toMatch(/conforme|sans erreur|garanti|juriste|PDP/i);
    expect(texte).toContain('- 1 élément à valider');
    expect(texte).toContain('- 2 échéances proches');
  });
  it('désinscription : le jeton ne sert qu’une fois', async () => {
    const m = monde([alice]);
    await m.travail.passer('2026-01-15T10:00:00Z');
    const jeton = /desinscription\/(\S+)/.exec(m.envoyes[0]?.texte ?? '')?.[1] ?? '';
    const coupes: string[] = [];
    expect(await desinscrire(m.jetons, async (p) => { coupes.push(p); }, jeton)).toBe(true);
    expect(await desinscrire(m.jetons, async (p) => { coupes.push(p); }, jeton)).toBe(false);
    expect(coupes).toEqual(['p1']);
  });
  it('s’inscrit au planificateur en UTC et envoie via un passage', async () => {
    const m = monde([alice]);
    const { planificateur, avancerJusqua } = creerFauxPlanificateur();
    inscrireTravailResume(planificateur, m.travail);
    await avancerJusqua('2026-01-15T06:31:00Z');
    expect(m.envoyes).toHaveLength(1);
  });
});
