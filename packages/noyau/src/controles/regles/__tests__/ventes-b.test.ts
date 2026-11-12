import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { centimes as c } from '../../../argent/index.js';
import { executerControles, type RegleControle } from '../../moteur.js';
import * as R from '../ventes-b.js';

const { regleCCV11: V11, regleCCV12: V12, regleCCV13: V13, regleCCV14: V14, regleCCV15: V15, regleCCV16: V16, regleCCV17: V17, regleCCV18: V18, regleCCV19: V19, regleCCV20: V20 } = R;
const ev = <T>(r: RegleControle<T>, o: unknown) => r.evaluer(o as T);
const res = <T>(r: RegleControle<T>, o: unknown) => ev(r, o).resultat;

describe('CC-V11 facture avant immatriculation (A11)', () => {
  const o = (dateFacture: string, dateImmatriculation?: string) => ({
    dateFacture, exercices: [{ id: 'E1', debut: '2026-01-01', fin: '2026-12-31' }], periodesVerrouillees: [], ...(dateImmatriculation === undefined ? {} : { dateImmatriculation }),
  });
  it('CT-V11 le jour meme, apres ou sans date d immatriculation : OK', () => {
    for (const x of [o('2026-04-01', '2026-04-01'), o('2026-05-01', '2026-04-01'), o('2026-03-01')]) expect(res(V11, x)).toBe('OK');
  });
  it('CT-V11 facture la veille de l immatriculation : ALERTE', () => {
    expect(res(V11, o('2026-03-31', '2026-04-01'))).toBe('ALERTE');
  });
});

const fact = (id: string, numero: string, clientId: string, ttc: number, resteDu: number) => ({ id, numero, clientId, ttc: c(ttc), resteDu: c(resteDu) });
const F1 = fact('f1', 'FA-001', 'C1', 10000, 10000);
const avoir = (ttc: number, referenceLue?: string, clientId?: string) => ({ ttc: c(ttc), ...(referenceLue === undefined ? {} : { referenceLue }), ...(clientId === undefined ? {} : { clientId }) });

describe('CC-V12 avoir sans facture d origine (A12)', () => {
  it('CT-V12 reference lue, ou client et montant uniques : OK', () => {
    expect(res(V12, { avoir: avoir(5000, 'FA-001'), factures: [F1] })).toBe('OK');
    expect(res(V12, { avoir: avoir(10000, undefined, 'C1'), factures: [F1] })).toBe('OK');
  });
  it('CT-V12 aucune facture trouvee, ambigue ou liste vide : ALERTE', () => {
    expect(res(V12, { avoir: avoir(5000, 'FA-009', 'C2'), factures: [F1] })).toBe('ALERTE');
    expect(res(V12, { avoir: avoir(10000, undefined, 'C1'), factures: [F1, fact('f2', 'FA-002', 'C1', 10000, 10000)] })).toBe('ALERTE');
    expect(res(V12, { avoir: avoir(5000, 'FA-001'), factures: [] })).toBe('ALERTE');
  });
  it('CT-V12 ordre des factures inverse : meme resultat', () => {
    const f2 = fact('f2', 'FA-002', 'C1', 7000, 7000);
    expect(res(V12, { avoir: avoir(5000, 'FA-002'), factures: [f2, F1] })).toBe(res(V12, { avoir: avoir(5000, 'FA-002'), factures: [F1, f2] }));
  });
});

describe('CC-V13 avoir superieur au reste du (A13)', () => {
  it('CT-V13 avoir egal ou inferieur au reste du : OK', () => {
    expect(res(V13, { avoir: avoir(10000, 'FA-001'), factures: [F1] })).toBe('OK');
    expect(res(V13, { avoir: avoir(9999, 'FA-001'), factures: [F1] })).toBe('OK');
  });
  it('CT-V13 avoir d un centime au-dessus du reste du : ALERTE', () => {
    expect(res(V13, { avoir: avoir(10001, 'FA-001'), factures: [F1] })).toBe('ALERTE');
    expect(res(V13, { avoir: avoir(5000, 'FA-001'), factures: [fact('f1', 'FA-001', 'C1', 10000, 4999)] })).toBe('ALERTE');
  });
  it('CT-V13 avoir sans facture : ce n est pas A13', () => {
    expect(res(V13, { avoir: avoir(5000, 'FA-009', 'C2'), factures: [F1] })).toBe('OK');
    expect(res(V12, { avoir: avoir(10001, 'FA-001'), factures: [F1] })).toBe('OK');
  });
});

