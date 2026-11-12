import { describe, expect, it } from 'vitest';
import { CODES_ERREUR, CONFIANCES, ISSUES, MOTIFS_REFUS, SOURCES_PROPOSITION, TYPES_CARTE } from '../../../../noyau/src/chat/types.js';
import { e25 } from '../e25.js';

// Les fonctions de mise en forme vivent dans les composants ; le fichier de textes ne porte que des gabarits.
const valideePar = (personne: string, date: string): string =>
  e25.carte.mentionApres.replace('{personne}', personne).replace('{date}', date);
const secondesRestantes = (n: number): string => {
  const s = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  return (s > 1 ? e25.toast.secondesRestantes : e25.toast.secondeRestante).replace('{n}', String(s));
};

// Assemblés ici pour ne pas figurer en clair dans le dépôt.
const INTERDITS = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) => p.join(''));

function feuilles(o: unknown, chemin: string): Array<[string, string]> {
  if (typeof o === 'string') return [[chemin, o]];
  if (typeof o !== 'object' || o === null) throw new Error(`${chemin} : texte attendu`);
  return Object.entries(o).flatMap(([k, v]) => feuilles(v, `${chemin}.${k}`));
}
const toutes = feuilles(e25, 'e25');

describe('textes E25 discussion', () => {
  it('seize-erreurs-ont-message-et-bouton', () => {
    expect(CODES_ERREUR).toHaveLength(16);
    expect(Object.keys(e25.erreurs).sort()).toEqual([...CODES_ERREUR].sort());
    for (const c of CODES_ERREUR) {
      const e = e25.erreurs[c];
      expect(e.message.trim().length).toBeGreaterThan(0);
      expect(e.bouton.trim().length).toBeGreaterThan(0);
      expect(e.message).not.toContain(c);
    }
  });

  it('sept-refus-ont-alternative', () => {
    expect(MOTIFS_REFUS).toHaveLength(7);
    expect(Object.keys(e25.refus).sort()).toEqual([...MOTIFS_REFUS].sort());
    for (const m of MOTIFS_REFUS) {
      expect(e25.refus[m].message.trim()).not.toBe('');
      expect(e25.refus[m].bouton.trim()).not.toBe('');
    }
  });

  it('six-issues', () => {
    expect(ISSUES).toHaveLength(6);
    expect(Object.keys(e25.issues).sort()).toEqual([...ISSUES].sort());
  });

  it('vouvoiement', () => {
    const tutoiement = /(?<!\p{L})(tu|ton|tes)(?!\p{L})/iu;
    for (const [chemin, texte] of toutes) {
      expect(texte, chemin).not.toMatch(tutoiement);
      for (const mot of INTERDITS) expect(texte.toLowerCase(), chemin).not.toContain(mot.toLowerCase());
    }
    expect(valideePar('Alice Exemple', '07/11/2026')).not.toMatch(tutoiement);
  });

  it('mention-ia-presente', () => {
    expect(e25.carte.mentionAvant).toBe('Préparé par IA, à valider');
    expect(valideePar('Alice Exemple', '07/11/2026')).toContain('Préparé par IA');
    expect(e25.modeSansModele).toBe("L'assistant est indisponible ; les commandes restent utilisables");
  });

  it('libelles-de-la-carte-d-action', () => {
    const { valider, modifier, refuser, plusTard } = e25.carte;
    expect([valider, modifier, refuser, plusTard]).toEqual(['Valider', 'Modifier', 'Refuser', 'Plus tard']);
    expect(e25.carte.appliquer).toBe(valider);
    expect(new Set([valider, modifier, refuser, plusTard]).size).toBe(4);
  });

  it('validee-par-formate', () => {
    expect(valideePar('Alice Exemple', '07/11/2026')).toBe('Préparé par IA, validé par Alice Exemple le 07/11/2026');
  });

  it('pluriel-des-secondes', () => {
    expect(secondesRestantes(0)).toBe('0 seconde restante');
    expect(secondesRestantes(1)).toBe('1 seconde restante');
    expect(secondesRestantes(2)).toBe('2 secondes restantes');
    for (const n of [-3, Number.NaN, Number.POSITIVE_INFINITY]) expect(secondesRestantes(n)).toBe('0 seconde restante');
    expect(secondesRestantes(2.9)).toBe('2 secondes restantes');
  });

  it('libelles-des-composants', () => {
    const cles = (o: object) => Object.keys(o).sort();
    expect(cles(e25.rendu.types)).toEqual([...TYPES_CARTE].sort());
    expect(cles(e25.pourquoi.sources)).toEqual([...SOURCES_PROPOSITION].sort());
    expect(cles(e25.pourquoi.mots)).toEqual([...CONFIANCES].sort());
    for (const [chemin, texte] of toutes.filter(([c]) => c.startsWith('e25.pourquoi.mots'))) expect(texte, chemin).not.toContain('%');
  });

  it('aucune-chaine-vide', () => {
    expect(toutes.length).toBeGreaterThan(80);
    for (const [chemin, texte] of toutes) expect(texte.trim().length, chemin).toBeGreaterThan(0);
  });
});
