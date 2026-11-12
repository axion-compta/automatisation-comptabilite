// Bénéficiaires effectifs : détection d'un changement de détention ou de contrôle et rappel de mise à jour.
// Fonctions pures ; aucun envoi, aucune adresse, aucun texte libre ; identifiants de personnes seulement.
// Le seuil est un paramètre daté fourni par l'appelant, « à vérifier » tant qu'il n'est pas confirmé.
import { verifierRepartition, type Associe } from '../profil/associes.js';

const TOTAL_PDB = 10000;

export type Detenteur = Associe & { controle?: boolean };
export type TypeChangement = 'hausse_au_dessus_du_seuil' | 'baisse_sous_le_seuil' | 'controle_acquis' | 'controle_perdu';
export interface Changement {
  id: string;
  type: TypeChangement;
}
export interface ResultatChangements {
  changements: Changement[];
  aVerifier: boolean;
}
export interface RappelMiseAJour {
  type: 'beneficiaires_effectifs_a_mettre_a_jour';
  personnes: string[];
  date: string;
  aVerifier: boolean;
  envoi: 'aucun';
}

export class ErreurBeneficiaires extends Error {
  override name = 'ErreurBeneficiaires';
  readonly code: 'entree_invalide';
  constructor(code: 'entree_invalide', message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

function exiger(ok: boolean, message: string): void {
  if (!ok) throw new ErreurBeneficiaires('entree_invalide', message);
}

function etat(liste: readonly Detenteur[]): Map<string, { part: number; controle: boolean }> {
  exiger(verifierRepartition(liste).valide, 'Répartition invalide.');
  return new Map(liste.filter((d) => d.nature === 'physique').map((d) => [d.id, { part: d.partPdb, controle: d.controle === true }]));
}

export function detecterChangements(
  avant: readonly Detenteur[],
  apres: readonly Detenteur[],
  { seuilPdb, seuilConfirme }: { seuilPdb: number; seuilConfirme: boolean },
): ResultatChangements {
  exiger(Number.isSafeInteger(seuilPdb) && seuilPdb >= 0 && seuilPdb <= TOTAL_PDB, 'Seuil invalide.');
  const a = etat(avant);
  const b = etat(apres);
  const changements: Changement[] = [];
  for (const id of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const x = a.get(id) ?? { part: 0, controle: false };
    const y = b.get(id) ?? { part: 0, controle: false };
    if (x.part < seuilPdb && y.part >= seuilPdb) changements.push({ id, type: 'hausse_au_dessus_du_seuil' });
    if (x.part >= seuilPdb && y.part < seuilPdb) changements.push({ id, type: 'baisse_sous_le_seuil' });
    if (!x.controle && y.controle) changements.push({ id, type: 'controle_acquis' });
    if (x.controle && !y.controle) changements.push({ id, type: 'controle_perdu' });
  }
  return { changements, aVerifier: !seuilConfirme };
}

export function rappelMiseAJour(resultat: ResultatChangements, date: string): RappelMiseAJour | null {
  exiger(/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)), 'Date invalide.');
  if (resultat.changements.length === 0) return null;
  const personnes = [...new Set(resultat.changements.map((c) => c.id))].sort();
  return { type: 'beneficiaires_effectifs_a_mettre_a_jour', personnes, date, aVerifier: resultat.aVerifier, envoi: 'aucun' };
}
