import { genererCompta } from '../../../donnees-fictives/src/compta.js';
import { genererInterface } from '../../../donnees-fictives/src/interface.js';
import { correspondMot, ErreurRequete, lireRequete, normaliser } from '../../../noyau/src/recherche/requete.js';
import { ErreurExtrait, extrait, paginer, trier } from '../../../noyau/src/recherche/extrait.js';
import { BORNES_LIMITE, BORNES_Q, type CorpsRecherche, type ResultatRecherche } from './recherche.js';

export type EntreeIndex = {
  type: ResultatRecherche['type'];
  id: string;
  titre: string;
  texte: string;
  lien: string;
  date: string;
  exerciceId: string | null;
  montants?: number[];
  siren?: string;
};
export type ReponseService = { resultats: ResultatRecherche[]; curseurSuivant?: string; mot?: 'rien_trouve' } | { erreur: 'requete_invalide' | 'curseur_invalide' };

const LONGUEUR_EXTRAIT = 120;
const SIRENS_FICTIFS = ['123456782', '987654324'];
const COMMENTAIRES_FICTIFS = [
  'Relancer le fournisseur pour la facture de peinture',
  'Pièce en double à vérifier avec le client',
];

/** Index en mémoire bâti sur les jeux fictifs : pièces non sensibles, écritures validées, tiers, commentaires. */
export function construireIndex(): EntreeIndex[] {
  const societe = genererCompta().societes.find((s) => s.profil === 'pleine');
  const profil = genererInterface().profils.pleine;
  if (!societe) throw new Error('PROFIL_PLEINE_ABSENT');
  const exerciceDe = (date: string): string | null => societe.exercices.find((e) => e.debut <= date && date <= e.fin)?.id ?? null;
  const index: EntreeIndex[] = [];
  for (const p of profil.pieces) {
    if (p.sensible) continue;
    index.push({ type: 'piece', id: p.id, titre: p.nom, texte: p.texteLu, lien: `/pieces/${p.id}`, date: profil.jourDeReference, exerciceId: exerciceDe(profil.jourDeReference) });
  }
  for (const e of societe.ecritures) {
    if (e.statut !== 'validee') continue;
    const montants = e.lignes.flatMap((l) => [l.debitCentimes, l.creditCentimes]).filter((m) => m > 0);
    index.push({ type: 'ecriture', id: e.id, titre: `${e.journal} ${e.id}`, texte: e.lignes.map((l) => l.libelle).join(' '), lien: `/ecritures/${e.id}`, date: e.date, exerciceId: exerciceDe(e.date), montants });
  }
  societe.tiers.forEach((t, i) => {
    index.push({ type: 'tiers', id: t.code, titre: t.nom, texte: `${t.code} ${t.nom}`, lien: `/tiers/${t.code}`, date: profil.jourDeReference, exerciceId: null, siren: SIRENS_FICTIFS[i % SIRENS_FICTIFS.length] as string });
  });
  COMMENTAIRES_FICTIFS.forEach((texte, i) => {
    index.push({ type: 'commentaire', id: `com-${i + 1}`, titre: `Commentaire ${i + 1}`, texte, lien: `/commentaires/com-${i + 1}`, date: profil.jourDeReference, exerciceId: null });
  });
  return index;
}

/** Service en mémoire pur. Le texte cherché n'est ni conservé ni journalisé. */
export function creerServiceRecherche(index: EntreeIndex[] = construireIndex()) {
  return {
    chercher(corps: Pick<CorpsRecherche, 'q'> & Partial<CorpsRecherche>): ReponseService {
      let requete;
      try {
        requete = lireRequete(corps.q, BORNES_Q);
      } catch (e) {
        if (e instanceof ErreurRequete) return { erreur: 'requete_invalide' };
        throw e;
      }
      const types = corps.types === undefined || corps.types.length === 0 ? undefined : new Set(corps.types);
      const trouves: ResultatRecherche[] = [];
      for (const e of index) {
        if (types && !types.has(e.type)) continue;
        const titre = normaliser(e.titre);
        const texte = normaliser(e.texte);
        const dernier = requete.mots.length - 1;
        let score = 0;
        requete.mots.forEach((m, k) => {
          const prefixe = requete.dernierEnPrefixe && k === dernier;
          if (correspondMot(titre, m, prefixe)) score += 2;
          if (correspondMot(texte, m, prefixe)) score += 1;
        });
        if (requete.montantCentimes !== undefined && e.montants?.includes(requete.montantCentimes)) score += 1;
        if (requete.siren !== undefined && e.siren === requete.siren) score += 1;
        if (score === 0) continue;
        trouves.push({ type: e.type, id: e.id, titre: e.titre, extrait: extrait(e.texte, requete.mots, requete.dernierEnPrefixe, LONGUEUR_EXTRAIT), lien: e.lien, date: e.date, exerciceId: e.exerciceId, score });
      }
      try {
        const page = paginer(trier(trouves), { limite: corps.limite ?? BORNES_LIMITE.defaut, curseur: corps.curseur });
        return {
          resultats: page.elements,
          ...(page.curseurSuivant === undefined ? {} : { curseurSuivant: page.curseurSuivant }),
          ...(trouves.length === 0 ? { mot: 'rien_trouve' as const } : {}),
        };
      } catch (e) {
        if (e instanceof ErreurExtrait) return { erreur: 'curseur_invalide' };
        throw e;
      }
    },
  };
}
export type ServiceRechercheContrat = ReturnType<typeof creerServiceRecherche>;