describe('CC-V14 acomptes et solde (A14)', () => {
  const o = (solde: number, acomptes = [3000, 3000]) => ({ totalTtc: c(12000), acomptesTtc: acomptes.map(c), soldeTtc: c(solde) });
  it('CT-V14 acomptes + solde = total : OK', () => {
    expect(ev(V14, o(6000))).toEqual({ resultat: 'OK' });
    expect(ev(V14, o(9000, [3000]))).toEqual({ resultat: 'OK' });
  });
  it('CT-V14 ecart signe en centimes : ALERTE', () => {
    expect(ev(V14, o(6100))).toEqual({ resultat: 'ALERTE', ecartCentimes: -100 });
    expect(ev(V14, o(5999))).toEqual({ resultat: 'ALERTE', ecartCentimes: 1 });
  });
});

describe('CC-V15 client professionnel sans identifiant (A15)', () => {
  const o = (nature: string, siren?: string, tva?: string) => ({ nature, ...(siren === undefined ? {} : { siren }), ...(tva === undefined ? {} : { tva }) });
  it('CT-V15 identifiant present ou client non professionnel : OK', () => {
    for (const x of [o('professionnel', '123456782'), o('professionnel', undefined, 'FR0000000'), o('professionnel', '1', '2'), o('particulier'), o('a_confirmer')]) expect(res(V15, x)).toBe('OK');
  });
  it('CT-V15 professionnel sans SIREN ni numero de TVA, ou vides : ALERTE', () => {
    for (const x of [o('professionnel'), o('professionnel', ''), o('professionnel', '  ', ''), o('professionnel', undefined, ' ')]) expect(res(V15, x)).toBe('ALERTE');
  });
});

describe('CC-V16 TVA facturee en franchise (A16)', () => {
  const comptes = { client: 'CLI', tvaCollectee: 'COL', tvaEnAttente: 'ATT', avancesClients: 'AVA', banque: 'BQ' };
  const o = (tva: number, regimeTva = 'franchise') => ({
    id: 'e1', journal: 'VT', auxiliaire: 'CLIENT1', comptes, profil: { tenue: 'partie_double', regimeTva, optionDebitsDepuis: null },
    piece: { id: 'p1', type: 'facture', origine: 'depot', numero: 'F-1', dateFacture: '2026-11-05', htCentimes: c(10000), tvaCentimes: c(tva), ttcCentimes: c(10000 + tva), statut: 'lue' },
    lignes: [{ libelle: 'x', htCentimes: c(10000), tauxPdb: tva === 0 ? null : 900, tvaLueCentimes: c(tva), nature: 'service', compteProduit: 'P706', codeTva: tva === 0 ? 'FRANCHISE' : 'COLLECTEE' }],
  });
  it('CT-V16 franchise sans TVA, ou societe a la TVA : OK', () => {
    expect(res(V16, o(0))).toBe('OK');
    expect(res(V16, o(900, 'reel'))).toBe('OK');
  });
  it('CT-V16 franchise avec TVA facturee : ALERTE', () => {
    expect(res(V16, o(900))).toBe('ALERTE');
  });
});

