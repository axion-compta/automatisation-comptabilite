// Données fictives du lot 08 à graine fixe (V3-PRI-017, V3-PLA-052). Aucune donnée réelle, aucun prix.
// Types recopiés de L08-T01 : ce paquet n'importe pas le noyau. Empreintes : node:crypto (L03-T01 non utilisé).
import { createHash } from 'node:crypto';
import { creerAlea } from './generateur.js';

export type TypeDroit = 'acces' | 'rectification' | 'effacement' | 'limitation' | 'portabilite' | 'opposition';
export type EtatDemande = 'recue' | 'en_cours' | 'traitee' | 'refusee' | 'transmise_a_la_societe';
export type Marque = 'a_effacer' | 'limitee' | 'oubliee';
export type DemandePersonne = {
  id: string; societeId: string; type: TypeDroit; recueLe: string; echeance: string; etat: EtatDemande;
  traiteePar: string | null; traiteeLe: string | null; fichierReponseEmpreinte: string | null;
  motifRefus: string | null; sourceMotif: string | null;
};
export interface JeuRgpd {
  personnes: { id: string; nom: string; email: string }[];
  demandes: DemandePersonne[];
  pieces: { id: string; texteLu: string; recueLe: string; extension: string; empreinte: string; autresPersonnes: boolean }[];
  ecritures: { id: string; libelle: string }[];
  conversations: { id: string; texte: string; derniereActiviteLe: string }[];
  preferences: { id: string; personneId: string; texte: string; marques: Marque[] }[];
  signalements: { id: string; creeLe: string }[];
}

const NOMS = ['Camille Exemple', 'Dominique Essai', 'Claude Fictif'] as const;
const NB_PIECES = 30;
const NB_PIECES_CAMILLE = 12;
const NB_AVEC_AUTRE = 2;
const MOIS_ANCIEN = 13;
const SOCIETE = 'societe_exemple';
const OBJETS = ['Fournil Exemple', 'Papeterie Test', 'Atelier Essai', 'Garage Fictif'] as const;
// Écarts en jours par rapport à la date de référence : [reçue, échéance, type, état].
const PLAN_DEMANDES: readonly (readonly [number, number, TypeDroit, EtatDemande])[] = [
  [-50, -5, 'acces', 'en_cours'],
  [-20, 3, 'rectification', 'en_cours'],
  [-40, -2, 'effacement', 'traitee'],
  [-30, 1, 'limitation', 'refusee'],
  [-10, 4, 'portabilite', 'transmise_a_la_societe'],
  [-1, 5, 'opposition', 'recue'],
];

const sha = (t: string) => createHash('sha256').update(t).digest('hex');
const graineEnNombre = (g: string) => parseInt(sha(g).slice(0, 8), 16);
const slug = (n: string) => n.toLowerCase().replace(/ /g, '.');

function valider(d: string): number {
  const ms = /^\d{4}-\d{2}-\d{2}$/.test(d) ? Date.parse(`${d}T00:00:00Z`) : NaN;
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== d) throw new Error('date_invalide');
  return ms;
}
const plusJours = (d: string, n: number) => new Date(valider(d) + n * 86_400_000).toISOString().slice(0, 10);
function moinsMois(d: string, n: number): string {
  valider(d);
  const t = new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1 - n, 1));
  return `${t.toISOString().slice(0, 8)}01`;
}

export function genererRgpd(o: { graine?: string; dateReference: string }): JeuRgpd {
  const { graine = 'rgpd-v1', dateReference: ref } = o;
  valider(ref);
  const alea = creerAlea(graineEnNombre(graine));
  const objet = () => OBJETS[Math.floor(alea() * OBJETS.length)]!;
  const personnes = NOMS.map((nom, i) => ({ id: `pers_${i + 1}`, nom, email: `${slug(nom)}@exemple.fr` }));
  const [camille, dominique, claude] = NOMS;

  const lignes = Array.from({ length: NB_PIECES }, (_, i) => {
    const seul = `Pièce ${i + 1} : bon de commande ${objet()} réf. ${Math.floor(alea() * 1e6)}.`;
    if (i >= NB_PIECES_CAMILLE) return { texte: i === NB_PIECES - 1 ? `Facture ${objet()} adressée à ${dominique}.` : seul, autres: false };
    const autre = i < NB_AVEC_AUTRE ? ` Copie à ${i === 0 ? dominique : claude}.` : '';
    return { texte: `${seul} Contact : ${camille}.${autre}`, autres: autre !== '' };
  });
  const pieces = lignes.map((l, i) => {
    const facture = i === NB_PIECES - 1;
    return {
      id: `piece_${i + 1}`, texteLu: l.texte,
      recueLe: facture ? '2025-03-14' : plusJours(ref, -(i + 1)),
      extension: facture ? 'pdf' : i % 2 === 0 ? 'pdf' : 'jpg',
      empreinte: sha(l.texte), autresPersonnes: l.autres,
    };
  });

  const demandes: DemandePersonne[] = PLAN_DEMANDES.map(([r, e, type, etat], i) => {
    const traitee = etat === 'traitee' || etat === 'refusee';
    return {
      id: `dem_${i + 1}`, societeId: SOCIETE, type, recueLe: plusJours(ref, r), echeance: plusJours(ref, e), etat,
      traiteePar: traitee ? 'agent_exemple' : null, traiteeLe: traitee ? plusJours(ref, r + 2) : null,
      fichierReponseEmpreinte: etat === 'traitee' ? sha(`reponse ${i + 1} ${graine}`) : null,
      motifRefus: etat === 'refusee' ? 'Conservation exigée pour la tenue de la comptabilité.' : null,
      sourceMotif: etat === 'refusee' ? 'source_fictive_a_verifier' : null,
    };
  });

  return {
    personnes, demandes, pieces,
    ecritures: [{ id: 'ecr_1', libelle: `Facture exercice 2025 ${dominique}` }, { id: 'ecr_2', libelle: `Achat ${objet()}` }],
    conversations: [
      { id: 'conv_ancienne', texte: `Question de ${dominique} sur ${objet()}.`, derniereActiviteLe: moinsMois(ref, MOIS_ANCIEN) },
      { id: 'conv_recente', texte: `Question de ${camille} sur ${objet()}.`, derniereActiviteLe: moinsMois(ref, 1) },
    ],
    preferences: [{ id: 'pref_1', personneId: personnes[1]!.id, texte: `Réponses courtes, ton ${objet()}.`, marques: [] }],
    signalements: [{ id: 'sig_ancien', creeLe: moinsMois(ref, MOIS_ANCIEN) }, { id: 'sig_recent', creeLe: moinsMois(ref, 2) }],
  };
}
