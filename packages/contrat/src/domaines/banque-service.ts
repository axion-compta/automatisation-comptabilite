import { genererBanque } from '../../../donnees-fictives/src/banque.js';
import type { CompteBancaire, Explication, LigneBancaire, QueryLignes } from './banque.js';

type Etat = LigneBancaire['etat'];
const ETAT_PAR_MOT: Record<string, Etat> = { rattache: 'RAPPROCHEE', propose: 'PROPOSEE', hesite: 'DOUTEUSE', sans_piece: 'SANS_PIECE' };
const MOT_PAR_ETAT: Record<Etat, string> = {
  RAPPROCHEE: 'rattache', PROPOSEE: 'propose', DOUTEUSE: 'hesite', SANS_PIECE: 'sans_piece', SANS_PIECE_REQUISE: 'sans_piece',
  A_QUALIFIER: 'a_qualifier', NEUTRALISEE: 'neutralisee', PERSO: 'neutralisee', IGNOREE: 'ignoree',
};
const BANQUE = 'Banque Exemple';
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Service en mémoire pur, bâti sur le jeu fictif de la banque. Lecture seulement, IBAN toujours masqué. */
export function creerServiceBanque(jeu = genererBanque()) {
  const expl = new Map(jeu.explications.map((e) => [e.ligneId, e]));
  const etatDe = (id: string): Etat => {
    const mot = expl.get(id)?.codeMot;
    if (mot !== undefined && ETAT_PAR_MOT[mot]) return ETAT_PAR_MOT[mot];
    const a = jeu.attendus[id];
    return a === undefined ? 'A_QUALIFIER' : 'etat' in a ? a.etat : 'RAPPROCHEE';
  };
  const scoreDe = (id: string): number | undefined => {
    const f = expl.get(id)?.facteurs ?? [];
    return f.length === 0 ? undefined : f.reduce((s, x) => s + x.points, 0);
  };
  const comptes: CompteBancaire[] = jeu.comptes.map((c) => {
    const rel = jeu.releves.filter((r) => r.compteId === c.id).sort((a, b) => cmp(a.periodeFin, b.periodeFin));
    const dernier = rel[rel.length - 1];
    return {
      id: c.id, nom: c.nom, banque: BANQUE, ibanMasque: c.ibanMasque, devise: c.devise, type: c.type,
      soldeCentimes: dernier?.soldeCloture ?? 0, soldeLe: dernier?.periodeFin ?? '1970-01-01',
    };
  });
  const lignes = [...jeu.lignes]
    .sort((a, b) => cmp(a.dateOperation, b.dateOperation) || a.rang - b.rang)
    .map((l): LigneBancaire => {
      const score = scoreDe(l.id);
      return {
        id: l.id, compteId: l.compteId, date: l.dateOperation, montantCentimes: l.montant, devise: l.devise,
        ...(l.montantOrigine !== undefined ? { montantOrigineCentimes: l.montantOrigine } : {}),
        ...(l.deviseOrigine !== undefined ? { deviseOrigine: l.deviseOrigine } : {}),
        libelle: l.libelleBrut, etat: etatDe(l.id), ...(score !== undefined ? { score } : {}),
      };
    });

  return {
    comptes(): { body: CompteBancaire[]; decalage: number; total: number } {
      return { body: comptes, decalage: 0, total: comptes.length };
    },
    /** `undefined` si le compte filtré n'existe pas. `du`/`au` inclusifs ; `du` après `au` donne une liste vide. */
    lignes(q: QueryLignes = {}): { body: LigneBancaire[]; decalage: number; total: number } | undefined {
      if (q.compte !== undefined && !comptes.some((c) => c.id === q.compte)) return undefined;
      const filtrees = lignes.filter(
        (l) =>
          (q.etat === undefined || l.etat === q.etat) && (q.compte === undefined || l.compteId === q.compte) &&
          (q.du === undefined || l.date >= q.du) && (q.au === undefined || l.date <= q.au),
      );
      const decalage = q.decalage ?? 0;
      const fin = q.limite === undefined ? undefined : decalage + q.limite;
      return { body: filtrees.slice(decalage, fin), decalage, total: filtrees.length };
    },
    explication(id: string): { body: Explication } | undefined {
      const l = lignes.find((x) => x.id === id);
      if (!l) return undefined;
      const e = expl.get(id);
      const score = scoreDe(id);
      return {
        body: {
          codeMot: e?.codeMot ?? MOT_PAR_ETAT[l.etat], etat: l.etat, ...(score !== undefined ? { score } : {}),
          facteurs: (e?.facteurs ?? []).map((f) => ({ ...f, valeurs: {} })), autresCandidats: [],
        },
      };
    },
  };
}
