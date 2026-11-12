import { genererVentes, type JeuVentes, type PieceVenteFictive } from '../../../donnees-fictives/src/ventes.js';
import { centimes } from '../../../noyau/src/argent/index.js';
import { etatAffiche } from '../../../noyau/src/ventes/etat.js';
import type { ClientDetail } from './clients.js';

const JOUR_MS = 86_400_000;
const jours = (de: string, a: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / JOUR_MS);

/** Service pur de lecture : fiche d'un client sur le jeu fictif. Aucune écriture. */
export function creerServiceClients(jeu: JeuVentes = genererVentes(), profil: 'pleine' | 'vide' = 'pleine') {
  const societe = jeu.societes.find((s) => s.profil === profil) ?? jeu.societes[0];
  const pieces = (societe?.pieces ?? []).filter((p) => p.type !== 'avoir' && p.statut !== 'doublon');

  const etat = (p: PieceVenteFictive) =>
    etatAffiche({
      statutPiece: p.statut,
      ...(p.statutEcriture ? { statutEcriture: p.statutEcriture } : {}),
      resteDu: centimes(p.resteDuCentimes),
      ...(p.echeance ? { echeance: p.echeance } : {}),
      dateReference: jeu.dateReference,
      enLitige: p.enLitige,
      lettrage: p.lettrage,
    });

  return {
    lire(code: string): ClientDetail | undefined {
      const c = societe?.clients.find((x) => x.code === code);
      if (!c) return undefined;
      const siennes = pieces.filter((p) => p.clientCode === code);
      const ouvertes = siennes.filter((p) => p.statutEcriture === 'valide' && p.resteDuCentimes > 0);
      const delais = siennes
        .filter((p) => p.resteDuCentimes === 0 && p.paiements.length > 0)
        .map((p) => jours(p.dateFacture, p.paiements.map((x) => x.date).sort().at(-1) as string));
      const derniere = [...siennes].sort((a, b) => a.dateFacture.localeCompare(b.dateFacture)).at(-1)?.lignes[0];
      return {
        code: c.code,
        nom: c.nom,
        nature: c.nature,
        ...(c.siren ? { siren: c.siren } : {}),
        ...(c.tva ? { tva: c.tva } : {}),
        statutVies: c.statutVies,
        soldeCentimes: ouvertes.reduce((s, p) => s + p.resteDuCentimes, 0),
        facturesOuvertes: ouvertes.map((p) => ({ id: p.id, numero: p.numero, resteDuCentimes: p.resteDuCentimes, etat: etat(p) })),
        delaiMoyenJours: delais.length === 0 ? null : Math.floor(delais.reduce((s, d) => s + d, 0) / delais.length),
        ...(derniere ? { habitude: { nature: derniere.nature, compteProduit: derniere.compteProduit } } : {}),
      };
    },
  };
}
