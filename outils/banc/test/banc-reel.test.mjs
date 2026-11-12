import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lancerBancReel, variablesPresentes } from '../banc-reel.mjs';
import { lignesNouvelles, numeroterOccurrences } from '../../../packages/noyau/src/banque/doublons.ts';

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

function banc(manifeste = MANIFESTE, lignes = LIGNES, constats = [{ code: 'CC-K05' }, { code: 'CC-K05' }], ouverture = manifeste.releve?.soldeOuverture) {
  const dossier = mkdtempSync(join(tmpdir(), 'banc-fictif-'));
  writeFileSync(join(dossier, 'releve.json'), JSON.stringify({ lignes, soldeOuverture: ouverture }));
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
    for (const ouverture of [999, 1001]) {
      const r = await lancerBancReel(banc(MANIFESTE, LIGNES, undefined, ouverture));
      expect(statut(r, 'solde_ouverture')).toBe('ecart');
      expect(statut(r, 'solde_cloture')).toBe('ecart');
    }
    const sans = await lancerBancReel(banc(MANIFESTE, LIGNES, undefined, null));
    expect(statut(sans, 'solde_ouverture')).toBe('ecart');
    expect(sans.ok).toBe(false);
    const inattendu = await lancerBancReel(banc(MANIFESTE, LIGNES, [{ code: 'CC-K05' }, { code: 'CC-K05' }, { code: 'CC-K99' }]));
    expect(statut(inattendu, 'constats:CC-K99')).toBe('ecart');
  });

  it('reimport-zero-ligne', async () => {
    const r = await lancerBancReel(banc());
    expect(r.reimport).toEqual({ lignesLues: 3, lignesCreees: 0 });
    expect(statut(r, 'reimport')).toBe('ok');
    // des identifiants en double dans le relevé ne sont pas comptés deux fois
    const doublon = await lancerBancReel(banc(MANIFESTE, [...LIGNES, LIGNES[0]]));
    expect(doublon.reimport).toEqual({ lignesLues: 4, lignesCreees: 0 });
    // un import qui recrée des lignes est signalé
    const mauvais = await lancerBancReel(banc(), { importeur: (lignes) => lignes.length });
    expect(statut(mauvais, 'reimport')).toBe('ecart');
    expect(mauvais.ok).toBe(false);
    expect(statut(doublon, 'total_debits')).toBe('ecart');
  });

  it('valeurs-non-entieres-des-deux-cotes-en-ecart', async () => {
    for (const v of [10.5, '1000', 'abc']) {
      const m = { ...MANIFESTE, releve: { ...MANIFESTE.releve, soldeOuverture: v, soldeCloture: v === 10.5 ? 274053.5 : v } };
      const r = await lancerBancReel(banc(m));
      expect(statut(r, 'solde_ouverture'), String(v)).toBe('ecart');
      expect(r.ok).toBe(false);
      if (v === 10.5) expect(statut(r, 'solde_cloture')).toBe('ecart');
    }
  });

  it('reimport-reel-sur-doublons-noyau', async () => {
    const importeur = (lignes, connus) => {
      const lues = numeroterOccurrences(lignes.map((l, rang) => ({ compteId: 'C1', dateOperation: l.date, montant: l.montant, devise: 'EUR', libelleNormalise: l.libelle, rang })));
      const nouvelles = lignesNouvelles([...connus], lues);
      for (const n of nouvelles) connus.add({ empreinte: n.empreinte, occurrence: n.occurrence });
      return nouvelles.length;
    };
    const jour = { date: '2026-01-05', libelle: 'ABONNEMENT FICTIF', montant: -1000 };
    const lignes = [{ id: 'A1', ...jour }, { id: 'A2', ...jour }, { id: 'A3', date: '2026-01-06', libelle: 'VIREMENT FICTIF', montant: 500 }];
    expect(importeur(lignes, new Set())).toBe(3);
    const connus = new Set();
    importeur(lignes, connus);
    expect(importeur(lignes, connus)).toBe(0);
    expect(importeur([...lignes, { id: 'A4', ...jour }], connus)).toBe(1);
    const manifeste = { constats: {}, releve: { totalDebits: 2000, totalCredits: 500, soldeOuverture: 0, soldeCloture: -1500 } };
    const r = await lancerBancReel(banc(manifeste, lignes, []), { importeur });
    expect(r.reimport).toEqual({ lignesLues: 3, lignesCreees: 0 });
    expect(r.ok).toBe(true);
  });

  it('reimport-importeur-aberrant-ecart', async () => {
    expect(statut(await lancerBancReel(banc(), { importeur: () => -1 }), 'reimport')).toBe('ecart');
  });

  it('rapport-sans-montant-ni-libelle', async () => {
    const m = { ...MANIFESTE, releve: { ...MANIFESTE.releve, totalDebits: 1 } };
    for (const r of [await lancerBancReel(banc()), await lancerBancReel(banc(m))]) {
      const texte = JSON.stringify(r);
      expect(texte).not.toContain(LIBELLE);
      for (const montant of ['123457', '125957', '400000', '275043', '2500']) expect(texte).not.toContain(montant);
    }
  });

  it('forme invalide : code forme_invalide', async () => {
    const dossier = (releve, manifeste = MANIFESTE) => {
      const e = banc(manifeste);
      writeFileSync(join(e.BANC_REEL_DOSSIER, 'releve.json'), JSON.stringify(releve));
      return e;
    };
    const invalides = [
      dossier({ lignes: [{ id: 'L1', montant: 12.5 }], soldeOuverture: 0 }),
      dossier({ soldeOuverture: 0 }),
      banc({ ...MANIFESTE, releve: null }),
    ];
    for (const env of invalides) expect(await lancerBancReel(env)).toEqual({ etat: 'erreur', code: 'forme_invalide' });
  });

  it('refuse un dossier ou un manifeste illisible par un code, sans recopier le contenu', async () => {
    const r = await lancerBancReel({ BANC_REEL_DOSSIER: join(tmpdir(), 'absent-fictif'), BANC_REEL_MANIFESTE: join(tmpdir(), 'absent-fictif.json') });
    expect(r.etat).toBe('erreur');
    expect(r.code).toBe('fichier_illisible');
    expect(JSON.stringify(r)).not.toContain('absent-fictif');
  });
});
