import { ErreurDocument, verifierManifeste, type FichierDocument } from '../documents/empreinte.js';
import { creerAlerte } from '../exploitation/alertes.js';
import { bilan, type ResultatControle } from '../exploitation/restauration-controles.js';
import { ErreurExploitation, type Alerte } from '../exploitation/types.js';

const AUCUN = 0;
const entier = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n);
const trier = (c: ResultatControle[]): ResultatControle[] => c.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const impossible = (id: string): ResultatControle => ({ id, resultat: 'IMPOSSIBLE' });
const verdict = (id: string, ok: boolean, attendu: string, obtenu: string): ResultatControle =>
  ok ? { id, resultat: 'OK' } : { id, resultat: 'ECHEC', attendu, obtenu };

export function controleFec(resultats: { exercice: string; ok: boolean }[] | null, exercices: string[]): ResultatControle[] {
  if (resultats === null) return trier(exercices.map((e) => impossible(`fec:${e}`)));
  const vus = new Map<string, boolean>();
  for (const r of resultats) {
    if (!exercices.includes(r.exercice)) throw new ErreurExploitation('ordre_invalide');
    if (vus.has(r.exercice)) throw new ErreurExploitation('doublon');
    vus.set(r.exercice, r.ok);
  }
  return trier(exercices.map((e) => {
    const ok = vus.get(e);
    return ok === undefined ? impossible(`fec:${e}`) : verdict(`fec:${e}`, ok === true, 'controles_fec=ok', 'controles_fec=ko');
  }));
}

export function controleNombrePieces(lignesIndex: { pieceId: string }[], piecesEnBase: number): ResultatControle {
  const id = 'pieces';
  if (!entier(piecesEnBase) || piecesEnBase < AUCUN) return impossible(id);
  const distincts = new Set(lignesIndex.map((l) => l.pieceId)).size;
  return verdict(id, distincts === piecesEnBase, String(piecesEnBase), String(distincts));
}

export function controleManifeste(texte: string | null, fichiers: FichierDocument[]): ResultatControle {
  const id = 'manifeste';
  if (texte === null) return impossible(id);
  try {
    const r = verifierManifeste(texte, fichiers);
    return verdict(id, r.ok, 'ecarts=0', `manquants=${r.manquants.length};modifies=${r.modifies.length};en_trop=${r.enTrop.length}`);
  } catch (e) {
    if (e instanceof ErreurDocument) return { id, resultat: 'ECHEC', attendu: 'manifeste_lisible', obtenu: e.code };
    throw e;
  }
}

export function controleGrandLivre(lignes: { exercice: string; debit: number; credit: number }[]): ResultatControle[] {
  const totaux = new Map<string, { debit: number; credit: number } | null>();
  for (const l of lignes) {
    const t = totaux.get(l.exercice);
    if (t === null) continue;
    const base = t ?? { debit: AUCUN, credit: AUCUN };
    const debit = base.debit + (entier(l.debit) ? l.debit : Number.NaN);
    const credit = base.credit + (entier(l.credit) ? l.credit : Number.NaN);
    totaux.set(l.exercice, entier(debit) && entier(credit) ? { debit, credit } : null);
  }
  return trier([...totaux].map(([exercice, t]) => {
    const id = `grand_livre:${exercice}`;
    return t === null ? impossible(id) : verdict(id, t.debit === t.credit, 'debit=credit', `debit=${t.debit};credit=${t.credit}`);
  }));
}

export function deciderRemise(
  controles: ResultatControle[],
  clientRef: string | null,
  horodatage: string,
): { remise: 'permise' | 'bloquee'; alerte: Alerte | null } {
  const reussi = bilan(controles).reussi;
  const alerte = creerAlerte({ code: 'export_bloque', clientRef, horodatage });
  return reussi ? { remise: 'permise', alerte: null } : { remise: 'bloquee', alerte };
}
