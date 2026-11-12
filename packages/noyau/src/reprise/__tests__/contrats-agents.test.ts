import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { NIVEAUX } from '../../chat/types.js';
import { niveauxPermisAgent, verifierOutil } from '../../chat/gardien-sortie.js';
import { AGENTS_REPRISE, trancherChiffre, validerSortie } from '../contrats-agents.js';

const valides: Record<string, unknown> = {
  verificateur_arithmetique: { controles: [{ piece: 'p1', ecartCentimes: 0, signale: false }] },
  plan: { comptes: [{ numero: '606', libelle: 'Achats fictifs', sens: 'debit' }] },
  soldes: { soldes: [{ compte: '512', soldeCentimes: -1250 }] },
  inter_documents: { rapprochements: [{ pieceA: 'p1', pieceB: 'p2', concordent: true }] },
  relecteur: { remarques: [{ cible: 'p1', gravite: 'mineure', texte: 'à relire' }], bloquant: false },
  chef_dossier: { decision: 'continuer', motifs: ['aucun écart'] },
  redacteur: { sections: [{ titre: 'Synthèse', contenu: 'Texte fictif.' }] },
};
const refus = (agent: string, json: unknown) => validerSortie(agent, json);

describe('contrats des agents de reprise', () => {
  it('sept-contrats-declares', () => {
    expect([...AGENTS_REPRISE]).toEqual(Object.keys(valides));
    expect(AGENTS_REPRISE).toHaveLength(7);
    expect(refus('agent_inconnu', {})).toEqual({ ok: false, code: 'hors_contrat', chemin: '$agent' });
    expect(refus('__proto__', {})).toEqual({ ok: false, code: 'hors_contrat', chemin: '$agent' });
    expect(refus('toString', {})).toEqual({ ok: false, code: 'hors_contrat', chemin: '$agent' });
  });

  it('sortie-dans-le-contrat-acceptee', () => {
    for (const [agent, json] of Object.entries(valides)) {
      expect(validerSortie(agent, json), agent).toEqual({ ok: true, sortie: json });
    }
    // listes vides permises, zéro et négatif permis pour un montant
    expect(validerSortie('soldes', { soldes: [] }).ok).toBe(true);
    expect(validerSortie('soldes', { soldes: [{ compte: '1', soldeCentimes: 0 }] }).ok).toBe(true);
  });

  it('champ-en-trop-rejete', () => {
    expect(refus('chef_dossier', { ...(valides['chef_dossier'] as object), extra: 1 })).toEqual({ ok: false, code: 'hors_contrat', chemin: 'extra' });
    expect(refus('soldes', { soldes: [{ compte: '512', soldeCentimes: 1, pirate: true }] })).toEqual({ ok: false, code: 'hors_contrat', chemin: 'soldes[0].pirate' });
    expect(refus('chef_dossier', { decision: 'continuer' })).toEqual({ ok: false, code: 'hors_contrat', chemin: 'motifs' });
    expect(refus('soldes', { soldes: [{ compte: '512' }] })).toEqual({ ok: false, code: 'hors_contrat', chemin: 'soldes[0].soldeCentimes' });
    expect(refus('chef_dossier', JSON.parse('{"decision":"continuer","motifs":[],"constructor":1}'))).toEqual({ ok: false, code: 'hors_contrat', chemin: 'constructor' });
    expect(refus('chef_dossier', JSON.parse('{"decision":"continuer","motifs":[],"toString":1}'))).toEqual({ ok: false, code: 'hors_contrat', chemin: 'toString' });
  });

  it('type-faux-rejete', () => {
    expect(refus('soldes', { soldes: [{ compte: '512', soldeCentimes: 12.5 }] })).toEqual({ ok: false, code: 'hors_contrat', chemin: 'soldes[0].soldeCentimes' });
    for (const faux of ['12', Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53, null]) {
      expect(refus('soldes', { soldes: [{ compte: '512', soldeCentimes: faux }] }).ok, String(faux)).toBe(false);
    }
    expect(refus('relecteur', { remarques: [], bloquant: 'non' })).toEqual({ ok: false, code: 'hors_contrat', chemin: 'bloquant' });
    expect(refus('chef_dossier', { decision: 'au_hasard', motifs: [] })).toEqual({ ok: false, code: 'hors_contrat', chemin: 'decision' });
    expect(refus('chef_dossier', { decision: 'continuer', motifs: 'aucun' })).toEqual({ ok: false, code: 'hors_contrat', chemin: 'motifs' });
    expect(refus('chef_dossier', { decision: 'continuer', motifs: [3] })).toEqual({ ok: false, code: 'hors_contrat', chemin: 'motifs[0]' });
    for (const element of [null, 3, []]) {
      expect(refus('soldes', { soldes: [element] }), String(element)).toEqual({ ok: false, code: 'hors_contrat', chemin: 'soldes[0]' });
    }
    for (const racine of [null, undefined, 3, 'texte', [], [valides['soldes']]]) {
      expect(refus('soldes', racine), String(racine)).toEqual({ ok: false, code: 'hors_contrat', chemin: '$' });
    }
  });

  it('sorte-reprise-sans-niveau-ecriture', () => {
    expect(niveauxPermisAgent('reprise')).toEqual(['L']);
    const base = { outil: 'o', sorteAgent: 'reprise', outilsPermisAgent: ['o'], roleLectureSeule: false } as const;
    expect(verifierOutil({ ...base, niveauOutil: 'L' })).toEqual({ permis: true });
    for (const niveau of NIVEAUX.filter((n) => n !== 'L')) {
      expect(verifierOutil({ ...base, niveauOutil: niveau }).permis, niveau).toBe(false);
    }
    expect(verifierOutil({ ...base, niveauOutil: 'B' })).toEqual({ permis: false, code: 'droit_insuffisant' });
  });

  it('chiffre-tranche-par-le-code', () => {
    // deux agents contre un : la majorité ne décide pas, le recalcul décide
    const propositions = [
      { agent: 'soldes', valeur: centimes(1000) },
      { agent: 'relecteur', valeur: centimes(1000) },
      { agent: 'verificateur_arithmetique', valeur: centimes(1250) },
    ];
    expect(trancherChiffre(propositions, () => centimes(1250))).toEqual({ valeur: 1250, source: 'recalcul', accord: false });
    expect(trancherChiffre(propositions, () => centimes(777))).toEqual({ valeur: 777, source: 'recalcul', accord: false });
    expect(trancherChiffre([{ agent: 'soldes', valeur: centimes(0) }], () => centimes(0))).toEqual({ valeur: 0, source: 'recalcul', accord: true });
    expect(trancherChiffre([{ agent: 'soldes', valeur: centimes(1000) }], () => centimes(0))).toEqual({ valeur: 0, source: 'recalcul', accord: false });
    expect(trancherChiffre([], () => centimes(5))).toEqual({ valeur: 5, source: 'recalcul', accord: true });
    expect(() => trancherChiffre(propositions, () => Number.NaN as never)).toThrow();
  });
});
