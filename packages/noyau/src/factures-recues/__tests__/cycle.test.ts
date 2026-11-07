import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import {
  type Arrivee,
  type EtatFacturesRecues,
  ErreurFactureRecue,
  cleDedoublonnage,
  recevoir,
  statutAEnvoyer,
  tvaComptee,
} from '../cycle.js';

const SOCIETE = '123456782';
const EMETTEUR = '987654324';
const vide: EtatFacturesRecues = Object.freeze({ factures: Object.freeze([]) as never });

const arrivee = (o: Partial<Arrivee> = {}): Arrivee => ({
  source: 'plateforme_a',
  idExterne: 'EXT-1',
  sirenEmetteur: EMETTEUR,
  sirenDestinataire: SOCIETE,
  numero: 'F-2026-001',
  date: '2026-03-10',
  ttc: centimes(12000),
  tva: centimes(2000),
  ...o,
});

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurFactureRecue ? e.code : 'autre';
  }
  return undefined;
};

describe('factures reçues', () => {
  it('nouvelle-facture', () => {
    const r = recevoir(vide, arrivee({ numero: ' f-2026 001 ' }), SOCIETE);
    expect(r.resultat).toBe('nouvelle');
    expect(r.etat.factures).toHaveLength(1);
    expect(r.etat.factures[0]).toMatchObject({ numero: 'F-2026001', rattacheeA: null, cle: `${EMETTEUR}|F-2026001|2026-03-10|12000` });
    expect(vide.factures).toHaveLength(0);
    expect(cleDedoublonnage({ sirenEmetteur: EMETTEUR, numero: 'a b', date: '2026-01-01', ttc: centimes(0) })).toBe(`${EMETTEUR}|AB|2026-01-01|0`);
    expect(code(() => recevoir(vide, arrivee({ numero: '   ' }), SOCIETE))).toBe('numero_invalide');
    expect(code(() => recevoir(vide, arrivee({ numero: '' }), SOCIETE))).toBe('numero_invalide');
    expect(code(() => recevoir(vide, arrivee({ sirenEmetteur: '12345' }), SOCIETE))).toBe('siren_invalide');
    expect(code(() => recevoir(vide, arrivee({ sirenDestinataire: 'abcdefghi' }), SOCIETE))).toBe('siren_invalide');
    expect(code(() => recevoir(vide, arrivee({ date: '2026-02-30x' }), SOCIETE))).toBe('date_invalide');
    expect(code(() => recevoir(vide, arrivee({ ttc: -100 as never }), SOCIETE))).toBe('montant_invalide');
    for (const m of [NaN, Infinity, 1.5]) {
      expect(code(() => recevoir(vide, arrivee({ ttc: m as never }), SOCIETE))).toBe('montant_invalide');
      expect(code(() => recevoir(vide, arrivee({ tva: m as never }), SOCIETE))).toBe('montant_invalide');
    }
  });

  it('rejeu-trois-fois-une-facture', () => {
    let etat = recevoir(vide, arrivee(), SOCIETE).etat;
    const avant = JSON.stringify(etat);
    for (let i = 0; i < 3; i++) {
      const r = recevoir(etat, arrivee(), SOCIETE);
      expect(r.resultat).toBe('rejouee');
      expect(r.etat).toBe(etat);
      etat = r.etat;
    }
    expect(etat.factures).toHaveLength(1);
    expect(JSON.stringify(etat)).toBe(avant);
    expect(tvaComptee(etat)).toBe(2000);
    // même idExterne depuis une autre source : pas un rejeu
    expect(recevoir(etat, arrivee({ source: 'depot_manuel', numero: 'Z9' }), SOCIETE).resultat).toBe('nouvelle');
  });

  it('deux-sources-un-doublon-rattache', () => {
    const premiere = recevoir(vide, arrivee(), SOCIETE);
    const seconde = recevoir(premiere.etat, arrivee({ source: 'depot_manuel', idExterne: 'M-7', numero: 'f-2026-001' }), SOCIETE);
    expect(seconde.resultat).toBe('doublon_rattache');
    expect(seconde.etat.factures).toHaveLength(2);
    expect(seconde.etat.factures[0]?.rattacheeA).toBeNull();
    expect(seconde.etat.factures[1]?.rattacheeA).toBe(seconde.etat.factures[0]?.cle);
    expect(premiere.etat.factures).toHaveLength(1);
    // ordre inversé : le premier arrivé reste l'original
    const inverse = recevoir(recevoir(vide, arrivee({ source: 'depot_manuel', idExterne: 'M-7' }), SOCIETE).etat, arrivee(), SOCIETE);
    expect(inverse.etat.factures[0]?.source).toBe('depot_manuel');
    expect(inverse.etat.factures[0]?.rattacheeA).toBeNull();
    expect(inverse.etat.factures[1]?.rattacheeA).toBe(inverse.etat.factures[0]?.cle);
    // un jour d'écart, un centime d'écart, un autre émetteur : pas des doublons
    for (const autre of [{ date: '2026-03-11' }, { ttc: centimes(12001) }, { sirenEmetteur: '123456782' }, { numero: 'F-2026-002' }]) {
      expect(recevoir(premiere.etat, arrivee({ source: 'depot_manuel', idExterne: 'M-8', ...autre }), SOCIETE).resultat).toBe('nouvelle');
    }
    // le doublon d'un doublon se rattache à l'original
    const troisieme = recevoir(seconde.etat, arrivee({ source: 'email', idExterne: 'E-1' }), SOCIETE);
    expect(troisieme.etat.factures[2]?.rattacheeA).toBe(troisieme.etat.factures[0]?.cle);
  });

  it('tva-comptee-une-fois', () => {
    expect(tvaComptee(vide)).toBe(0);
    let etat = recevoir(vide, arrivee(), SOCIETE).etat;
    etat = recevoir(etat, arrivee({ source: 'depot_manuel', idExterne: 'M-7' }), SOCIETE).etat;
    etat = recevoir(etat, arrivee({ source: 'email', idExterne: 'E-1' }), SOCIETE).etat;
    expect(tvaComptee(etat)).toBe(2000);
    etat = recevoir(etat, arrivee({ idExterne: 'EXT-2', numero: 'F-2', tva: centimes(550), ttc: centimes(3050) }), SOCIETE).etat;
    expect(tvaComptee(etat)).toBe(2550);
  });

  it('autre-destinataire-refuse', () => {
    const r = recevoir(vide, arrivee({ sirenDestinataire: EMETTEUR }), SOCIETE);
    expect(r.resultat).toBe('autre_destinataire');
    expect(r.etat.factures).toHaveLength(0);
    expect(tvaComptee(r.etat)).toBe(0);
    const base = recevoir(vide, arrivee(), SOCIETE).etat;
    expect(recevoir(base, arrivee({ idExterne: 'EXT-9', sirenDestinataire: EMETTEUR }), SOCIETE).etat).toBe(base);
  });

  const facture = recevoir(vide, arrivee(), SOCIETE).etat.factures[0]!;
  const permis = ['refusee', 'litige'] as const;

  it('statut-sans-validation-refuse', () => {
    expect(statutAEnvoyer(facture, 'refusee', permis)).toEqual({ ok: false, code: 'validation_client_requise' });
    expect(statutAEnvoyer(facture, 'refusee', permis, { par: '', le: '2026-05-12' })).toEqual({ ok: false, code: 'validation_client_requise' });
    expect(statutAEnvoyer(facture, 'refusee', permis, { par: 'Camille Fictif', le: ' ' })).toEqual({ ok: false, code: 'validation_client_requise' });
  });

  it('statut-apres-validation-trace', () => {
    expect(statutAEnvoyer(facture, 'litige', permis, { par: 'Camille Fictif', le: '2026-05-12' })).toEqual({
      ok: true,
      envoi: { statut: 'litige', validePar: 'Camille Fictif', valideLe: '2026-05-12' },
    });
  });

  it('statut-hors-liste-refuse', () => {
    const v = { par: 'Camille Fictif', le: '2026-05-12' };
    expect(statutAEnvoyer(facture, 'paye', permis, v)).toEqual({ ok: false, code: 'statut_inconnu' });
    expect(statutAEnvoyer(facture, 'refusee', [], v)).toEqual({ ok: false, code: 'statut_inconnu' });
    expect(statutAEnvoyer(facture, 'paye', permis)).toEqual({ ok: false, code: 'statut_inconnu' });
  });
});