describe('CC-V17 client UE sans numero de TVA verifie (A17)', () => {
  const UE = ['DE', 'BE'];
  const o = (pays: string, statutVies: string, paysUe: unknown = UE) => ({ pays, statutVies, paysUe });
  it('CT-V17 numero verifie, ou pays hors liste : OK', () => {
    expect(res(V17, o('DE', 'verifie'))).toBe('OK');
    expect(res(V17, o('FR', 'non_verifie'))).toBe('OK');
    expect(res(V17, o('DE', 'invalide', []))).toBe('OK');
  });
  it('CT-V17 non verifie ou invalide dans un pays de la liste : ALERTE', () => {
    expect(res(V17, o('DE', 'non_verifie'))).toBe('ALERTE');
    expect(res(V17, o('BE', 'invalide'))).toBe('ALERTE');
    expect(res(V17, o('BE', 'invalide', [...UE].reverse()))).toBe('ALERTE');
  });
  const trace = (etat: string) => ({ etat, idRequete: 'req-0001', horodatage: '2027-03-04T10:11:12.000Z', empreinteReponse: 'ab'.repeat(32) });
  const exo = (verification: unknown, extra: Record<string, unknown> = {}) => ({ ...o('DE', 'verifie'), exoneree: true, verification, ...extra });
  it('a-confirmer-bloque-exoneration', () => {
    for (const etat of ['a_confirmer', 'invalide']) {
      const r = ev(V17, exo(trace(etat)));
      expect(r.resultat, etat).toBe('ALERTE');
      expect(r.valeur, etat).toBe(`${etat}|req-0001|2027-03-04T10:11:12.000Z|${'ab'.repeat(32)}`);
    }
    expect(ev(V17, exo(undefined)).resultat).toBe('ALERTE');
    expect(ev(V17, exo(undefined)).valeur).toBe('sans_trace');
    // Même hors de la liste des pays : une vente exonérée non confirmée lève le contrôle.
    expect(res(V17, exo(trace('a_confirmer'), { paysUe: [] }))).toBe('ALERTE');
    // Non exonérée : comportement historique inchangé.
    expect(res(V17, { ...o('DE', 'verifie'), exoneree: false, verification: trace('a_confirmer') })).toBe('OK');
  });
  it('valide-trace-permet-exoneration', () => {
    expect(res(V17, exo(trace('valide')))).toBe('OK');
    // Le statut enregistré reste contrôlé : une trace valide ne l'emporte pas sur un statut non vérifié.
    for (const statut of ['invalide', 'non_verifie']) expect(res(V17, exo(trace('valide'), { statutVies: statut }))).toBe('ALERTE');
    // Une trace valide mais incomplète ne permet pas l'exonération.
    for (const manque of ['idRequete', 'horodatage', 'empreinteReponse']) {
      expect(res(V17, exo({ ...trace('valide'), [manque]: '' })), manque).toBe('ALERTE');
      expect(res(V17, exo({ ...trace('valide'), [manque]: null })), manque).toBe('ALERTE');
      // Un champ réduit à des espaces compte comme vide.
      expect(res(V17, exo({ ...trace('valide'), [manque]: '  ' })), manque).toBe('ALERTE');
      expect(res(V17, exo({ ...trace('valide'), [manque]: ' x ' })), manque).toBe('OK');
    }
    // Champ manquant : valeur = état|id|horodatage|empreinte, le champ absent restant vide.
    expect(ev(V17, exo({ ...trace('valide'), idRequete: null })).valeur).toBe(`valide||2027-03-04T10:11:12.000Z|${'ab'.repeat(32)}`);
    expect(() => ev(V17, exo(trace('probablement')))).toThrow();
    expect(() => ev(V17, exo('x'))).toThrow();
    expect(() => ev(V17, exo(trace('valide'), { exoneree: 'oui' }))).toThrow();
  });
});

