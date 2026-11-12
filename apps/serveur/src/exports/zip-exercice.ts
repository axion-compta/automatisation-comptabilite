// Zip d'un exercice : rayons choisis, parties reprenables, manifeste global. Réutilise les briques de l'export complet.
// Interfaces seulement : aucun compartiment réel. Aucun effacement ici.
import { empreinteSha256 } from '../../../../packages/noyau/src/documents/empreinte.js';
import { ErreurExploitation } from '../../../../packages/noyau/src/exploitation/types.js';
import {
  decouper, manifesteGlobal, verifierParties, type PartieFaite,
} from '../../../../packages/noyau/src/export-complet/parties.js';
import { ecrirePartie } from '../../../../packages/noyau/src/export-complet/zip-partie.js';

export type FichierExercice = { chemin: string; taille: number; rayon: string; exerciceId: string };
export interface SourceExercice {
  lister(): Promise<FichierExercice[]>;
  lire(chemin: string): Promise<Uint8Array>;
}
export interface DepotExercice {
  deposer(cle: string, octets: Uint8Array): Promise<void>;
  lire(cle: string): Promise<Uint8Array | undefined>;
}
export interface SuiviExercice {
  faites(suiviId: string): Promise<PartieFaite[]>;
  noter(suiviId: string, p: PartieFaite): Promise<void>;
}
export type ResultatExercice = { parties: PartieFaite[]; manifesteEmpreinte: string };

const SEGMENT = /^[A-Za-z0-9_-]{1,64}$/;
export const TAILLE_MAX_PARTIE = 50 * 1024 * 1024;
export const NOM_MANIFESTE_EXERCICE = 'manifeste-global.sha256';

export async function exporterExercice(o: {
  exerciceId: string; rayons: readonly string[]; source: SourceExercice; depot: DepotExercice; suivi: SuiviExercice;
  tailleMax?: number;
}): Promise<ResultatExercice> {
  if (!SEGMENT.test(o.exerciceId) || o.rayons.length === 0 || !o.rayons.every((r) => SEGMENT.test(r))) {
    throw new ErreurExploitation('chemin_invalide');
  }
  const rayons = new Set(o.rayons);
  const retenus = (await o.source.lister()).filter((f) => f.exerciceId === o.exerciceId && rayons.has(f.rayon));
  const plan = decouper(retenus.map(({ chemin, taille }) => ({ chemin, taille })), o.tailleMax ?? TAILLE_MAX_PARTIE);
  // Le suivi dépend de l'exercice, des rayons et du plan : un contenu différent ne reprend jamais d'anciennes parties.
  const signature = empreinteSha256(JSON.stringify([...rayons].sort().concat(plan.map((p) => [p.nom, p.chemins, p.taille]).flat(2).map(String)))).slice(0, 16);
  const suiviId = `${o.exerciceId}-${signature}`;
  const prefixe = `exports/exercices/${suiviId}`;
  const notees = new Map((await o.suivi.faites(suiviId)).map((p) => [p.nom, p.empreinte]));
  const parties: PartieFaite[] = [];
  for (const partie of plan) {
    const cle = `${prefixe}/${partie.nom}`;
    const connue = notees.get(partie.nom);
    const relu = connue === undefined ? undefined : await o.depot.lire(cle);
    if (connue !== undefined && relu !== undefined && empreinteSha256(relu) === connue) {
      parties.push({ nom: partie.nom, empreinte: connue });
      continue;
    }
    const fichiers = await Promise.all(partie.chemins.map(async (chemin) => ({ chemin, octets: await o.source.lire(chemin) })));
    const { octets, empreinte } = ecrirePartie(fichiers);
    await o.depot.deposer(cle, octets);
    const faite = { nom: partie.nom, empreinte };
    await o.suivi.noter(suiviId, faite);
    parties.push(faite);
  }
  const texte = manifesteGlobal(parties);
  await o.depot.deposer(`${prefixe}/${NOM_MANIFESTE_EXERCICE}`, new TextEncoder().encode(texte));
  if (!verifierParties(plan, parties, texte).ok) throw new ErreurExploitation('controle_absent');
  return { parties, manifesteEmpreinte: empreinteSha256(texte) };
}
