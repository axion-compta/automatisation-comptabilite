import { genererVentes, type JeuVentes, type PieceVenteFictive } from '../../../donnees-fictives/src/ventes.js';
import { centimes } from '../../../noyau/src/argent/index.js';
import { etatAffiche } from '../../../noyau/src/ventes/etat.js';
import type { VenteDetail, VenteResume } from './ventes.js';

const LIMITE_DEFAUT = 100;
const MS_PAR_JOUR = 86_400_000;

export interface FiltreVentes {
  etat?: string | undefined;
  client?: string | undefined;
  mois?: string | undefined;
  limite?: number | undefined;
  decalage?: number | undefined;
}

function joursEntre(debut: string, fin: string): number {
  return Math.round((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${debut}T00:00:00Z`)) / MS_PAR_JOUR);
}

/** Service pur de lecture des ventes sur le jeu fictif (société « pleine »). Aucune écriture. */
export function creerServiceVentes(jeu: JeuVentes = genererVentes()) {
  const societe = jeu.societes.find((s) => s.profil === 'pleine') ?? jeu.societes[0];
  const pieces: PieceVenteFictive[] = societe?.pieces ?? [];
  const clients = new Map((societe?.clients ?? []).map((c) => [c.code, c.nom]));
  const ids = new Set(pieces.map((p) => p.id));
  const rattache = (p: PieceVenteFictive) => p.type === 'avoir' && p.factureOrigineId !== undefined && ids.has(p.factureOrigineId);

  function resume(p: PieceVenteFictive): VenteResume {
    const etat = etatAffiche({
      statutPiece: p.statut,
      ...(p.statutEcriture ? { statutEcriture: p.statutEcriture } : {}),
      resteDu: centimes(p.resteDuCentimes),
      ...(p.echeance ? { echeance: p.echeance } : {}),
      dateReference: jeu.dateReference,
      enLitige: p.enLitige,
      lettrage: p.lettrage,
    });
    const nom = p.clientCode === undefined ? undefined : clients.get(p.clientCode);
    return {
      id: p.id,
      numero: p.numero,
      type: p.type,
      ...(p.clientCode !== undefined && nom !== undefined ? { client: { code: p.clientCode, nom } } : {}),
      dateFacture: p.dateFacture,
      ...(p.echeance ? { echeance: p.echeance } : {}),
      ttcCentimes: p.ttcCentimes,
      resteDuCentimes: p.resteDuCentimes,
      etat,
      ...(etat === 'en_retard' && p.echeance ? { joursDeRetard: Math.max(0, joursEntre(p.echeance, jeu.dateReference)) } : {}),
      avoirsLies: pieces.filter((a) => rattache(a) && a.factureOrigineId === p.id).map((a) => ({ id: a.id, ttcCentimes: a.ttcCentimes })),
    };
  }

  function ecriture(p: PieceVenteFictive): VenteDetail['ecriture'] {
    if (!p.statutEcriture) return undefined;
    const avoir = p.type === 'avoir';
    const ligne = (compte: string, montant: number, debit: boolean) => ({
      compte,
      debitCentimes: debit ? montant : 0,
      creditCentimes: debit ? 0 : montant,
    });
    return {
      statut: p.statutEcriture,
      lignes: [
        ligne('411000', p.ttcCentimes, !avoir),
        ...p.lignes.map((l) => ligne(l.compteProduit, l.htCentimes, avoir)),
        ligne('445710', p.tvaCentimes, avoir),
      ],
    };
  }

  return {
    lister(f: FiltreVentes = {}) {
      const tous = pieces
        .filter((p) => !rattache(p))
        .map(resume)
        .filter((v) => (f.etat === undefined || v.etat === f.etat) && (f.client === undefined || v.client?.code === f.client))
        .filter((v) => f.mois === undefined || v.dateFacture.startsWith(f.mois))
        .sort((a, b) => (a.dateFacture === b.dateFacture ? (a.id < b.id ? -1 : 1) : a.dateFacture < b.dateFacture ? 1 : -1));
      const decalage = f.decalage ?? 0;
      return { body: tous.slice(decalage, decalage + (f.limite ?? LIMITE_DEFAUT)), decalage, total: tous.length };
    },
    lire(id: string): VenteDetail | null {
      const p = pieces.find((x) => x.id === id);
      if (!p) return null;
      const e = ecriture(p);
      return {
        ...resume(p),
        origine: p.origine,
        lignes: p.lignes.map((l) => ({ libelle: l.libelle, quantite: 1, ttcCentimes: l.htCentimes + l.tvaLueCentimes })),
        cartes: p.cartes.map((code) => ({ code, mot: 'a_verifier', message: `Contrôle ${code} à examiner.` })),
        ...(e ? { ecriture: e } : {}),
        paiements: p.paiements.map((x) => ({ date: x.date, montantCentimes: x.montantCentimes })),
      };
    },
  };
}
