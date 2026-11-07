import { describe, expect, it } from 'vitest';
import { executerControles } from '../../moteur.js';
import { mentionsAdmises, regleCCT13 } from '../franchise-mention.js';
import type { MentionDatee } from '../franchise-mention.js';

const ANCIENNE = 'TVA non applicable, article ancien du code fictif';
const NOUVELLE = 'TVA non applicable, article nouveau du code fictif';
const liste: MentionDatee[] = [
  { texte: ANCIENNE, debut: '2020-01-01', fin: '2031-07-01', statut: 'valide' },
  { texte: NOUVELLE, debut: '2030-01-01', fin: null, statut: 'valide' },
];
const evaluer = (dateFacture: string, mentionsLues: string[], l: MentionDatee[] = liste): unknown =>
  regleCCT13.evaluer({ dateFacture, mentionsLues, liste: l });
const code = (f: () => unknown): string => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code ?? 'autre';
  }
  return 'aucune';
};
const OK = { resultat: 'OK' };

describe('CC-T13 mention de franchise', () => {
  it('CT-29 mention', () => {
    expect(evaluer('2030-06-15', [ANCIENNE])).toEqual(OK);
    expect(evaluer('2031-06-30', [ANCIENNE])).toEqual(OK);
    expect(evaluer('2031-07-01', [ANCIENNE])).toEqual({ resultat: 'ALERTE', valeur: 'non_admise_a_cette_date' });
    expect(evaluer('2031-07-01', [NOUVELLE])).toEqual(OK);
    expect(evaluer('2031-07-01', ['texte libre', NOUVELLE])).toEqual(OK);
    expect(mentionsAdmises(liste, '2030-06-15').map((m) => m.texte)).toEqual([ANCIENNE, NOUVELLE]);
    expect(mentionsAdmises(liste, '2029-12-31').map((m) => m.texte)).toEqual([ANCIENNE]);
    expect(mentionsAdmises(liste, '2019-12-31')).toEqual([]);
    const meta = [regleCCT13.id, regleCCT13.version, regleCCT13.gravite, regleCCT13.bloque, regleCCT13.declencheurs, regleCCT13.actif];
    expect(meta).toEqual(['CC-T13', 1, 'M', [], ['arrivee', 'a_la_demande'], true]);
    const objet = { dateFacture: '2031-07-01', mentionsLues: [ANCIENNE], liste };
    const traces = executerControles([regleCCT13], [{ type: 'facture', id: 'F1', donnee: objet }], 'arrivee', 'h');
    expect(traces.map((t) => t.resultat)).toEqual(['ALERTE']);
  });

  it('veille-de-la-fin-admise', () => {
    expect(evaluer('2031-06-30', [ANCIENNE])).toEqual(OK);
    expect(mentionsAdmises(liste, '2031-06-30')).toHaveLength(2);
  });

  it('jour-de-la-fin-refusee', () => {
    expect(mentionsAdmises(liste, '2031-07-01').map((m) => m.texte)).toEqual([NOUVELLE]);
    expect(evaluer('2031-07-01', [ANCIENNE])).toEqual({ resultat: 'ALERTE', valeur: 'non_admise_a_cette_date' });
    expect(mentionsAdmises(liste, '2020-01-01').map((m) => m.texte)).toEqual([ANCIENNE]);
  });

  it('ordre-inverse-meme-resultat', () => {
    const inverse = [...liste].reverse();
    for (const d of ['2031-06-30', '2031-07-01', '2030-01-01', '2029-12-31']) {
      for (const lues of [[ANCIENNE], [NOUVELLE], [ANCIENNE, NOUVELLE], ['texte libre', NOUVELLE]]) {
        expect(evaluer(d, [...lues].reverse(), inverse)).toEqual(evaluer(d, lues, liste));
      }
      expect(mentionsAdmises(inverse, d).map((m) => m.texte).sort()).toEqual(mentionsAdmises(liste, d).map((m) => m.texte).sort());
    }
  });

  it('mention-nouvelle-trop-tot', () => {
    expect(evaluer('2029-12-31', [NOUVELLE])).toEqual({ resultat: 'ALERTE', valeur: 'non_admise_a_cette_date' });
    expect(evaluer('2030-01-01', [NOUVELLE])).toEqual(OK);
  });

  it('absente', () => {
    expect(evaluer('2030-06-15', [])).toEqual({ resultat: 'ALERTE', valeur: 'absente' });
    expect(evaluer('2030-06-15', ['   ', ''])).toEqual({ resultat: 'ALERTE', valeur: 'absente' });
    expect(evaluer('2019-01-01', [])).toEqual({ resultat: 'ALERTE', valeur: 'absente' });
    expect(evaluer('2019-01-01', [ANCIENNE])).toEqual({ resultat: 'ALERTE', valeur: 'non_admise_a_cette_date' });
    const seule: MentionDatee[] = [{ texte: ANCIENNE, debut: '2020-01-01', fin: null, statut: 'a_verifier' }];
    expect(evaluer('2030-06-15', [], seule)).toEqual({ resultat: 'ALERTE', valeur: 'absente' });
    expect(evaluer('2030-06-15', ['autre'], seule)).toEqual({ resultat: 'ALERTE', valeur: 'source_a_verifier' });
    expect(evaluer('2030-06-15', [ANCIENNE], seule)).toEqual({ resultat: 'OK', valeur: 'source_a_verifier' });
    const mixte = [...seule, { texte: NOUVELLE, debut: '2020-01-01', fin: null, statut: 'valide' as const }];
    expect(evaluer('2030-06-15', [ANCIENNE], mixte)).toEqual(OK);
    expect(evaluer('2030-06-15', ['autre'], mixte)).toEqual({ resultat: 'ALERTE', valeur: 'non_admise_a_cette_date' });
  });

  it('liste-vide-exception', () => {
    expect(code(() => evaluer('2030-06-15', [ANCIENNE], []))).toBe('entree_invalide');
    expect(code(() => mentionsAdmises([], '2030-06-15'))).toBe('entree_invalide');
    const traces = executerControles([regleCCT13], [{ type: 'facture', id: 'F', donnee: { dateFacture: '2030-06-15', mentionsLues: [], liste: [] } }], 'arrivee', 'h');
    expect(traces.map((t) => t.resultat)).toEqual(['IMPOSSIBLE']);
  });

  it('date-invalide-exception', () => {
    for (const d of ['', '2030-13-01', '2030-02-30', '30/06/2030', '2030-6-1', 'abc']) {
      expect(code(() => evaluer(d, [ANCIENNE]))).toBe('entree_invalide');
      expect(code(() => mentionsAdmises(liste, d))).toBe('entree_invalide');
    }
    const mal = (m: Partial<MentionDatee>): MentionDatee[] => [{ ...liste[0], ...m } as MentionDatee];
    expect(code(() => evaluer('2030-06-15', [ANCIENNE], mal({ debut: '2020-02-30' })))).toBe('entree_invalide');
    expect(code(() => evaluer('2030-06-15', [ANCIENNE], mal({ fin: 'x' })))).toBe('entree_invalide');
    expect(code(() => evaluer('2030-06-15', [ANCIENNE], mal({ fin: '2020-01-01' })))).toBe('entree_invalide');
    expect(code(() => evaluer('2030-06-15', [ANCIENNE], mal({ fin: '2019-01-01' })))).toBe('entree_invalide');
  });

  it('normalisation-de-la-mention', () => {
    expect(evaluer('2030-06-15', ['  tva NON applicable,   article ancien du code fictif '])).toEqual(OK);
    expect(evaluer('2030-06-15', [ANCIENNE.toUpperCase()])).toEqual(OK);
    expect(evaluer('2030-06-15', ['TVA non applicable,\narticle\tancien du code fictif'])).toEqual(OK);
    const accent: MentionDatee[] = [{ texte: 'Exonéré d’impôt', debut: '2020-01-01', fin: null, statut: 'valide' }];
    expect(evaluer('2030-06-15', ["exonere d'impot"], accent)).toEqual(OK);
    expect(evaluer('2030-06-15', ['exonéré d impôt'], accent)).toEqual({ resultat: 'ALERTE', valeur: 'non_admise_a_cette_date' });
  });
});
