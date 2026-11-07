import { describe, expect, it } from 'vitest';
import { appliquerTransition } from '../../../../../packages/noyau/src/pieces/etats.js';
import type { PieceComparee } from '../../../../../packages/noyau/src/pieces/classement/doublons.js';
import type { Ecriture } from '../../../../../packages/noyau/src/ecritures/modele.js';
import { etapeClassement, type ContexteClassement, type ResultatClassement } from '../etape-classement.js';
import { etapeAntivirus, etapeEntree, type ContexteEntree } from '../etape-entree.js';
import { etapeLecture, type ContexteLecture, type ResultatLecture } from '../etape-lecture.js';
import { etapePreparation } from '../etape-preparation.js';
import { AntivirusMemoire, DepotMemoire, HorlogeFixe, StockageMemoire } from '../ports-memoire.js';
import type { Extracteur, ResultatExtraction } from '../ports.js';
const TAUX = 1234;
const MARQUE = '\u0001';
const reglageEntree = { archive: { ratioMax: 100, totalMaxOctets: 1_000_000, nombreMax: 50 }, image: { coteMax: 5000, pixelsMax: 10_000_000 }, limites: { tailleMaxOctets: 1_000_000, pagesMaxFileNormale: 10, pagesMaxModele: 10 }, delaisRelanceMinutes: [5] };
const BAREME = { xml: 95, accordTextePdf: 90, accordOcr: 80, aSeul: 60, visionSeule: 50, echec: 0 };
const SEUILS = { sur: 85, douteux: 40 };
const lignes = (n: string, ttc = '112,34'): string =>
  `Facture N° F-2026-${n}\nDate de facture : 03/11/2026\nBase HT à 12,34 % : 100,00\nTVA à 12,34 % : 12,34\nTotal TTC : ${ttc}`;
