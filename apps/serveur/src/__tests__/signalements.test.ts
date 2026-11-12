import { describe, expect, it } from 'vitest';
import { creerFauxPlanificateur } from '../../../../packages/noyau/src/exploitation/planificateur.js';
import { creerFauxAlertes } from '../../../../packages/noyau/src/exploitation/port-alerte.js';
import { rapportOutilErreurs } from '../../../../packages/noyau/src/securite/signalements.js';
import {
  ErreurSignalement, TEXTES_SIGNALEMENT, dureeEnVigueur, enregistrerSignalement, inscrirePurgeSignalements, purgerSignalements,
  type AlerteSignalements, type DemandeSignalement, type LigneParametre, type Signalement,
} from '../securite/signalements.js';

const CORR = '123e4567-e89b-42d3-a456-426614174000';
const JOUR_MS = 24 * 60 * 60 * 1000;
const NB_JOURS = 5; // durée fictive propre au test
const MAINTENANT = '2026-06-15T03:00:00Z';
const ligneParam = (dureeJours: number | null, surcharge: Partial<LigneParametre> = {}): LigneParametre => ({
  dateEffet: '2026-01-01', dureeJours, source: 'source-inventee', ...surcharge,
});
const avant = (ms: number): string => new Date(Date.parse(MAINTENANT) - ms).toISOString();
const sig = (id: string, creeLe: string, societeId = 'societe-a'): Signalement => ({
  societeId, signalementId: id, personneId: 'personne-1', nature: 'affichage', etat: 'ouvert', creeLe, correlationId: CORR,
});

function monde(initial: Signalement[], params: Record<string, LigneParametre[]>) {
  const lignes = [...initial];
  const { port: alerte, recues } = creerFauxAlertes<AlerteSignalements>();
  const p = {
    societes: ['societe-a', 'societe-b'], alerte,
    depot: {
      ajouter: async (s: Signalement) => { lignes.push(s); },
      lister: async (soc: string) => lignes.filter((s) => s.societeId === soc),
      supprimer: async (soc: string, ids: readonly string[]) => {
        for (const id of ids) {
          const i = lignes.findIndex((s) => s.societeId === soc && s.signalementId === id);
          if (i >= 0) lignes.splice(i, 1);
        }
      },
    },
    parametre: { lire: async (soc: string) => params[soc] ?? [] },
  };
  return { p, lignes, recues };
}

