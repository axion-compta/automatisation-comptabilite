import { describe, expect, it } from 'vitest';
import { sirenValide } from '../generateur.js';
import { genererProfils } from '../profil.js';

const jeu = genererProfils();
const champ = (soc: string, cle: string) => jeu.champs.filter((c) => c.societeId === soc && c.cle === cle);

describe('profils fictifs', () => {
  it('meme-graine-meme-jeu', () => {
    expect(genererProfils(7)).toEqual(genererProfils(7));
    expect(genererProfils()).toEqual(genererProfils(1));
    expect(genererProfils(7).champs.map((c) => c.confirme_le)).not.toEqual(genererProfils(8).champs.map((c) => c.confirme_le));
  });
  it('siren-cle-juste', () => {
    const tous = [...jeu.societes.map((s) => s.siren), ...jeu.identites.map((i) => i.siren)].filter((s): s is string => s !== null);
    expect(tous.length).toBeGreaterThan(0);
    for (const s of tous) expect(['123456782', '987654324']).toContain(s);
    for (const s of tous) expect(sirenValide(s), s).toBe(true);
  });
  it('lemoine-regime-tva-a-confirmer', () => {
    const l = jeu.champs.filter((c) => c.societeId === 'soc-lemoine');
    expect(l.filter((c) => c.statut !== 'confirme').map((c) => [c.cle, c.statut])).toEqual([['regime_tva', 'a_confirmer']]);
    expect(champ('soc-lemoine', 'exercice_debut')[0]?.valeur).toBe('2026-07-01');
    expect(champ('soc-lemoine', 'exercice_fin')[0]?.valeur).toBe('2027-06-30');
  });
  it('rivoire-forme-changee-datee', () => {
    const f = champ('soc-rivoire', 'forme');
    expect(f.map((c) => c.valeur)).toEqual(['SARL', 'SAS']);
    expect((f[0]?.effet_debut ?? '') < (f[1]?.effet_debut ?? '')).toBe(true);
    expect(f[1]?.rang).toBeGreaterThan(f[0]?.rang ?? 0);
  });
  it('bertin-en-formation-livre-recettes', () => {
    expect(champ('soc-bertin', 'tenue')[0]?.valeur).toBe('livre_recettes');
    expect(champ('soc-bertin', 'en_formation')[0]?.valeur).toBe('vrai');
    const s = jeu.societes.find((x) => x.id === 'soc-bertin');
    expect(s).toMatchObject({ siren: null, enFormation: true, forme: 'EI' });
  });
  it('parametres-inventes', () => {
    expect(jeu.parametres.map((p) => p.statut)).toEqual(['non_verifie', 'a_verifier', 'valide', 'retire']);
    for (const p of jeu.parametres) {
      expect(p.cle.startsWith('fictif.')).toBe(true);
      expect(p.source_url).toContain('/fictif/');
    }
  });
  it('cinq-attributs-presents', () => {
    expect(new Set(jeu.champs.map((c) => c.origine))).toEqual(new Set(['sirene', 'saisie_personne', 'document', 'proposition_ia']));
    jeu.champs.forEach((c, i) => {
      expect(c.rang).toBe(i);
      for (const k of ['valeur', 'origine', 'confiance', 'source_ref', 'statut'] as const) expect(k in c, k).toBe(true);
      expect(c.source_ref === null).toBe(c.origine === 'saisie_personne');
      expect(c.confirme_par === null).toBe(c.statut !== 'confirme');
    });
  });
  it('aucun-courriel-ni-iban-reel', async () => {
    const chemin = new URL('../../../../outils/gardes/fictif.mjs', import.meta.url).href;
    const { analyserTexte } = (await import(/* @vite-ignore */ chemin)) as { analyserTexte: (t: string, n: string) => string[] };
    expect(analyserTexte('a@reel.com FR7630006000011234567890189', 'sonde')).toHaveLength(2);
    expect(analyserTexte(JSON.stringify(jeu, null, 1), 'profil')).toEqual([]);
  });
});