const champ = (nom: string, valeur: string, citation = valeur): object => ({ nom, valeur, confiance_modele: 90, citation });
const reponse = (n: string, ttcA = '112,34'): string => JSON.stringify({
  type_piece: 'facture', langue: 'fr',
  champs: [champ('numero', `F-2026-${n}`), champ('date_piece', '2026-11-03', '03/11/2026'), champ('ttc', ttcA, '112,34'), champ(`ht@${TAUX}`, '100,00'), champ(`tva@${TAUX}`, '12,34')],
});
function monde(reponses: Map<string, string>, piege?: { numero: number }) {
  const stockage = new StockageMemoire();
  const depot = new DepotMemoire();
  const horloge = new HorlogeFixe('2026-11-07T08:00:00Z');
  let compteur = 0;
  const entree: ContexteEntree = {
    societeId: 'soc-fictive', nouvelId: () => `p-${String(++compteur)}`, stockage, depot, horloge, antivirus: new AntivirusMemoire(), reglage: reglageEntree,
    decompresser: () => new Uint8Array(),
  };
  const extracteur: Extracteur = {
    async extraire(octets) {
      const t = new TextDecoder().decode(octets).replace('%PDF-1.7 ', '').split(MARQUE)[0] ?? '';
      const el = { texte: t, page: 1, x: 10, y: 10, largeur: 100, hauteur: 12, taillePolice: 12, couleur: [0, 0, 0], couleurFond: [255, 255, 255], calqueVisible: true, annotationCachee: false } as ResultatExtraction['elements'][number];
      return { elements: [el], pages: [{ numero: 1, largeur: 600, hauteur: 800 }], nbPages: 1 };
    },
  };
  const stats = { appelsModele: 0, estimations: 0, piegeDeclenche: false };
  const journal = new Map<string, ResultatLecture>();
  const lecture: ContexteLecture = {
    depot, journal: { lire: async (c) => journal.get(c), ecrire: async (c, v) => void journal.set(c, v) }, suiviDepense: { microCentimes: 0 },
    modele: {
      estimer: () => {
        if (++stats.estimations === piege?.numero && !stats.piegeDeclenche) { stats.piegeDeclenche = true; throw new Error('coupure injectée'); }
        return 0;
      },
      completer: async (e) => { stats.appelsModele += 1; return { sortie: reponses.get(e.texte) ?? '{}', coutMicroCentimes: 1 }; },
    },
    reglage: {
      versionLecteur: 'v1', versionInvite: 1, plafondMicroCentimes: 1_000_000, convention: { decimal: ',', ordreDate: 'JMA' }, bareme: BAREME, seuils: SEUILS,
      arithmetique: { toleranceParTaux: 1, tolerancePieceMax: 2, toleranceParLigne: 1, toleranceLignesMax: 2, tauxConnusPdb: [TAUX] },
    },
  };
  const [existantes, propositions] = [new Map<string, PieceComparee>(), new Map<string, Ecriture>()];
  const classement: ContexteClassement = {
    depot, horloge, doublons: { autres: async (_s, sauf) => [...existantes.values()].filter((p) => p.id !== sauf), enregistrer: async (_s, p) => void existantes.set(p.id, p) },
    propositions: { creerSiAbsente: async (cle, e) => (propositions.has(cle) ? 'existe' : (propositions.set(cle, e), 'creee')) },
    reglage: { distanceImageMax: 0, journal: 'ACH', comptes: { charge: '606000', tvaDeductible: '445660', fournisseur: '401000' } },
  };
  const deposer = async (texte: string, variante = ''): Promise<string> => (await etapeEntree(new TextEncoder().encode(`%PDF-1.7 ${texte}${MARQUE}${variante}`), entree)).piece.id;
  async function suite(id: string): Promise<{ lecture?: ResultatLecture; classement?: ResultatClassement }> {
    let piece = await etapeAntivirus((await depot.parId(id))!, entree);
    const prep = await etapePreparation(piece, { stockage, extracteur, reglage: { seuilNettete: 100, texteCache: { ecartCouleurMax: 30, taillePoliceMin: 4 } } });
    if (piece.etat === 'quarantaine') { piece = { ...piece, etat: appliquerTransition(piece.etat, 'preparee') }; await depot.enregistrer(piece); }
    const l = await etapeLecture(piece, prep, lecture);
    if ('erreur' in l) throw new Error(l.erreur);
    return { lecture: l.resultat, ...(l.resultat.etat === 'lue' ? { classement: await etapeClassement(l.piece, l.resultat, classement) } : {}) };
  }
  return { depot, deposer, suite, stats, propositions, classement, journal };
}
describe('chaîne lecture et classement', () => {
  it('facture-simple-prete-une-proposition', async () => {
    const m = monde(new Map([[lignes('1'), reponse('1')]]));
    const r = await m.suite(await m.deposer(lignes('1')));
    expect(r.lecture?.etat).toBe('lue');
    expect(r.classement?.piece.etat).toBe('prete');
    expect(m.propositions.size).toBe(1);
    const e = [...m.propositions.values()][0]!;
    expect([e.statut, e.lignes.map((l) => [l.compte, l.debit, l.credit])]).toEqual(['brouillon', [['606000', 10000, 0], ['445660', 1234, 0], ['401000', 0, 11234]]]);
    expect(m.stats.appelsModele).toBe(1);
  });
  it('desaccord-ttc-seul-champ-douteux-aucune-proposition', async () => {
    const m = monde(new Map([[lignes('2'), reponse('2', '112,35')]]));
    const r = await m.suite(await m.deposer(lignes('2')));
    expect(r.lecture?.etat).toBe('a_verifier');
    expect(r.lecture?.motifs).toEqual(['champ_douteux']);
    expect(r.lecture?.champs.filter((c) => c.mot !== 'sur').map((c) => [c.nom, c.mot])).toEqual([['ttc', 'douteux']]);
    expect(m.propositions.size).toBe(0);
  });
  it('sensible-aucun-appel-au-modele', async () => {
    const m = monde(new Map());
    const r = await m.suite(await m.deposer(`Passeport fictif\n${lignes('3')}`));
    expect(r.lecture).toMatchObject({ etat: 'a_verifier', motifs: ['sensible'], sensible: true });
    expect(m.stats.appelsModele + m.stats.estimations).toBe(0);
    expect(m.propositions.size).toBe(0);
  });
  it('doublon-non-compte', async () => {
    const m = monde(new Map([[lignes('4'), reponse('4')]]));
    const [premiere, seconde] = [await m.suite(await m.deposer(lignes('4'))), await m.suite(await m.deposer(lignes('4'), 'v2'))];
    expect(premiere.classement?.comptee).toBe(true);
    expect(seconde.classement).toMatchObject({ comptee: false, motifNonComptee: 'doublon' });
    expect(seconde.classement?.piece.etat).toBe('a_verifier');
    expect(m.propositions.size).toBe(1);
  });
  it('ecart-arithmetique-a-verifier', async () => {
    const m = monde(new Map([[lignes('5', '112,50'), reponse('5', '112,50')]]));
    const r = await m.suite(await m.deposer(lignes('5', '112,50')));
    expect(r.lecture?.etat).toBe('a_verifier');
    expect(r.lecture?.motifs).toContain('ecart_arithmetique');
    expect((await m.depot.parId('p-1'))?.etat).toBe('a_verifier');
    expect(m.propositions.size).toBe(0);
  });
  it('plusieurs-factures-zero-ecriture', async () => {
    const texte = `${lignes('6')}\n${lignes('7')}`;
    const m = monde(new Map([[texte, reponse('6')]]));
    const r = await m.suite(await m.deposer(texte));
    expect(r.classement).toMatchObject({ type: 'plusieurs_factures', comptee: false, propositionCreee: false });
    expect(r.classement?.piece.etat).toBe('a_verifier');
    expect(m.propositions.size).toBe(0);
  });
  it('chaos-100-pieces-coupure-a-la-37e', async () => {
    const NB = 100;
    const COUPURE = 37;
    const textes = Array.from({ length: NB }, (_, i) => lignes(String(i + 1)));
    const m = monde(new Map(textes.map((t, i) => [t, reponse(String(i + 1))])), { numero: COUPURE });
    const ids: string[] = [];
    const passe = async (): Promise<void> => {
      for (let i = 0; i < NB; i += 1) await m.suite((ids[i] ??= await m.deposer(textes[i]!)));
    };
    await expect(passe()).rejects.toThrow('coupure injectée');
    expect(m.stats.appelsModele).toBe(COUPURE - 1);
    await passe();
    expect(ids).toHaveLength(NB);
    expect(new Set(ids).size).toBe(NB);
    expect(m.stats.appelsModele).toBe(NB);
    expect(m.journal.size).toBe(NB);
    expect(m.propositions.size).toBe(NB);
    expect((await Promise.all(ids.map((id) => m.depot.parId(id)))).every((p) => p?.etat === 'prete')).toBe(true);
  });
  it('relance-ne-cree-pas-de-seconde-ecriture', async () => {
    const m = monde(new Map([[lignes('8'), reponse('8')]]));
    const id = await m.deposer(lignes('8'));
    const premiere = await m.suite(id);
    expect(premiere.classement?.propositionCreee).toBe(true);
    const relance = await etapeClassement({ ...(await m.depot.parId(id))!, etat: 'lue' }, premiere.lecture!, m.classement);
    expect(relance.propositionCreee).toBe(false);
    expect(relance.cleIdempotence).toBe(premiere.classement?.cleIdempotence);
    expect(m.propositions.size).toBe(1);
    expect(m.stats.appelsModele).toBe(1);
  });
});
