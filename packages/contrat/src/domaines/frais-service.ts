import { genererFrais, type JeuFrais } from '../../../donnees-fictives/src/frais.js';
import { calculerTotaux } from '../../../noyau/src/frais/totaux.js';
import { kmRetenus } from '../../../noyau/src/frais/trajet.js';
import { centimes } from '../../../noyau/src/argent/index.js';
import type { Frais, Trajet } from '../../../noyau/src/frais/types.js';
import type { FraisDetail, FraisResume, Totaux } from './frais.js';

export interface OptionsFrais {
  personne?: string | undefined;
  du?: string | undefined;
  au?: string | undefined;
  statut?: string | undefined;
  limite?: number | undefined;
  decalage?: number | undefined;
}

/** Levée quand `du` est après `au`. */
export class BornesInvalides extends Error {
  constructor() {
    super('BORNES_INVALIDES');
  }
}

/** Service en mémoire pur sur le jeu fictif des frais. Lecture seulement ; totaux du noyau. */
export function creerServiceFrais(jeu: JeuFrais = genererFrais()) {
  const trajets = new Map<string, Trajet>(jeu.trajets.map((t) => [t.fraisId, t]));
  const noyau = (f: JeuFrais['frais'][number]): Frais => {
    const { montantTtc, tva, partPersoTtc, ...reste } = f;
    return { ...(reste as Omit<Frais, 'montantTtc' | 'tva' | 'partPersoTtc'>), montantTtc: centimes(montantTtc), tva: centimes(tva), partPersoTtc: centimes(partPersoTtc) } as Frais;
  };
  const km = (id: string): number | undefined => {
    const t = trajets.get(id);
    return t === undefined ? undefined : kmRetenus(t);
  };
  const resume = (f: JeuFrais['frais'][number]): FraisResume => {
    const manque: string[] = [];
    if (f.nature === 'depense' && f.pieceId === undefined && f.motifSansJustificatif === undefined) manque.push('justificatif');
    if (f.payeur === 'a_confirmer') manque.push('payeur');
    const k = km(f.id);
    return {
      id: f.id, personneId: f.personneId, nature: f.nature, date: f.dateDepense, libelle: f.libelle, montantTtcCentimes: f.montantTtc, payeur: f.payeur, statut: f.statut as FraisResume['statut'],
      ...(manque.length > 0 ? { manque } : {}),
      ...(k !== undefined ? { kmDixiemes: k, montantTrajetCentimes: null } : {}),
    };
  };
  const tous = [...jeu.frais].sort((a, b) => (a.dateDepense !== b.dateDepense ? (a.dateDepense < b.dateDepense ? 1 : -1) : a.id < b.id ? -1 : 1));

  return {
    lister(o: OptionsFrais = {}): { body: FraisResume[]; decalage: number; total: number; totaux: Totaux } {
      if (o.du !== undefined && o.au !== undefined && o.du > o.au) throw new BornesInvalides();
      const sel = tous.filter(
        (f) => (o.personne === undefined || f.personneId === o.personne) && (o.du === undefined || f.dateDepense >= o.du) && (o.au === undefined || f.dateDepense <= o.au) && (o.statut === undefined || f.statut === o.statut),
      );
      const montants = new Map(sel.filter((f) => f.nature === 'trajet').map((f) => [f.id, null] as const));
      const kms = new Map(sel.flatMap((f) => { const k = km(f.id); return k === undefined ? [] : [[f.id, k] as const]; }));
      const t = calculerTotaux(sel.map(noyau), montants, kms);
      const decalage = o.decalage ?? 0;
      const fin = o.limite === undefined ? undefined : decalage + o.limite;
      return {
        body: sel.slice(decalage, fin).map(resume),
        decalage,
        total: sel.length,
        totaux: { aRembourserCentimes: t.aRembourser, enAttenteCentimes: t.enAttente, exclusCentimes: t.exclus, kmSansMontantDixiemes: t.kmSansMontant },
      };
    },
    /** `undefined` si le frais est inconnu. */
    lire(id: string): FraisDetail | undefined {
      const f = jeu.frais.find((x) => x.id === id);
      if (f === undefined) return undefined;
      const t = jeu.trajets.find((x) => x.fraisId === id);
      return {
        ...resume(f),
        ...(t ? { trajet: { depart: t.depart, arrivee: t.arrivee, motif: t.motif, kmSaisisDixiemes: t.kmSaisisDixiemes, allerRetour: t.allerRetour }, vehiculeId: t.vehiculeId } : {}),
        ...(f.pieceId !== undefined ? { pieceId: f.pieceId } : {}),
        ...(f.motifSansJustificatif !== undefined ? { motifSansJustificatif: f.motifSansJustificatif } : {}),
        partPersoTtcCentimes: f.partPersoTtc,
        version: f.version,
      };
    },
  };
}
export type ServiceFrais = ReturnType<typeof creerServiceFrais>;
