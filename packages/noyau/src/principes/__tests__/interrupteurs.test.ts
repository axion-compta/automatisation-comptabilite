import { describe, expect, it } from 'vitest';
import {
  ErreurInterrupteur,
  creerInterrupteur,
  demanderTransition,
  envoisAuRetourFerme,
  type ContexteTransition,
  type EtatInterrupteur,
} from '../interrupteurs.js';

const JOUR = 86_400_000;
const DUREE = 7 * JOUR;
const PILOTE = Date.UTC(2026, 10, 6, 9, 0);
const HABILITE = { type: 'personne', habilite: true } as const;

function ctx(maintenant: number, extra: Partial<ContexteTransition> = {}): ContexteTransition {
  return { maintenant, dureePiloteMs: DUREE, acteur: HABILITE, ...extra };
}
function enPilote(): EtatInterrupteur {
  return { code: 'envoi-relances', etat: 'pilote', depuis: PILOTE };
}
function codeErreur(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurInterrupteur) return e.code;
    throw e;
  }
  return undefined;
}

describe('interrupteurs fermes par defaut', () => {
  it('ferme-par-defaut', () => {
    expect(creerInterrupteur('envoi-relances', 5)).toEqual({ code: 'envoi-relances', etat: 'ferme', depuis: 5 });
    expect(codeErreur(() => creerInterrupteur('', 5))).toBe('entree_invalide');
    expect(codeErreur(() => creerInterrupteur('  ', 5))).toBe('entree_invalide');
    expect(codeErreur(() => creerInterrupteur('x', Number.NaN))).toBe('entree_invalide');
  });

  it('passage-direct-refuse', () => {
    const ferme = creerInterrupteur('envoi-relances', PILOTE);
    expect(demanderTransition(ferme, 'ouvert', ctx(PILOTE + 30 * JOUR, { motif: 'ok' }))).toEqual({
      ok: false,
      code: 'passage_direct_interdit',
    });
    expect(demanderTransition(ferme, 'ferme', ctx(PILOTE + 1))).toEqual({ ok: false, code: 'deja_dans_cet_etat' });
    expect(demanderTransition(ferme, 'pilote', ctx(PILOTE + 1))).toEqual({
      ok: true,
      etat: { code: 'envoi-relances', etat: 'pilote', depuis: PILOTE + 1 },
    });
    expect(demanderTransition(enPilote(), 'pilote', ctx(PILOTE + DUREE))).toEqual({
      ok: false,
      code: 'deja_dans_cet_etat',
    });
  });

  it('pilote-duree-pleine', () => {
    const e = enPilote();
    const m = { motif: 'pilote concluant' };
    const j4 = Date.UTC(2026, 10, 10, 9, 0);
    const veille = Date.UTC(2026, 10, 13, 8, 59);
    const pile = Date.UTC(2026, 10, 13, 9, 0);
    expect(demanderTransition(e, 'ouvert', ctx(j4, m))).toEqual({ ok: false, code: 'pilote_trop_court' });
    expect(demanderTransition(e, 'ouvert', ctx(veille, m))).toEqual({ ok: false, code: 'pilote_trop_court' });
    expect(demanderTransition(e, 'ouvert', ctx(pile - 1, m))).toEqual({ ok: false, code: 'pilote_trop_court' });
    expect(demanderTransition(e, 'ouvert', ctx(pile, m))).toEqual({
      ok: true,
      etat: { code: 'envoi-relances', etat: 'ouvert', depuis: pile },
    });
    expect(demanderTransition(e, 'ouvert', ctx(pile + 1, m)).ok).toBe(true);
    // durée nulle : acceptée immédiatement
    expect(demanderTransition(e, 'ouvert', ctx(PILOTE, { ...m, dureePiloteMs: 0 })).ok).toBe(true);
  });

  it('retour-ferme-immediat', () => {
    const tache = { type: 'tache', habilite: false } as const;
    for (const acteur of [tache, { type: 'agent', habilite: false } as const, { type: 'service', habilite: true } as const]) {
      const r = demanderTransition(enPilote(), 'ferme', ctx(PILOTE + 1, { acteur }));
      expect(r).toEqual({ ok: true, etat: { code: 'envoi-relances', etat: 'ferme', depuis: PILOTE + 1 } });
    }
    const ouvert: EtatInterrupteur = { code: 'envoi-relances', etat: 'ouvert', depuis: PILOTE };
    expect(demanderTransition(ouvert, 'ferme', ctx(PILOTE, { acteur: tache })).ok).toBe(true);
    // la fermeture ne dépend ni de la durée ni de l'horloge
    expect(demanderTransition(ouvert, 'ferme', ctx(PILOTE - 5, { acteur: tache })).ok).toBe(true);
    // la réouverture en pilote repart d'une nouvelle date
    expect(demanderTransition(ouvert, 'pilote', ctx(PILOTE + 9))).toEqual({
      ok: true,
      etat: { code: 'envoi-relances', etat: 'pilote', depuis: PILOTE + 9 },
    });
  });

  it('ouverture-exige-personne-et-motif', () => {
    const e = enPilote();
    const pile = PILOTE + DUREE;
    const sansGeste = [
      { type: 'personne', habilite: false },
      { type: 'service', habilite: true },
      { type: 'agent', habilite: true },
      { type: 'tache', habilite: true },
    ] as const;
    for (const acteur of sansGeste) {
      expect(demanderTransition(e, 'ouvert', ctx(pile, { acteur, motif: 'ok' }))).toEqual({
        ok: false,
        code: 'geste_requis',
      });
      expect(demanderTransition(creerInterrupteur('envoi-relances', 1), 'pilote', ctx(PILOTE, { acteur }))).toEqual({
        ok: false,
        code: 'geste_requis',
      });
    }
    // le geste prime sur la durée trop courte
    expect(
      demanderTransition(e, 'ouvert', ctx(PILOTE + 1, { acteur: { type: 'tache', habilite: false }, motif: 'ok' })),
    ).toEqual({ ok: false, code: 'geste_requis' });
    for (const motif of [undefined, '', '   ', '\t\n']) {
      expect(demanderTransition(e, 'ouvert', ctx(pile, motif === undefined ? {} : { motif }))).toEqual({
        ok: false,
        code: 'motif_obligatoire',
      });
    }
    expect(demanderTransition(e, 'ouvert', ctx(pile, { motif: ' raison ' })).ok).toBe(true);
    // la durée trop courte prime sur le motif manquant
    expect(demanderTransition(e, 'ouvert', ctx(PILOTE + 1))).toEqual({ ok: false, code: 'pilote_trop_court' });
  });

  it('horloge-incoherente', () => {
    const e = enPilote();
    expect(demanderTransition(e, 'ouvert', ctx(PILOTE - 1, { motif: 'ok' }))).toEqual({
      ok: false,
      code: 'horloge_incoherente',
    });
    const ferme = creerInterrupteur('envoi-relances', PILOTE);
    expect(demanderTransition(ferme, 'pilote', ctx(PILOTE - 1))).toEqual({ ok: false, code: 'horloge_incoherente' });
    expect(demanderTransition(ferme, 'pilote', ctx(PILOTE)).ok).toBe(true);
  });

  it('entrees-invalides', () => {
    const e = enPilote();
    const pile = PILOTE + DUREE;
    const mauvaises: number[] = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.5];
    for (const v of mauvaises) {
      expect(codeErreur(() => demanderTransition(e, 'ouvert', ctx(v, { motif: 'ok' })))).toBe('entree_invalide');
      expect(codeErreur(() => demanderTransition(e, 'ouvert', ctx(pile, { motif: 'ok', dureePiloteMs: v })))).toBe(
        'entree_invalide',
      );
      expect(codeErreur(() => demanderTransition({ ...e, depuis: v }, 'ferme', ctx(pile)))).toBe('entree_invalide');
    }
    expect(codeErreur(() => demanderTransition(e, 'ouvert', ctx(pile, { motif: 'ok', dureePiloteMs: -1 })))).toBe(
      'entree_invalide',
    );
    expect(codeErreur(() => demanderTransition(e, 'ouvert', ctx(pile, { motif: 'ok', dureePiloteMs: Number.MAX_SAFE_INTEGER + 1 })))).toBe(
      'entree_invalide',
    );
    expect(codeErreur(() => demanderTransition(e, 'bizarre' as never, ctx(pile)))).toBe('entree_invalide');
    expect(codeErreur(() => demanderTransition({ ...e, etat: 'x' as never }, 'ferme', ctx(pile)))).toBe('entree_invalide');
    expect(codeErreur(() => demanderTransition(e, 'ferme', ctx(pile, { acteur: { type: 'robot' as never, habilite: true } })))).toBe(
      'entree_invalide',
    );
    expect(codeErreur(() => demanderTransition(e, 'ferme', ctx(pile)))).toBeUndefined();
  });

  it('retour-ferme-annule-la-file', () => {
    expect(envoisAuRetourFerme([])).toEqual({ annules: [], dejaPartis: [] });
    const file = [
      { id: 'e3', parti: false },
      { id: 'e1', parti: true },
      { id: 'e2', parti: false },
      { id: 'e0', parti: true },
    ];
    expect(envoisAuRetourFerme(file)).toEqual({ annules: ['e2', 'e3'], dejaPartis: ['e0', 'e1'] });
    expect(file[0]?.id).toBe('e3');
    expect(envoisAuRetourFerme([{ id: 'a', parti: true }])).toEqual({ annules: [], dejaPartis: ['a'] });
    expect(envoisAuRetourFerme([{ id: 'a', parti: false }])).toEqual({ annules: ['a'], dejaPartis: [] });
  });
});
