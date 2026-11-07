// Étape 4 (lecture) : lecteur A (modèle) et lecteur B (règles) sur le même texte transmissible, comparaison, contrôles, confiance. Reprise sans doublon par clé de tâche.
import { centimes, type Centimes } from '../../../../packages/noyau/src/argent/index.js';
import { appliquerTransition, cleTache } from '../../../../packages/noyau/src/pieces/etats.js';
import { comparerLecteurs } from '../../../../packages/noyau/src/pieces/lecture/comparaison.js';
import { confianceInterne, motDeConfiance, type BaremeConfiance, type ChampMot, type SeuilsConfiance } from '../../../../packages/noyau/src/pieces/lecture/confiance.js';
import { controlerArithmetique, type ReglageArithmetique } from '../../../../packages/noyau/src/pieces/lecture/arithmetique.js';
import type { ConventionPays } from '../../../../packages/noyau/src/pieces/lecture/conventions.js';
import { lireAvecRegles } from '../../../../packages/noyau/src/pieces/lecture/lecteur-b.js';
import type { ChampLu, SourceChamp, TypePiece } from '../../../../packages/noyau/src/pieces/types.js';
import { lireAvecModele, type ModeleTexte } from './lecteur-a.js';
import type { DepotPiecesEnregistrees, PieceEnregistree } from './ports.js';
import type { ResultatPreparation } from './etape-preparation.js';
export interface ReglageLecture {
  versionLecteur: string; versionInvite: number; plafondMicroCentimes: number; convention: ConventionPays;
  bareme: BaremeConfiance; seuils: SeuilsConfiance; arithmetique: ReglageArithmetique;
}
export interface JournalTaches<T> { lire(cle: string): Promise<T | undefined>; ecrire(cle: string, valeur: T): Promise<void> }
export interface ContexteLecture {
  depot: DepotPiecesEnregistrees; modele: ModeleTexte; reglage: ReglageLecture;
  journal: JournalTaches<ResultatLecture>; suiviDepense: { microCentimes: number };
}
export interface ResultatLecture {
  etat: 'lue' | 'a_verifier'; motifs: string[]; typePropose?: TypePiece; champs: ChampMot[];
  numero?: string; date?: string; ttc?: Centimes; parTaux: { tauxPdb: number; ht: Centimes; tva: Centimes }[];
  nombreDeNumeros: number; texte: string; sensible: boolean;
}
export type SortieLecture = { piece: PieceEnregistree; resultat: ResultatLecture } | { piece: PieceEnregistree; erreur: 'ia_indisponible' };
const MONTANTS = /^(ht|tva)@(\d+)$/;
const sansMontant: Pick<ResultatLecture, 'champs' | 'parTaux' | 'nombreDeNumeros' | 'texte'> = { champs: [], parTaux: [], nombreDeNumeros: 0, texte: '' };
function parTauxDe(champsB: ChampLu[]): ResultatLecture['parTaux'] {
  const taux = new Map<number, { ht: Centimes; tva: Centimes }>();
  for (const c of champsB) {
    const [, sorte, brut] = MONTANTS.exec(c.nom) ?? [];
    if (sorte === undefined || c.valeurCentimes === undefined) continue;
    const cle = Number(brut);
    const t = taux.get(cle) ?? { ht: centimes(0), tva: centimes(0) };
    taux.set(cle, sorte === 'ht' ? { ...t, ht: c.valeurCentimes } : { ...t, tva: c.valeurCentimes });
  }
  return [...taux].sort((a, b) => a[0] - b[0]).map(([tauxPdb, v]) => ({ tauxPdb, ...v }));
}
async function lire(piece: PieceEnregistree, prep: ResultatPreparation, ctx: ContexteLecture): Promise<ResultatLecture | 'ia_indisponible'> {
  const { reglage } = ctx;
  if (prep.texteTransmissible === null) return { ...sansMontant, etat: 'a_verifier', motifs: ['sensible'], sensible: true };
  const texte = prep.texteTransmissible;
  const source: SourceChamp = piece.typeReel === 'pdf' ? 'texte_pdf' : 'ocr';
  const a = await lireAvecModele({ texteTransmissible: texte, jetonsOpaques: {}, depenseMicroCentimes: ctx.suiviDepense.microCentimes, plafondMicroCentimes: reglage.plafondMicroCentimes, versionInvite: reglage.versionInvite }, ctx.modele);
  ctx.suiviDepense.microCentimes = a.depense;
  if ('erreur' in a) return 'ia_indisponible';
  if ('aVerifier' in a) return { ...sansMontant, texte, etat: 'a_verifier', motifs: [a.aVerifier], sensible: false };
  const b = lireAvecRegles({ texte, source, convention: reglage.convention, tauxConnusPdb: reglage.arithmetique.tauxConnusPdb });
  const comparaison = comparerLecteurs(a.champs, b.champs, texte);
  const motifs = new Set<string>(b.ambigus.filter((n) => n !== 'numero').map(() => 'champ_douteux'));
  const ttc = b.champs.find((c) => c.nom === 'ttc')?.valeurCentimes;
  const parTaux = parTauxDe(b.champs);
  let montantsKo = false;
  if (ttc === undefined) motifs.add('aucun_montant');
  else {
    const arith = controlerArithmetique({ parTaux, ttc }, reglage.arithmetique);
    arith.motifs.forEach((m) => motifs.add(m));
    montantsKo = arith.motifs.includes('ecart_arithmetique');
  }
  const champs: ChampMot[] = comparaison.map((c) => {
    const montant = c.nom === 'ttc' || MONTANTS.test(c.nom);
    const entree = { source: c.accord === 'seul_a' ? 'modele' as const : source, accord: c.accord, citationRetrouvee: c.citationRetrouvee, controlesPasses: !(montant && montantsKo) };
    if (c.douteux) motifs.add(c.accord !== 'seul_b' && !c.citationRetrouvee ? 'citation_introuvable' : 'champ_douteux');
    return { nom: c.nom, mot: motDeConfiance(confianceInterne(entree, reglage.bareme), reglage.seuils) };
  });
  const valeur = (nom: string): string | undefined => (b.champs.find((c) => c.nom === nom) ?? a.champs.find((c) => c.nom === nom))?.valeur;
  const numero = valeur('numero');
  const date = valeur('date_piece');
  return {
    etat: motifs.size === 0 ? 'lue' : 'a_verifier', motifs: [...motifs].sort(), typePropose: a.typePropose, champs, parTaux, texte, sensible: false,
    nombreDeNumeros: b.ambigus.includes('numero') ? 2 : numero === undefined ? 0 : 1,
    ...(numero === undefined ? {} : { numero }), ...(date === undefined ? {} : { date }), ...(ttc === undefined ? {} : { ttc }),
  };
}
export async function etapeLecture(piece: PieceEnregistree, prep: ResultatPreparation, ctx: ContexteLecture): Promise<SortieLecture> {
  const cle = cleTache(piece.id, 'lecture', ctx.reglage.versionLecteur);
  const connu = await ctx.journal.lire(cle);
  const resultat = connu ?? (await lire(piece, prep, ctx));
  if (resultat === 'ia_indisponible') return { piece, erreur: 'ia_indisponible' };
  if (connu === undefined) await ctx.journal.ecrire(cle, resultat);
  if (piece.etat !== 'preparee') return { piece, resultat };
  const suivante = { ...piece, etat: appliquerTransition(piece.etat, resultat.etat) };
  await ctx.depot.enregistrer(suivante);
  return { piece: suivante, resultat };
}