describe('CC-V18 client crediteur (A18)', () => {
  const taux = { tauxPdb: 1900, tvaInitiale: c(20000), baseInitiale: c(200000), tvaDejaExigible: c(0), baseDejaExigible: c(0) };
  const o = (montant: number) => ({
    id: 'e1', journal: 'BQ', date: '2026-11-20', montant: c(montant), codesLettrageExistants: [],
    comptes: { client: 'CLI', tvaCollectee: 'COL', tvaEnAttente: 'ATT', avancesClients: 'AVA', banque: 'BQ' },
    facture: { id: 'f1', auxiliaire: 'CLIENT1', cas: 'B', ttc: c(220000), dejaEncaisse: c(0), parTaux: [taux], ligneClient: { id: 'f1-1', compte: 'CLI', auxiliaire: 'CLIENT1', debit: c(220000), credit: c(0) } },
  });
  it('CT-V18 encaissement egal ou inferieur au reste du : OK', () => {
    expect(res(V18, o(220000))).toBe('OK');
    expect(res(V18, o(100000))).toBe('OK');
  });
  it('CT-V18 trop-percu d un centime : ALERTE', () => {
    expect(res(V18, o(220001))).toBe('ALERTE');
  });
});

describe('CC-V19 balance agee et solde client (A19)', () => {
  const cr = (factureId: string, resteDu: number) => ({ factureId, clientId: 'C1', resteDu: c(resteDu), dateFacture: '2026-01-10' });
  const o = (solde: number, creances = [cr('f1', 6000), cr('f2', 4000)], bornesJours: unknown = [30, 60]) => ({ creances, dateReference: '2026-06-30', bornesJours, solde411: c(solde) });
  it('CT-V19 balance egale au solde, ou liste vide a zero : OK', () => {
    expect(ev(V19, o(10000))).toEqual({ resultat: 'OK' });
    expect(ev(V19, o(0, []))).toEqual({ resultat: 'OK' });
  });
  it('CT-V19 ecart avec le solde : ALERTE avec ecart signe, ordre inverse identique', () => {
    expect(ev(V19, o(9900))).toEqual({ resultat: 'ALERTE', ecartCentimes: 100 });
    expect(ev(V19, o(10100))).toEqual({ resultat: 'ALERTE', ecartCentimes: -100 });
    expect(ev(V19, o(9900, [cr('f2', 4000), cr('f1', 6000)]))).toEqual(ev(V19, o(9900)));
  });
});

describe('CC-V20 facture a un professionnel hors plateforme agreee (A20)', () => {
  const o = (extra: Record<string, unknown> = {}) => ({
    dateFacture: '2026-10-01', paysClient: 'FR', natureClient: 'professionnel', origine: 'depot', parametre: { valeur: '2026-09-01', statut: 'valide' }, ...extra,
  });
  it('CT-V20 plateforme agreee, particulier, etranger ou avant la date : OK', () => {
    for (const x of [{ origine: 'plateforme_agreee' }, { natureClient: 'particulier' }, { paysClient: 'DE' }, { dateFacture: '2026-08-31' }]) expect(res(V20, o(x))).toBe('OK');
  });
  it('CT-V20 professionnel en France apres la date, hors plateforme : ALERTE', () => {
    expect(res(V20, o())).toBe('ALERTE');
    expect(res(V20, o({ dateFacture: '2026-09-01' }))).toBe('ALERTE');
    expect(res(V20, o({ parametre: { valeur: '2026-09-01', statut: 'a_verifier' } }))).toBe('ALERTE');
  });
});

const lignesCsv = readFileSync(new URL('../../../../../../docs/controles.csv', import.meta.url), 'utf8').split('\n');
const tous = R.reglesVentesB as unknown as RegleControle<never>[];
const lancer = (r: unknown, donnee: unknown, d: 'arrivee' | 'avant_tva' = 'arrivee') =>
  executerControles([r as RegleControle<never>], [{ type: 'vente', id: 'x', donnee: donnee as never }], d, 'h')[0]?.resultat;

