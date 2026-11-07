// Rejeu du banc sur les réponses enregistrées d'un nouveau modèle d'IA (V3-CTL-012). Aucun appel à un modèle.
// `comparer` est `comparerRapports` (L12-T29), injecté. Usage : node rejouer-ia.mjs <reponses.json> <reference.json> <module-comparateur>
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Une réponse = { id, attendu: booléen (anomalie attendue), detecte: booléen (signalée par le modèle) }. */
export function construireRapport(reponses, versionCatalogue, versionsRegles) {
  const valide = Array.isArray(reponses) && reponses.length > 0 && reponses.every((c) => c !== null && typeof c === 'object'
    && typeof c.id === 'string' && typeof c.attendu === 'boolean' && typeof c.detecte === 'boolean');
  if (!valide || new Set(reponses.map((c) => c.id)).size !== reponses.length) throw new Error('reponses_invalides');
  const attendues = reponses.filter((c) => c.attendu);
  const propres = reponses.filter((c) => !c.attendu);
  return {
    versionCatalogue,
    versionsRegles,
    detectees: attendues.filter((c) => c.detecte).length,
    attendues: attendues.length,
    faussesAlertes: propres.filter((c) => c.detecte).length,
    propres: propres.length,
  };
}

export function rejouerIA({ reponses, reference, versionCatalogue, versionsRegles, comparer }) {
  if (typeof comparer !== 'function') throw new Error('comparateur_absent');
  const rapport = construireRapport(reponses, versionCatalogue, versionsRegles);
  return { rapport, ...comparer(reference, rapport) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [reponsesPath, referencePath, modulePath] = process.argv.slice(2);
  const lire = (p) => JSON.parse(readFileSync(p, 'utf8'));
  const reference = lire(referencePath);
  const { comparerRapports } = await import(pathToFileURL(modulePath).href);
  const r = rejouerIA({ reponses: lire(reponsesPath), reference, versionCatalogue: reference.versionCatalogue, versionsRegles: reference.versionsRegles, comparer: comparerRapports });
  console.log(JSON.stringify(r));
  process.exitCode = r.regression ? 1 : 0;
}
