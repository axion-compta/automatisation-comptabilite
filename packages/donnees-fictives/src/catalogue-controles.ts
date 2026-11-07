// Données fictives du catalogue de contrôles à graine fixe (V3-CTL-052, V3-CTL-071). Aucune donnée réelle.
// Types simples : ce paquet ne dépend pas du noyau.
import { creerAlea } from './generateur.js';

export type GraviteFictive = 'B' | 'M' | 'm' | 'I';
export type ResultatFictif = 'OK' | 'ALERTE' | 'IMPOSSIBLE' | 'NON_APPLICABLE' | 'ECARTE';

export interface SousIndicateurFictif {
  code: 'pieces' | 'ecritures' | 'tva' | 'banque' | 'controles';
  score: number;
}

export interface TraceFictive {
  horodatage: string;
  declencheur: 'continu' | 'avant_tva' | 'nocturne';
  regleId: string;
  versionRegle: number;
  objetType: 'facture' | 'paiement';
  objetId: string;
  resultat: ResultatFictif;
  ecartCentimes?: number;
}

export interface RegleFictive {
  id: string;
  gravite: GraviteFictive;
  bloque: string[];
}

export interface DonneesCatalogueControles {
  graine: number;
  societe: { nom: string; siren: string };
  fournisseur: { nom: string; siren: string };
  periode: { debut: string; fin: string };
  sante: { sousIndicateurs: SousIndicateurFictif[] };
  traces: TraceFictive[];
  regles: RegleFictive[];
}

const CODES: SousIndicateurFictif['code'][] = ['pieces', 'ecritures', 'tva', 'banque', 'controles'];
const REGLES: [string, GraviteFictive, string[], ResultatFictif][] = [
  ['CC-T02', 'B', ['tva', 'validation'], 'ALERTE'],
  ['CC-T05', 'B', ['tva'], 'IMPOSSIBLE'],
  ['CC-K01', 'B', ['validation', 'export', 'cloture'], 'ECARTE'],
  ['CC-K11', 'M', [], 'ALERTE'],
  ['CC-K13', 'M', [], 'ALERTE'],
  ['CC-K05', 'm', [], 'ALERTE'],
  ['CC-K06', 'm', [], 'ALERTE'],
  ['CC-K07', 'm', [], 'ALERTE'],
  ['CC-K04', 'I', [], 'OK'],
  ['CC-T03', 'I', [], 'OK'],
];

export function donneesCatalogueControles(graine: number): DonneesCatalogueControles {
  if (!Number.isInteger(graine)) throw new RangeError('graine doit être un entier');
  const alea = creerAlea(graine);
  const entier = (min: number, max: number) => min + Math.floor(alea() * (max - min + 1));
  const deux = (n: number) => String(n).padStart(2, '0');
  const sousIndicateurs = CODES.map((code) => ({ code, score: entier(40, 100) }));
  const traces = REGLES.map(([regleId, , , resultat], i): TraceFictive => ({
    horodatage: `2026-10-${deux(entier(1, 28))}T${deux(entier(0, 23))}:${deux(entier(0, 59))}:${deux(entier(0, 59))}Z`,
    declencheur: (['continu', 'avant_tva', 'nocturne'] as const)[i % 3] as TraceFictive['declencheur'],
    regleId,
    versionRegle: 1,
    objetType: i % 2 === 0 ? 'facture' : 'paiement',
    objetId: `F-2026-${String(entier(1, 9999)).padStart(4, '0')}`,
    resultat,
    ...(resultat === 'ALERTE' || resultat === 'ECARTE' ? { ecartCentimes: entier(1, 99999) } : {}),
  }));
  return {
    graine,
    societe: { nom: 'Lemoine Rénovation', siren: '123456782' },
    fournisseur: { nom: 'Garage Fontaine', siren: '987654324' },
    periode: { debut: '2026-10-01', fin: '2026-10-31' },
    sante: { sousIndicateurs },
    traces,
    regles: REGLES.map(([id, gravite, bloque]) => ({ id, gravite, bloque })),
  };
}
