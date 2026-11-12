import { readFileSync } from 'node:fs';
import { verifierRequeteSociete } from '../../securite/societe.js';
import { describe, expect, it } from 'vitest';
import { COUVERTURE, ENONCE_ABSENT, SOC_MIENNE, SOC_SOEUR, sessionDuRole } from './generateur.js';

const sql = readFileSync(new URL('../../base/migrations/092-securite.sql', import.meta.url), 'utf8').replace(/--[^\n]*/g, '');

describe('cas C01 à C25 @isolation', () => {
  it('chaque-cas-est-couvert-ou-renvoye-par-ecrit', () => {
    const attendus = Array.from({ length: 25 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`);
    expect(Object.keys(COUVERTURE).sort()).toEqual(attendus);
    const VALIDE = /^(ici|L06-T35|renvoi (L\d\d-T\d+|lot \d\d))$/;
    const sansCible = Object.entries(COUVERTURE).filter(([, v]) => !VALIDE.test(v)).map(([k]) => k).sort();
    // Renvoi sans fiche cible : listé explicitement (défaut de fiche), jamais accepté en silence.
    expect(sansCible).toEqual(ENONCE_ABSENT);
    expect(ENONCE_ABSENT).toEqual(['C08', 'C15', 'C16', 'C18', 'C21']);
  });

  for (const c of ENONCE_ABSENT) it.todo(`${c} : énoncé absent du dépôt (défaut de fiche, Will doit le fournir)`);

  it('C23', () => {
    const e = { session: sessionDuRole('comptable'), chemin: `/api/compta/v1/societes/${SOC_MIENNE}/ecritures` };
    // Un appel qui mélange deux sociétés est refusé net, avec ou sans la société de la session.
    for (const societesDuCorps of [[SOC_MIENNE, SOC_SOEUR], [SOC_SOEUR]]) {
      expect(verifierRequeteSociete({ ...e, societesDuCorps })).toEqual({ ok: false, statut: 400, corps: { code: 'societe_unique' } });
    }
    expect(verifierRequeteSociete({ ...e, societesDuCorps: [SOC_MIENNE] }).ok).toBe(true);
  });

  it('C03', () => {
    expect(sql).toMatch(/PRIMARY KEY \(societe_id, personne_id\)/);
    const cibles = [...sql.matchAll(/REFERENCES ([\w.]+) \(([^)]*)\)/g)];
    expect(cibles.length).toBeGreaterThanOrEqual(4);
    for (const m of cibles) expect(m[2], m[1]).toMatch(/^societe_id,/);
  });

  it('C22', () => {
    expect(sql).toMatch(/mode text NOT NULL CHECK \(mode IN \('reelle','demonstration'\)\)/);
    expect(sql).not.toMatch(/REFERENCES a_compta\.societe\b/);
    expect(sql).not.toMatch(/\b(societe_reelle|societe_demo\w*|reelle_id|demonstration_id)\b/);
  });
});
