import { describe, expect, it } from 'vitest';
import { genererRgpd, type JeuRgpd } from '../rgpd.js';

const REF = '2031-06-15';
const jeu = genererRgpd({ dateReference: REF });
const camille = jeu.personnes.find((p) => p.nom === 'Camille Exemple')!;
const mois = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
const ibanValide = (s: string) => BigInt([...(s.slice(4) + s.slice(0, 4))].map((c) => parseInt(c, 36)).join('')) % 97n === 1n;

describe('donnees fictives du lot 08', () => {
  it('meme-graine-meme-jeu', () => {
    expect(JSON.stringify(genererRgpd({ dateReference: REF }))).toBe(JSON.stringify(jeu));
    expect(JSON.stringify(genererRgpd({ graine: 'rgpd-v1', dateReference: REF }))).toBe(JSON.stringify(jeu));
  });
  it('graines-differentes-jeux-differents', () => {
    const a = genererRgpd({ graine: 'a', dateReference: REF });
    const b = genererRgpd({ graine: 'b', dateReference: REF });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    expect(a.pieces.map((p) => p.empreinte)).not.toEqual(b.pieces.map((p) => p.empreinte));
  });
  it('douze-pieces-pour-camille', () => {
    expect(jeu.pieces).toHaveLength(30);
    const citees = jeu.pieces.filter((p) => p.texteLu.includes('Camille Exemple'));
    expect(citees).toHaveLength(12);
    expect(citees.filter((p) => p.autresPersonnes)).toHaveLength(2);
    for (const p of citees.filter((c) => c.autresPersonnes)) expect(p.texteLu).toMatch(/Dominique Essai|Claude Fictif/);
    expect(jeu.pieces.filter((p) => !citees.includes(p) && p.autresPersonnes)).toHaveLength(0);
    expect(new Set(jeu.pieces.map((p) => p.id)).size).toBe(30);
    expect(camille.email).toBe('camille.exemple@exemple.fr');
  });
  it('six-demandes-six-types', () => {
    expect(jeu.demandes.map((d) => d.type).sort()).toEqual(['acces', 'effacement', 'limitation', 'opposition', 'portabilite', 'rectification']);
    for (const d of jeu.demandes) expect(d.echeance > d.recueLe).toBe(true);
  });
  it('etats-varies-presents', () => {
    const ouvertes = jeu.demandes.filter((d) => d.etat === 'en_cours');
    expect(ouvertes.filter((d) => d.echeance < REF)).toHaveLength(1);
    expect(ouvertes.filter((d) => d.echeance >= REF)).toHaveLength(1);
    expect(jeu.demandes.filter((d) => d.etat === 'traitee')).toHaveLength(1);
    expect(jeu.demandes.filter((d) => d.etat === 'transmise_a_la_societe')).toHaveLength(1);
    expect(jeu.demandes.filter((d) => d.etat === 'recue')).toHaveLength(1);
    const refus = jeu.demandes.filter((d) => d.etat === 'refusee');
    expect(refus).toHaveLength(1);
    expect(refus[0]!.motifRefus).toBeTruthy();
    expect(refus[0]!.sourceMotif).toBeTruthy();
    expect(jeu.demandes.find((d) => d.etat === 'recue')!.traiteePar).toBeNull();
    const traitee = jeu.demandes.find((d) => d.etat === 'traitee')!;
    expect(traitee.fichierReponseEmpreinte).toMatch(/^[0-9a-f]{64}$/);
  });
  it('anciens-de-treize-mois', () => {
    const dominique = jeu.personnes.find((p) => p.nom === 'Dominique Essai')!;
    const facture = jeu.pieces.find((p) => p.texteLu.includes('Dominique Essai') && p.recueLe.startsWith('2025'))!;
    expect(facture.extension).toBe('pdf');
    expect(jeu.ecritures.some((e) => e.libelle.includes('Dominique Essai'))).toBe(true);
    expect(jeu.preferences.filter((p) => p.personneId === dominique.id)).toHaveLength(1);
    expect(jeu.preferences[0]!.marques).toEqual([]);
    const anciennes = jeu.conversations.filter((c) => mois(c.derniereActiviteLe, REF) === 13);
    const recentes = jeu.conversations.filter((c) => mois(c.derniereActiviteLe, REF) < 13);
    expect(anciennes).toHaveLength(1);
    expect(recentes.length).toBeGreaterThan(0);
    expect(jeu.signalements.filter((s) => mois(s.creeLe, REF) === 13)).toHaveLength(1);
    expect(jeu.signalements.filter((s) => mois(s.creeLe, REF) < 13).length).toBeGreaterThan(0);
    for (const p of jeu.pieces) expect(p.empreinte).toMatch(/^[0-9a-f]{64}$/);
  });
  it('aucun-email-hors-exemple-et-aucun-iban-valide', () => {
    const texte = JSON.stringify(jeu as JeuRgpd);
    const mails = texte.match(/[\w.+-]+@[\w.-]+/g) ?? [];
    expect(mails.length).toBeGreaterThanOrEqual(3);
    for (const m of mails) expect(m.endsWith('@exemple.fr')).toBe(true);
    for (const c of texte.match(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g) ?? []) expect(ibanValide(c)).toBe(false);
    expect(() => genererRgpd({ dateReference: '2031-02-30' })).toThrow();
  });
});
