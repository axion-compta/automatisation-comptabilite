import { describe, it, expect } from 'vitest';
import { defineAutomation, validerManifeste, VERSION_CONTRAT, MAX_PERMISSIONS } from '../contrat.mjs';
import { creerBase, migrer, rejouer, verifierJeu } from '../faux-hote.mjs';
import { PERMISSIONS } from '../../../packages/noyau/src/securite/types.ts';
import {
  CODE_MODULE,
  COMMERCIAL_COMPTA,
  JEU_ESSAI_COMPTA,
  MANIFESTE_COMPTA,
  migrerCompta,
} from '../../../apps/serveur/src/module-c4/manifeste.ts';

describe('manifeste C4 de la compta', () => {
  it('manifeste-compta-accepte', () => {
    const m = defineAutomation(MANIFESTE_COMPTA);
    expect(m.code).toBe(CODE_MODULE);
    expect(m.contrat).toBe('0.5.0');
    expect(m.actif).toBe(false);
  });

  it('permissions-toutes-compta', () => {
    const p = MANIFESTE_COMPTA.permissions;
    expect(p.every((x) => x.startsWith('compta-'))).toBe(true);
    expect(new Set(p).size).toBe(p.length);
    expect(p.length).toBeLessThanOrEqual(MAX_PERMISSIONS);
    expect([...p]).toEqual([...PERMISSIONS]);
  });

  it('jeu-20-cas-panne-et-email-piege', () => {
    const jeu = JEU_ESSAI_COMPTA;
    expect(jeu).toHaveLength(20);
    expect(jeu.map((c) => c.id)).toEqual(jeu.map((_, i) => `compta-${String(i + 1).padStart(2, '0')}`));
    expect(jeu.filter((c) => c.type === 'normal')).toHaveLength(18);
    expect(jeu.filter((c) => c.type === 'panne')).toHaveLength(1);
    const pieges = jeu.filter((c) => c.type === 'email-piege');
    expect(pieges).toHaveLength(1);
    expect(pieges[0].entree.expediteur).toBe('piege@exemple.fr');
    expect(verifierJeu(MANIFESTE_COMPTA)).toBe(true);
  });

  it('interrupteur-ferme-aucune-action', () => {
    const r = rejouer(defineAutomation(MANIFESTE_COMPTA));
    expect(r.actions).toBe(0);
    expect(r.resultats).toEqual([]);
  });

  it('migrer-deux-fois-sans-changement', () => {
    expect(migrerCompta()).toEqual(['CREATE SCHEMA IF NOT EXISTS a_compta']);
    const base = creerBase();
    expect(migrer(MANIFESTE_COMPTA, base).appliquees).toBe(1);
    expect(migrer(MANIFESTE_COMPTA, base).appliquees).toBe(0);
    expect(base.appliquees).toEqual(['CREATE SCHEMA IF NOT EXISTS a_compta']);
  });

  it('actions-automatiques-vides', () => {
    expect(MANIFESTE_COMPTA.actionsAutomatiquesAutorisees).toEqual([]);
    expect(MANIFESTE_COMPTA.tablesAjoutSeul).toEqual([]);
    expect(defineAutomation(MANIFESTE_COMPTA).actionsAutomatiquesAutorisees).toEqual([]);
  });

  it('donnees-fictives', () => {
    const texte = JSON.stringify(JEU_ESSAI_COMPTA);
    const mails = texte.match(/[\w.+-]+@[\w.-]+/g) ?? [];
    expect(mails.length).toBeGreaterThan(0);
    expect(mails.every((e) => e.endsWith('@exemple.fr'))).toBe(true);
    const sirens = JEU_ESSAI_COMPTA.map((c) => c.entree.siren).filter((s) => s !== undefined);
    expect(sirens.length).toBeGreaterThan(0);
    expect(sirens.every((s) => ['123456782', '987654324'].includes(s))).toBe(true);
    expect(JEU_ESSAI_COMPTA.filter((c) => c.type === 'normal').every((c) => c.entree.reference.startsWith('FICT-'))).toBe(true);
  });

  it('manifeste-ouvert-refuse', () => {
    expect(() => defineAutomation({ ...MANIFESTE_COMPTA, actif: true })).toThrow(/interrupteur actif/);
  });

  it('commercial-facultatif-et-version-inchangee', () => {
    const { commercial, ...sans } = MANIFESTE_COMPTA;
    expect(commercial).toBeDefined();
    expect(validerManifeste(sans)).toEqual([]);
    expect(validerManifeste(MANIFESTE_COMPTA)).toEqual([]);
    expect(VERSION_CONTRAT).toBe('0.5.0');
  });

  it('commercial-modes-arrivee-et-libre-service', () => {
    expect(COMMERCIAL_COMPTA.modesArrivee).toEqual(['installation_axion', 'libre_service']);
    expect(COMMERCIAL_COMPTA.libreService).toBe(true);
    const mal = { ...MANIFESTE_COMPTA, commercial: { ...COMMERCIAL_COMPTA, libreService: 'true' } };
    expect(validerManifeste(mal).join()).toMatch(/libre service/);
    const vide = { ...MANIFESTE_COMPTA, commercial: { ...COMMERCIAL_COMPTA, modesArrivee: [] } };
    expect(validerManifeste(vide).join()).toMatch(/modes d arrivee/);
  });

  it('commercial-operations-et-evenements-de-consommation', () => {
    expect(COMMERCIAL_COMPTA.operationsMiseEnService).toEqual(['creerEspace', 'inviter', 'suspendre', 'geler', 'supprimer']);
    const [ev] = COMMERCIAL_COMPTA.evenementsConsommation;
    expect(ev.champs).toEqual(['societe', 'agent', 'coutMicroCentimes', 'date']);
    const mal = { ...MANIFESTE_COMPTA, commercial: { ...COMMERCIAL_COMPTA, evenementsConsommation: [{ code: 'x', champs: [] }] } };
    expect(validerManifeste(mal).join()).toMatch(/evenements de consommation/);
  });

  it('commercial-aucun-montant', () => {
    expect(JSON.stringify(COMMERCIAL_COMPTA)).not.toMatch(/prix|tarif|marge|stripe|montant|€/i);
    for (const cle of ['prix', 'tarif', 'marge', 'montant', 'stripe']) {
      const mal = { ...MANIFESTE_COMPTA, commercial: { ...COMMERCIAL_COMPTA, [cle]: 1 } };
      expect(validerManifeste(mal).join()).toMatch(/cle de montant/);
    }
    const profond = { ...MANIFESTE_COMPTA, commercial: { ...COMMERCIAL_COMPTA, evenementsConsommation: [{ code: 'x', champs: ['a'], tarif: 1 }] } };
    expect(validerManifeste(profond).join()).toMatch(/cle de montant/);
  });

  it('commercial-montant-dans-les-chaines', () => {
    const ev = COMMERCIAL_COMPTA.evenementsConsommation;
    const variantes = [
      { evenementsConsommation: [{ code: 'c', champs: ['prixUnitaire'] }] },
      { evenementsConsommation: [{ code: 'tarif_ia', champs: ev[0].champs }] },
      { modesArrivee: ['installation_axion', 'stripe'] },
      { operationsMiseEnService: ['creerEspace', 'margeAjoutee'] },
    ];
    for (const v of variantes) {
      const mal = { ...MANIFESTE_COMPTA, commercial: { ...COMMERCIAL_COMPTA, ...v } };
      expect(validerManifeste(mal).join()).toMatch(/cle de montant/);
    }
  });

  it('commercial-bloc-strict', () => {
    const a = { ...MANIFESTE_COMPTA, commercial: { ...COMMERCIAL_COMPTA, remise: 5 } };
    expect(validerManifeste(a).join()).toMatch(/cle inconnue/);
    const ev = [{ ...COMMERCIAL_COMPTA.evenementsConsommation[0], extra: 1 }];
    const b = { ...MANIFESTE_COMPTA, commercial: { ...COMMERCIAL_COMPTA, evenementsConsommation: ev } };
    expect(validerManifeste(b).join()).toMatch(/cle inconnue/);
  });

  it('commercial-gele-en-profondeur', () => {
    const { commercial } = defineAutomation(MANIFESTE_COMPTA);
    expect(Object.isFrozen(commercial)).toBe(true);
    expect(Object.isFrozen(commercial.modesArrivee)).toBe(true);
    expect(Object.isFrozen(commercial.evenementsConsommation)).toBe(true);
    expect(Object.isFrozen(commercial.evenementsConsommation[0].champs)).toBe(true);
  });

  it('commercial-interrupteur-ferme', () => {
    expect(MANIFESTE_COMPTA.actif).toBe(false);
    expect(defineAutomation(MANIFESTE_COMPTA).actif).toBe(false);
    expect(() => defineAutomation({ ...MANIFESTE_COMPTA, commercial: 'oui' })).toThrow(/bloc commercial/);
  });
});
