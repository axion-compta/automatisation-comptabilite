// Rattachement d'un relevé à un compte (V3-BAN-006, V3-BAN-007) : IBAN haché, puis solde, puis question.
import type { Centimes } from '../../argent/index.js';
import { estDateValide } from '../../dates/civiles.js';

export type EntreeRattachement = { ibanHache?: string; soldeOuverture?: Centimes; periodeDebut?: string };
export type CompteRattachable = {
  id: string;
  ibanHache?: string;
  ferme: boolean;
  dernierReleve?: { soldeCloture?: Centimes; periodeFin: string };
};
export type Rattachement =
  | { type: 'compte'; compteId: string; par: 'iban' | 'solde' | 'choix' }
  | { type: 'question'; comptes: string[] }
  | { type: 'mauvais_compte'; choisi: string; lu: string };

const triees = (comptes: CompteRattachable[]): string[] => comptes.map((c) => c.id).sort();

/** `memeIban` compare deux hachés (celui de L02-T18 en production). Le résultat ne dépend pas de l'ordre des comptes. */
export function rattacher(
  entree: EntreeRattachement,
  comptes: CompteRattachable[],
  compteChoisi: string | undefined,
  memeIban: (a: string, b: string) => boolean,
): Rattachement {
  const choisi = compteChoisi === undefined ? undefined : comptes.find((c) => c.id === compteChoisi);
  if (compteChoisi !== undefined && choisi === undefined) throw new Error('compte_inconnu');
  if (choisi?.ferme) throw new Error('compte_ferme');
  const ouverts = comptes.filter((c) => !c.ferme);

  const lu = entree.ibanHache;
  const parIban = lu === undefined ? [] : ouverts.filter((c) => c.ibanHache !== undefined && memeIban(lu, c.ibanHache));
  if (parIban.length === 1) {
    const trouve = parIban[0]!.id;
    if (choisi !== undefined && choisi.id !== trouve) return { type: 'mauvais_compte', choisi: choisi.id, lu: trouve };
    return { type: 'compte', compteId: trouve, par: 'iban' };
  }
  if (parIban.length > 1) return { type: 'question', comptes: triees(parIban) };
  if (choisi !== undefined) return { type: 'compte', compteId: choisi.id, par: 'choix' };

  const { soldeOuverture, periodeDebut } = entree;
  if (Number.isSafeInteger(soldeOuverture) && periodeDebut !== undefined && estDateValide(periodeDebut)) {
    const parSolde = ouverts.filter(({ dernierReleve: d }) => d !== undefined && d.soldeCloture === soldeOuverture && estDateValide(d.periodeFin) && d.periodeFin < periodeDebut);
    if (parSolde.length === 1) return { type: 'compte', compteId: parSolde[0]!.id, par: 'solde' };
    if (parSolde.length > 1) return { type: 'question', comptes: triees(parSolde) };
  }
  return { type: 'question', comptes: triees(ouverts) };
}