describe('moteur', () => {
  it('exception-donne-impossible : donnee malformee = IMPOSSIBLE, jamais OK', () => {
    for (const r of tous) for (const mauvaise of [null, {}, 'x']) expect(lancer(r, mauvaise), r.id).toBe('IMPOSSIBLE');
    const bad = [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1];
    const cas: [unknown, unknown][] = [
      [V15, { nature: 'inconnue' }], [V15, { nature: 'professionnel', siren: 5 }],
      [V17, { pays: 'DE', statutVies: 'inconnu', paysUe: ['DE'] }], [V17, { pays: 'DE', statutVies: 'verifie', paysUe: 'DE' }],
      [V17, { pays: 5, statutVies: 'verifie', paysUe: [] }], [V17, { pays: 'DE', statutVies: 'verifie', paysUe: [5] }],
      [V20, { dateFacture: '2026-10-01', paysClient: 'FR', natureClient: 'professionnel', origine: 'depot' }],
      [V20, { dateFacture: 'x', paysClient: 'FR', natureClient: 'professionnel', origine: 'depot', parametre: { valeur: '2026-09-01', statut: 'valide' } }],
      [V12, { avoir: { ttc: 0 }, factures: [] }], [V13, { avoir: { ttc: c(5) }, factures: [{ ...F1, resteDu: -1 }] }],
      [V14, { totalTtc: c(1), acomptesTtc: [], soldeTtc: c(1) }],
      ...bad.flatMap((m) => [
        [V14, { totalTtc: m, acomptesTtc: [c(1)], soldeTtc: c(1) }], [V14, { totalTtc: c(2), acomptesTtc: [m], soldeTtc: c(1) }], [V14, { totalTtc: c(2), acomptesTtc: [c(1)], soldeTtc: m }],
        [V12, { avoir: { ttc: m }, factures: [F1] }],
        [V19, { creances: [{ factureId: 'f', clientId: 'C', resteDu: m === -1 ? Number.NaN : m, dateFacture: '2026-01-01' }], dateReference: '2026-06-30', bornesJours: [30], solde411: c(0) }],
        [V19, { creances: [], dateReference: '2026-06-30', bornesJours: [m], solde411: c(0) }],
      ] as [unknown, unknown][]),
    ];
    for (const [r, d] of cas) expect(lancer(r, d), JSON.stringify(d)).toBe('IMPOSSIBLE');
  });

  it('exigence-et-version-renseignees : ids, version 1, gravite, blocages, declencheurs, catalogue', () => {
    const [arr, tva] = [['arrivee', 'a_la_demande'], ['arrivee', 'avant_tva', 'a_la_demande']];
    const attendu = [
      ['CC-V11', 'M', [], tva], ['CC-V12', 'M', [], arr], ['CC-V13', 'M', [], arr], ['CC-V14', 'M', [], arr], ['CC-V15', 'm', [], arr],
      ['CC-V16', 'B', ['tva'], tva], ['CC-V17', 'M', [], arr], ['CC-V18', 'M', [], arr], ['CC-V19', 'B', ['cloture'], arr], ['CC-V20', 'M', [], arr],
    ];
    expect(tous.map((r) => [r.id, r.gravite, r.bloque, r.declencheurs])).toEqual(attendu);
    for (const r of tous) {
      expect([r.version, r.actif]).toEqual([1, true]);
      const l = lignesCsv.find((x) => x.startsWith(r.id + ','));
      expect(l, r.id).toMatch(/^CC-V\d\d,V3-VEN-021,.*,oui$/);
      expect(l).toContain(',CT-V' + r.id.slice(-2) + ',');
    }
    expect(lignesCsv.find((x) => x.startsWith('CC-V16,'))).toContain(',B,preparation_tva,');
    expect(lignesCsv.find((x) => x.startsWith('CC-V19,'))).toContain(',B,cloture,');
  });

  it('une trace par regle et par objet ; hors declencheur : aucune trace', () => {
    const donnee = { nature: 'particulier' };
    expect(executerControles([V15 as never], [{ type: 'vente', id: 'x', donnee: donnee as never }], 'arrivee', 'h')).toHaveLength(1);
    expect(executerControles([V15 as never], [{ type: 'vente', id: 'x', donnee: donnee as never }], 'avant_tva', 'h')).toHaveLength(0);
  });
});
