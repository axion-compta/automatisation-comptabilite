import { describe, expect, it } from 'vitest';
import type { ParametreLegal } from '../../../../parametres/src/au-jour.js';
import { centimes } from '../../argent/index.js';
import { comparaisonN1, positionSeuils, seriesMultiples, widgetsPour, type ProfilWidgets } from '../widgets-v1.js';

const MICRO_FRANCHISE: ProfilWidgets = { regimeTva: 'franchise', regimeImposition: 'micro', impot: 'IR' };
const SOCIETE_REEL: ProfilWidgets = { regimeTva: 'reel_normal', regimeImposition: 'reel_normal', impot: 'IS' };
const EX = { id: 'n', debut: '2026-01-01', fin: '2026-12-31' };
const EX_PREC = { id: 'n1', debut: '2025-01-01', fin: '2025-12-31' };
const ligne = (cle: string, valeur: string, statut: ParametreLegal['statut'] = 'valide'): ParametreLegal => ({
  cle, pays: 'FR', valeur, effet_debut: '2020-01-01', effet_fin: null, statut, source: 'essai', date_releve: '2026-01-01',
});
// Seuils fictifs d'essai, lus dans la liste passée en argument.
const PARAMS = (statut: ParametreLegal['statut'] = 'valide'): ParametreLegal[] => [
  ligne('alerte.seuil_pct', '9000', statut),
  ligne('micro.plafond.services', '100000', statut),
  ligne('tva.franchise.seuil.services', JSON.stringify({ base: 40000, majore: 44000 }), statut),
];

describe('widgets V1 du tableau de bord', () => {
  it('micro-sans-tva-aucun-widget-tva', () => {
    expect(widgetsPour(MICRO_FRANCHISE).some((w) => w.startsWith('tva'))).toBe(false);
    expect(widgetsPour({ ...MICRO_FRANCHISE, regimeTva: 'non_assujetti' }).some((w) => w.startsWith('tva'))).toBe(false);
    expect(widgetsPour(SOCIETE_REEL)).toContain('tva');
  });

  it('widgets-par-profil', () => {
    const micro = widgetsPour(MICRO_FRANCHISE);
    expect(micro).toEqual(expect.arrayContaining(['seuil_micro', 'seuil_franchise']));
    expect(micro).not.toContain('impot_estime');
    const societe = widgetsPour(SOCIETE_REEL);
    expect(societe).toEqual(expect.arrayContaining(['impot_estime', 'point_mort']));
    expect(societe).not.toContain('seuil_micro');
    expect(societe).not.toContain('seuil_franchise');
  });

  it('series-multiples-meme-periode', () => {
    const p = { debut: '2026-02-01', fin: '2026-03-31' };
    const r = seriesMultiples([
      { code: 'ca', points: [{ date: '2026-01-31', valeur: centimes(5) }, { date: '2026-02-28', valeur: centimes(10) }, { date: '2026-03-31', valeur: centimes(20) }] },
      { code: 'charges', points: [{ date: '2026-03-31', valeur: centimes(7) }, { date: '2026-04-30', valeur: centimes(9) }] },
    ], p);
    expect(r.dates).toEqual(['2026-02-28', '2026-03-31']);
    expect(r.series).toEqual([{ code: 'ca', valeurs: [10, 20] }, { code: 'charges', valeurs: [null, 7] }]);
    expect(() => seriesMultiples([{ code: 'a', points: [] }, { code: 'a', points: [] }], p)).toThrow('serie_en_double');
  });

  it('comparaison-n-1-exercice-absent', () => {
    const p = { debut: '2026-01-01', fin: '2026-03-31' };
    expect(comparaisonN1(p, EX, undefined, () => centimes(1))).toEqual({ vide: 'pas_d_exercice_precedent' });
    const vus: string[] = [];
    const r = comparaisonN1(p, EX, EX_PREC, (q) => { vus.push(q.debut + '/' + q.fin); return vus.length === 1 ? centimes(150) : centimes(100); });
    expect(vus).toEqual(['2026-01-01/2026-03-31', '2025-01-01/2025-03-31']);
    expect(r).toMatchObject({ courant: 150, precedent: 100, ecart: 50, variationPdb: 5000 });
    expect(comparaisonN1(p, EX, EX_PREC, (q) => (q.debut < '2026' ? centimes(0) : centimes(8)))).toMatchObject({ ecart: 8, variationPdb: null });
  });

  it('seuils-lus-dans-les-parametres', () => {
    const p = positionSeuils(MICRO_FRANCHISE, centimes(95000), 'services', PARAMS(), '2026-06-01');
    expect(p.micro).toEqual({ niveau: 'alerte', aVerifier: false });
    expect(p.franchise).toEqual({ niveau: 'majore_depasse', aVerifier: false });
    // Une autre valeur lue change le résultat : rien n'est écrit en dur.
    const autre = PARAMS().map((l) => (l.cle === 'micro.plafond.services' ? { ...l, valeur: '500000' } : l));
    expect(positionSeuils(MICRO_FRANCHISE, centimes(95000), 'services', autre, '2026-06-01').micro?.niveau).toBe('sous');
    expect(positionSeuils(MICRO_FRANCHISE, centimes(95000), 'services', PARAMS('non_verifie'), '2026-06-01').micro?.aVerifier).toBe(true);
    expect(positionSeuils(SOCIETE_REEL, centimes(95000), 'services', PARAMS(), '2026-06-01')).toEqual({});
    expect(() => positionSeuils(MICRO_FRANCHISE, centimes(1), 'services', [], '2026-06-01')).toThrow('parametre_absent');
  });
});
