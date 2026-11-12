import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lancerBancReel, variablesPresentes } from '../banc-reel.mjs';

const LIBELLE = 'LIBELLE-FICTIF-UNIQUE';
const LIGNES = [
  { id: 'L1', libelle: LIBELLE, montant: -123457 },
  { id: 'L2', libelle: LIBELLE, montant: -2500 },
  { id: 'L3', libelle: LIBELLE, montant: 400000 },
];
const MANIFESTE = {
  constats: { 'CC-K05': 2, 'CC-K06': 0 },
  releve: { totalDebits: 125957, totalCredits: 400000, soldeOuverture: 1000, soldeCloture: 275043 },
};

function banc(manifeste = MANIFESTE, lignes = LIGNES, constats = [{ code: 'CC-K05' }, { code: 'CC-K05' }]) {
  const dossier = mkdtempSync(join(tmpdir(), 'banc-fictif-'));
  writeFileSync(join(dossier, 'releve.json'), JSON.stringify({ lignes, soldeOuverture: manifeste.releve.soldeOuverture }));
  writeFileSync(join(dossier, 'constats.json'), JSON.stringify(constats));
  const fichier = join(dossier, 'manifeste.json');
  writeFileSync(fichier, JSON.stringify(manifeste));
  return { BANC_REEL_DOSSIER: dossier, BANC_REEL_MANIFESTE: fichier };
}
const statut = (r, code) => r.verifications.find((v) => v.code === code)?.statut;

const configure = variablesPresentes(process.env);
describe('lanceur du banc réel (fiche L22-T23)', () => {
  // Hors de la machine qui détient le banc, les variables sont absentes : le test réel est ignoré.
  (configure ? it : it.skip)(
    'sans-variable-ignore-avec-message : banc réel absent en CI publique (fiche L22-T23), définir BANC_REEL_DOSSIER et BANC_REEL_MANIFESTE',
    async () => {
      const r = await lancerBancReel(process.env);
      expect(r.etat).toBe('execute');
      expect(r.ok).toBe(true);
    },
  );

  it('sans-variable-ignore-avec-message : le lanceur ignore avec un message qui cite L22-T23', async () => {
    for (const env of [{}, { BANC_REEL_DOSSIER: '/x' }, { BANC_REEL_MANIFESTE: '/y' }, { BANC_REEL_DOSSIER: '', BANC_REEL_MANIFESTE: '' }]) {
      const r = await lancerBancReel(env);
      expect(r.etat).toBe('ignore');
      expect(r.message).toMatch(/L22-T23/);
    }
    expect(variablesPresentes(banc())).toBe(true);
  });

  it('manifeste-fictif-totaux-egaux', async () => {
    const r = await lancerBancReel(banc());
    expect(r.etat).toBe('execute');
    expect(r.ok).toBe(true);
    expect(r.verifications.every((v) => v.statut === 'ok')).toBe(true);
    expect(r.verifications.map((v) => v.code)).toEqual(expect.arrayContaining(['total_debits', 'total_credits', 'solde_ouverture', 'solde_cloture', 'constats:CC-K05', 'constats:CC-K06', 'reimport']));
  });

  it('ecart-un-centime-signale', async () => {
    for (const [champ, code] of [['totalDebits', 'total_debits'], ['totalCredits', 'total_credits'], ['soldeCloture', 'solde_cloture']]) {
      for (const delta of [1, -1]) {
        const m = { ...MANIFESTE, releve: { ...MANIFESTE.releve, [champ]: MANIFESTE.releve[champ] + delta } };
        const r = await lancerBancReel(banc(m));
        expect(r.ok).toBe(false);
        expect(statut(r, code)).toBe('ecart');
      }
    }
    const m = { ...MANIFESTE, constats: { 'CC-K05': 3, 'CC-K06': 0 } };
    expect(statut(await lancerBancReel(banc(m)), 'constats:CC-K05')).toBe('ecart');
  });

  it('reimport-zero-ligne', async () => {
    const r = await lancerBancReel(banc());
    expect(r.reimport).toEqual({ lignesLues: 3, lignesCreees: 0 });
    expect(statut(r, 'reimport')).toBe('ok');
    // des identifiants en double dans le relevé ne sont pas comptés deux fois
    const doublon = await lancerBancReel(banc(MANIFESTE, [...LIGNES, LIGNES[0]]));
    expect(doublon.reimport.lignesCreees).toBe(0);
    expect(statut(doublon, 'total_debits')).toBe('ecart');
  });

  it('rapport-sans-montant-ni-libelle', async () => {
    const m = { ...MANIFESTE, releve: { ...MANIFESTE.releve, totalDebits: 1 } };
    for (const r of [await lancerBancReel(banc()), await lancerBancReel(banc(m))]) {
      const texte = JSON.stringify(r);
      expect(texte).not.toContain(LIBELLE);
      for (const montant of ['123457', '125957', '400000', '275043', '2500']) expect(texte).not.toContain(montant);
    }
  });

  it('refuse un dossier ou un manifeste illisible par un code, sans recopier le contenu', async () => {
    const r = await lancerBancReel({ BANC_REEL_DOSSIER: join(tmpdir(), 'absent-fictif'), BANC_REEL_MANIFESTE: join(tmpdir(), 'absent-fictif.json') });
    expect(r.etat).toBe('erreur');
    expect(r.code).toBe('fichier_illisible');
    expect(JSON.stringify(r)).not.toContain('absent-fictif');
  });
});
