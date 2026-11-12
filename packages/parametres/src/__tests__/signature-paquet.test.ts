import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { ParametreLegal } from '../au-jour.js';
import type { PaquetParametres } from '../paquet.js';
import {
  activationAutorisee,
  cohorteDeploiement,
  octetsASigner,
  verifierPaquetSigne,
  type CleSignature,
} from '../signature-paquet.js';

// Paires de clés générées ici, jamais écrites dans le dépôt. Valeurs de paramètres INVENTÉES.
function paire(id: string, revoquee = false): { cle: CleSignature; privee: ReturnType<typeof generateKeyPairSync>['privateKey'] } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return { cle: { id, publique: publicKey.export({ type: 'spki', format: 'pem' }).toString(), revoquee }, privee: privateKey };
}
const ligne = (sur: Partial<ParametreLegal> = {}): ParametreLegal => ({
  cle: 'fictif.taux_a',
  pays: 'XX',
  valeur: '2000',
  effet_debut: '2026-01-01',
  effet_fin: null,
  statut: 'a_verifier',
  source: 'source fictive',
  date_releve: '2026-01-01',
  ...sur,
});
const paquet = (version: string, lignes: ParametreLegal[] = [ligne()]): PaquetParametres => ({ version, lignes });
const signer = (p: PaquetParametres, k: ReturnType<typeof paire>, cleId = k.cle.id) => ({
  cleId,
  valeur: sign(null, octetsASigner(p), k.privee).toString('base64'),
});

describe('paquet signé', () => {
  const k = paire('cle-1');
  const cles = [k.cle];

  it('paquet-signe-accepte', () => {
    const p = paquet('v2');
    expect(verifierPaquetSigne(p, signer(p, k), cles, 'v1')).toEqual({ accepte: true });
    // Première installation : rien d'installé.
    expect(verifierPaquetSigne(p, signer(p, k), cles, null)).toEqual({ accepte: true });
  });

  it('signature-alteree-refusee', () => {
    const p = paquet('v2');
    const s = signer(p, k);
    const altere = paquet('v2', [ligne({ valeur: '2100' })]);
    const r = verifierPaquetSigne(altere, s, cles, 'v1');
    expect(r).toMatchObject({ accepte: false, code: 'signature_invalide' });
    const illisible = verifierPaquetSigne(p, { cleId: 'cle-1', valeur: '***' }, cles, 'v1');
    expect(illisible).toMatchObject({ accepte: false, code: 'signature_invalide' });
    // Une clé inconnue est refusée avant toute vérification.
    expect(verifierPaquetSigne(p, signer(p, k, 'autre'), cles, 'v1')).toMatchObject({ accepte: false, code: 'cle_inconnue' });
    // Journal : une ligne par refus, sans contenu de paquet.
    if (!r.accepte) expect(r.journal).toEqual({ evenement: 'parametres.paquet_refuse', code: 'signature_invalide', version: 'v2' });
  });

  it('cle-revoquee-refusee', () => {
    const rev = paire('cle-rev', true);
    const p = paquet('v2');
    const r = verifierPaquetSigne(p, signer(p, rev), [k.cle, rev.cle], 'v1');
    expect(r).toMatchObject({ accepte: false, code: 'cle_revoquee' });
    if (!r.accepte) expect(r.journal.evenement).toBe('parametres.paquet_refuse');
  });

  it('paquet-plus-ancien-refuse', () => {
    for (const [version, installee] of [['v1', 'v2'], ['v2', 'v2'], ['v9', 'v10']] as const) {
      const p = paquet(version);
      const r = verifierPaquetSigne(p, signer(p, k), cles, installee);
      expect(r).toMatchObject({ accepte: false, code: 'retour_arriere' });
      if (!r.accepte) expect(r.journal).toEqual({ evenement: 'parametres.paquet_refuse', code: 'retour_arriere', version });
    }
    const p10 = paquet('v10');
    expect(verifierPaquetSigne(p10, signer(p10, k), cles, 'v9')).toEqual({ accepte: true });
  });

  it('zero-ligne-sans-source', () => {
    const p = paquet('v2', [ligne(), ligne({ cle: 'fictif.taux_b', source: '  ' })]);
    const r = verifierPaquetSigne(p, signer(p, k), cles, 'v1');
    expect(r).toMatchObject({ accepte: false, code: 'ligne_sans_source' });
    if (!r.accepte) expect(r.journal).toEqual({ evenement: 'parametres.paquet_refuse', code: 'ligne_sans_source', version: 'v2' });
  });

  it('paquet-n-plus-1-sur-incident', () => {
    // Une ligne fausse est corrigée par un paquet v2 ; revenir à v1 ou retirer sans changer de version est refusé.
    const v1 = paquet('v1', [ligne({ valeur: '9999' })]);
    const v2 = paquet('v2', [ligne({ valeur: '2000' })]);
    expect(verifierPaquetSigne(v2, signer(v2, k), cles, 'v1')).toEqual({ accepte: true });
    expect(verifierPaquetSigne(v1, signer(v1, k), cles, 'v2')).toMatchObject({ code: 'retour_arriere' });
    const retraitSilencieux = paquet('v1', []);
    expect(verifierPaquetSigne(retraitSilencieux, signer(retraitSilencieux, k), cles, 'v1')).toMatchObject({ code: 'retour_arriere' });
  });

  it('cohorte-deterministe', () => {
    const societes = Array.from({ length: 200 }, (_, i) => `soc-${i}`);
    for (const s of societes) {
      expect(cohorteDeploiement(s, 30, 'g1')).toBe(cohorteDeploiement(s, 30, 'g1'));
      expect(cohorteDeploiement(s, 0, 'g1')).toBe(false);
      expect(cohorteDeploiement(s, 100, 'g1')).toBe(true);
    }
    const dans = societes.filter((s) => cohorteDeploiement(s, 30, 'g1')).length;
    expect(dans).toBeGreaterThan(20);
    expect(dans).toBeLessThan(100);
    // La graine change la répartition.
    expect(societes.some((s) => cohorteDeploiement(s, 50, 'g1') !== cohorteDeploiement(s, 50, 'g2'))).toBe(true);
    // Une cohorte plus large contient la plus étroite.
    for (const s of societes) if (cohorteDeploiement(s, 20, 'g1')) expect(cohorteDeploiement(s, 60, 'g1')).toBe(true);
    expect(() => cohorteDeploiement('soc-1', 101, 'g1')).toThrow();
    expect(() => cohorteDeploiement('soc-1', -1, 'g1')).toThrow();
    expect(() => cohorteDeploiement('soc-1', 1.5, 'g1')).toThrow();
  });

  it('activation-refusee-si-frontieres-rouges', () => {
    const vert = paquet('v2', [
      ligne({ effet_debut: '2025-01-01', effet_fin: '2026-01-01' }),
      ligne({ valeur: '2100', effet_debut: '2026-01-01', effet_fin: null }),
    ]);
    expect(activationAutorisee(vert, 'XX')).toEqual({ autorisee: true });
    // Trou entre deux lignes : la veille de la seconde n'a plus de règle.
    const rouge = paquet('v2', [
      ligne({ effet_debut: '2025-01-01', effet_fin: '2025-06-01' }),
      ligne({ valeur: '2100', effet_debut: '2026-01-01', effet_fin: null }),
    ]);
    const r = activationAutorisee(rouge, 'XX');
    expect(r.autorisee).toBe(false);
    if (!r.autorisee) expect(r.ecarts.length).toBeGreaterThan(0);
  });
});
