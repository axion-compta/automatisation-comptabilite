import { genererVentes, type JeuVentes, type PieceVenteFictive } from '../../../donnees-fictives/src/ventes.js';
import { centimes } from '../../../noyau/src/argent/index.js';
import type { Ecriture } from '../../../noyau/src/ecritures/modele.js';
import { etatAffiche } from '../../../noyau/src/ventes/etat.js';
import { indicateursDuMois, type Creance } from '../../../noyau/src/ventes/indicateurs.js';
import { analyserSeries } from '../../../noyau/src/ventes/series.js';
import type { LigneTvaVente } from '../../../noyau/src/ventes/types.js';
import type { Indicateur, Indicateurs, Serie } from './ventes-indicateurs.js';

const COMPTES = { client: '411000', tvaCollectee: '445710', tvaEnAttente: '445800', avancesClients: '419100', banque: '512000' };
const MAX_TROUS = 20;

export interface OptionsIndicateurs {
  /** Profil de la société du jeu lue par le service. */
  profil?: 'pleine' | 'vide';
  /** Vrai seulement quand le régime de TVA est confirmé ; sinon aucun montant de TVA collectée. */
  regimeConfirme?: boolean;
}

const mapEcriture = (s: NonNullable<PieceVenteFictive['statutEcriture']>) => (s === 'propose' ? 'propose' : s === 'valide' ? 'valide' : 'brouillon');

/** Service pur de lecture : indicateurs du mois et suites de numéros sur le jeu fictif. Aucune écriture. */
export function creerServiceIndicateurs(jeu: JeuVentes = genererVentes(), options: OptionsIndicateurs = {}) {
  const societe = jeu.societes.find((s) => s.profil === (options.profil ?? 'pleine')) ?? jeu.societes[0];
  const pieces = societe?.pieces ?? [];

  const ecritures = pieces.flatMap((p): (Ecriture & { pieceId: string })[] => {
    if (!p.statutEcriture || p.statut === 'doublon') return [];
    const avoir = p.type === 'avoir';
    const ligne = (compte: string, montant: number, creditNormal: boolean) => ({
      compte,
      libelle: p.numero,
      debit: centimes(creditNormal === avoir ? montant : 0),
      credit: centimes(creditNormal === avoir ? 0 : montant),
    });
    return [
      {
        id: `E-${p.id}`,
        pieceId: p.id,
        journal: 'VE',
        date: p.dateFacture,
        statut: mapEcriture(p.statutEcriture),
        lignes: [...p.lignes.map((l) => ligne(l.compteProduit, l.htCentimes, true)), ligne(COMPTES.tvaEnAttente, p.tvaCentimes, true)],
      },
    ];
  });

  const lignesTva = pieces.flatMap((p): (LigneTvaVente & { statutEcriture: Ecriture['statut'] })[] =>
    !p.statutEcriture || p.statut === 'doublon'
      ? []
      : [
          {
            compte: COMPTES.tvaCollectee,
            tauxPdb: null,
            baseCentimes: centimes(p.htCentimes),
            tvaCentimes: centimes(p.tvaCentimes),
            codeTva: 'COLLECTEE',
            cas: societe?.cas ?? 'A',
            sens: p.type === 'avoir' ? 'avoir' : 'vente',
            dateExigibilite: p.dateFacture,
            pieceId: p.id,
            statutEcriture: mapEcriture(p.statutEcriture),
          },
        ],
  );

  const ouvertes = pieces.filter((p) => p.type !== 'avoir' && p.statut !== 'doublon' && p.statutEcriture === 'valide' && p.resteDuCentimes > 0);
  const enRetard = (p: PieceVenteFictive) =>
    etatAffiche({
      statutPiece: p.statut,
      ...(p.statutEcriture ? { statutEcriture: p.statutEcriture } : {}),
      resteDu: centimes(p.resteDuCentimes),
      ...(p.echeance ? { echeance: p.echeance } : {}),
      dateReference: jeu.dateReference,
      enLitige: p.enLitige,
      lettrage: p.lettrage,
    }) === 'en_retard';
  const creances: Creance[] = ouvertes.map((p) => ({ clientId: p.clientCode ?? p.id, resteDu: centimes(p.resteDuCentimes), enRetard: enRetard(p) }));

  const avecPieces = (i: { montant: number; pieces: string[] }, ids: string[]): Indicateur => ({ montantCentimes: i.montant, pieces: ids.length > 0 ? ids.sort() : i.pieces });

  return {
    lireIndicateurs(mois: string, avecPropositions = false): Indicateurs {
      const r = indicateursDuMois({
        mois,
        ecritures,
        lignesTva,
        creances,
        comptes: COMPTES,
        prefixeProduits: '7',
        regimeConfirme: options.regimeConfirme === true,
        avecPropositions,
      });
      const idsOuvertes = ouvertes.map((p) => p.id);
      const idsRetard = ouvertes.filter(enRetard).map((p) => p.id);
      return {
        chiffreAffaires: avecPieces(r.chiffreAffaires, []),
        aEncaisser: avecPieces(r.aEncaisser, idsOuvertes),
        enRetard: { ...avecPieces(r.enRetard, idsRetard), clients: r.enRetard.clients },
        tvaCollectee: 'nonCalculee' in r.tvaCollectee ? r.tvaCollectee : avecPieces(r.tvaCollectee, []),
        tvaEnAttente: avecPieces(r.tvaEnAttente, []),
        provisoire: r.provisoire,
      };
    },
    listerSeries(): Serie[] {
      return analyserSeries(
        pieces.map((p) => ({ id: p.id, numero: p.numero, dateFacture: p.dateFacture, ttc: centimes(p.ttcCentimes) })),
        { maxTrous: MAX_TROUS },
      ).map((s) => ({ serie: s.serie, dernierOrdreVu: s.dernierOrdreVu, trous: s.trous, tropDeTrous: s.tropDeTrous, doublons: s.doublons, datesQuiReculent: s.datesQuiReculent }));
    },
  };
}