describe('signalements', () => {
  it('erreur-et-signalement-meme-correlation', async () => {
    const { p, lignes } = monde([], {});
    const rapport = rapportOutilErreurs({ correlation_id: CORR, route: '/ecritures/{id}', code: 'ERREUR' });
    const s = await enregistrerSignalement(
      p.depot, { societeId: 'societe-a', personneId: 'personne-1', nature: 'affichage', correlationId: rapport.correlation_id,
        ecritureId: 'ecr-1' } as DemandeSignalement, // clé en trop : ne doit pas être enregistrée
      new Date(MAINTENANT), () => 'sig-1',
    );
    expect(s.correlationId).toBe(rapport.correlation_id);
    expect(lignes).toHaveLength(1);
    expect(Object.keys(lignes[0] as object).sort()).toEqual( // aucune clé vers les écritures
      ['correlationId', 'creeLe', 'etat', 'nature', 'personneId', 'signalementId', 'societeId']);
    await expect(enregistrerSignalement(p.depot, { societeId: 'societe-a', personneId: 'personne-1', nature: 'x', correlationId: 'inconnu' },
      new Date(MAINTENANT), () => 'sig-2')).rejects.toBeInstanceOf(ErreurSignalement);
    expect(lignes).toHaveLength(1);
  });

  it('purge-autour-de-la-duree', async () => {
    const duree = NB_JOURS * JOUR_MS;
    const { p, lignes, recues } = monde(
      [sig('vieux', avant(duree + 1)), sig('limite', avant(duree)), sig('recent', avant(duree - 1)), sig('autre-societe', avant(duree * 2), 'societe-b')],
      { 'societe-a': [ligneParam(NB_JOURS)], 'societe-b': [ligneParam(NB_JOURS * 4)] });
    expect(await purgerSignalements(p, MAINTENANT)).toBe(1);
    expect(lignes.map((s) => s.signalementId).sort()).toEqual(['autre-societe', 'limite', 'recent']);
    expect(recues).toEqual([]);
  });

  it('parametre-absent-aucune-purge', async () => {
    const vieux = sig('vieux', avant(1000 * JOUR_MS));
    const { p, lignes, recues } = monde([vieux, sig('vieux-b', avant(1000 * JOUR_MS), 'societe-b')], { 'societe-b': [ligneParam(null)] });
    expect(await purgerSignalements(p, MAINTENANT)).toBe(0);
    expect(lignes).toHaveLength(2);
    expect(recues).toEqual([
      { code: 'parametre_signalements_absent', societeId: 'societe-a' },
      { code: 'parametre_signalements_absent', societeId: 'societe-b' },
    ]);
  });

  it('paramètre daté : futur, sans source ou ancien ignorés ; le plus récent en vigueur gagne', () => {
    const lignes = [ligneParam(NB_JOURS), ligneParam(NB_JOURS + 1, { dateEffet: '2026-03-01' }),
      ligneParam(NB_JOURS + 2, { dateEffet: '2026-09-01' }), ligneParam(NB_JOURS + 3, { dateEffet: '2026-04-01', source: '  ' })];
    expect(dureeEnVigueur(lignes, '2026-06-15')).toBe(NB_JOURS + 1);
    expect(dureeEnVigueur(lignes, '2025-12-31')).toBeUndefined();
    expect(dureeEnVigueur([ligneParam(-1)], '2026-06-15')).toBeUndefined();
    for (const d of [NaN, Infinity, 1.5]) expect(dureeEnVigueur([ligneParam(d)], '2026-06-15')).toBeUndefined();
  });

  it('durée infinie : aucune purge, alerte, les sociétés suivantes sont traitées', async () => {
    const { p, lignes, recues } = monde([sig('vieux', avant(1000 * JOUR_MS)), sig('vieux-b', avant(1000 * JOUR_MS), 'societe-b')],
      { 'societe-a': [ligneParam(Infinity)], 'societe-b': [ligneParam(NB_JOURS)] });
    expect(await purgerSignalements(p, MAINTENANT)).toBe(1);
    expect(lignes.map((s) => s.signalementId)).toEqual(['vieux']);
    expect(recues).toEqual([{ code: 'parametre_signalements_absent', societeId: 'societe-a' }]);
  });

  it.each(['societeId', 'personneId', 'nature'] as const)('champ vide refusé : %s', async (champ) => {
    for (const vide of ['', '   ']) {
      const { p, lignes } = monde([], {});
      const demande = { societeId: 'societe-a', personneId: 'personne-1', nature: 'affichage', correlationId: CORR, [champ]: vide };
      await expect(enregistrerSignalement(p.depot, demande, new Date(MAINTENANT), () => 'sig-x')).rejects.toMatchObject({ code: 'champ_vide' });
      expect(lignes).toHaveLength(0);
    }
  });

  it('date illisible : jamais purgé, mais signalé par une alerte', async () => {
    const { p, lignes, recues } = monde([sig('casse', 'pas-une-date'), sig('vieux', avant(NB_JOURS * JOUR_MS + 1))],
      { 'societe-a': [ligneParam(NB_JOURS)], 'societe-b': [ligneParam(NB_JOURS)] });
    expect(await purgerSignalements(p, MAINTENANT)).toBe(1);
    expect(lignes.map((s) => s.signalementId)).toEqual(['casse']);
    expect(recues).toEqual([{ code: 'signalements_illisibles', societeId: 'societe-a', nombre: 1 }]);
  });

  it('purge quotidienne inscrite au planificateur, une seule fois par jour', async () => {
    const { p, lignes } = monde([sig('vieux', avant(NB_JOURS * JOUR_MS * 3))], { 'societe-a': [ligneParam(NB_JOURS)] });
    const f = creerFauxPlanificateur();
    inscrirePurgeSignalements(f.planificateur, p);
    const r = await f.avancerJusqua('2026-06-15T10:00:00Z');
    expect(r.map((x) => x.etat)).toEqual(['fait']);
    expect(r[0]?.passageId).toBe('purge-signalements@2026-06-15T03:00:00Z');
    expect(lignes).toHaveLength(0);
    expect((await f.avancerJusqua('2026-06-15T11:00:00Z')).map((x) => x.etat)).toEqual(['deja_fait']);
  });

  it('textes-sans-delai-ni-mot-interdit', () => {
    const interdits = [`${'con'}${'forme'}`, `${'sans '}${'erreur'}`, `${'garan'}${'ti'}`, `${'jur'}${'iste'}`, `${'P'}${'DP'}`];
    const delai = /\d|\b(jours?|semaines?|mois|ans?|heures?|minutes?|délais?)\b/i;
    for (const t of Object.values(TEXTES_SIGNALEMENT)) {
      expect(t).not.toMatch(delai);
      for (const m of interdits) expect(t.toLowerCase()).not.toContain(m.toLowerCase());
    }
  });
});
