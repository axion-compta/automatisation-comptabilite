// Contrat C4 (version 0) : validation du manifeste d'un module d'automatisation.
export const MAX_PERMISSIONS = 50;
export const MIN_CAS = 20;

export function validerManifeste(m) {
  const erreurs = [];
  if (m === null || typeof m !== 'object') return ['manifeste absent'];
  if (typeof m.code !== 'string' || m.code.trim() === '') erreurs.push('code manquant');
  if (typeof m.version !== 'string' || m.version.trim() === '') erreurs.push('version manquante');
  if (!Array.isArray(m.permissions)) {
    erreurs.push('permissions non declarees');
  } else if (m.permissions.length > MAX_PERMISSIONS) {
    erreurs.push(`trop de permissions (${m.permissions.length} > ${MAX_PERMISSIONS})`);
  }
  if (!Array.isArray(m.jeuEssai)) {
    erreurs.push('jeu d essai manquant');
  } else {
    if (m.jeuEssai.length < MIN_CAS) {
      erreurs.push(`jeu d essai trop court (${m.jeuEssai.length} < ${MIN_CAS})`);
    }
    if (!m.jeuEssai.some((c) => c && c.type === 'panne')) erreurs.push('aucune panne dans le jeu d essai');
    if (!m.jeuEssai.some((c) => c && c.type === 'email-piege')) {
      erreurs.push('aucun email piege dans le jeu d essai');
    }
  }
  if (typeof m.migrer !== 'function') erreurs.push('fonction migrer manquante');
  if (m.actif !== false) erreurs.push('interrupteur actif doit etre ferme (false) par defaut');
  return erreurs;
}

export function defineAutomation(manifeste) {
  const erreurs = validerManifeste(manifeste);
  if (erreurs.length > 0) throw new Error(`Manifeste refuse : ${erreurs.join(' ; ')}`);
  return Object.freeze({
    ...manifeste,
    permissions: Object.freeze([...manifeste.permissions]),
    jeuEssai: Object.freeze(manifeste.jeuEssai.map((c) => Object.freeze({ ...c }))),
  });
}
