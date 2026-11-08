// Contrat C4 (hypothese 0.5.0, en attente de la reponse de la console, D29) : validation du manifeste d'un module d'automatisation.
export const VERSION_CONTRAT = '0.5.0';
const NOM_TABLE = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const sansDoublon = (l) => new Set(l).size === l.length;

function tablesCreees(m) {
  const noms = new Set();
  for (const ins of m.migrer()) {
    const r = /create table (?:if not exists )?([a-z0-9_.]+)/.exec(String(ins).toLowerCase().replace(/\s+/g, ' '));
    if (r) noms.add(r[1]);
  }
  return noms;
}
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
  if (m.contrat !== undefined && m.contrat !== VERSION_CONTRAT) erreurs.push('version de contrat inconnue');
  const a = m.actionsAutomatiquesAutorisees;
  if (a !== undefined && !(Array.isArray(a) && a.every((x) => typeof x === 'string' && x.trim() !== '') && sansDoublon(a))) {
    erreurs.push('actions automatiques mal formees');
  }
  const t = m.tablesAjoutSeul;
  if (t !== undefined) {
    if (!(Array.isArray(t) && t.every((x) => typeof x === 'string' && NOM_TABLE.test(x)) && sansDoublon(t))) {
      erreurs.push('tables ajout seul mal formees');
    } else if (typeof m.migrer === 'function') {
      const creees = tablesCreees(m);
      for (const x of t) if (!creees.has(x)) erreurs.push(`table ajout seul non creee : ${x}`);
    }
  }
  return erreurs;
}

export function defineAutomation(manifeste) {
  const erreurs = validerManifeste(manifeste);
  if (erreurs.length > 0) throw new Error(`Manifeste refuse : ${erreurs.join(' ; ')}`);
  return Object.freeze({
    ...manifeste,
    permissions: Object.freeze([...manifeste.permissions]),
    actionsAutomatiquesAutorisees: Object.freeze([...(manifeste.actionsAutomatiquesAutorisees ?? [])]),
    tablesAjoutSeul: Object.freeze([...(manifeste.tablesAjoutSeul ?? [])]),
    jeuEssai: Object.freeze(manifeste.jeuEssai.map((c) => Object.freeze({ ...c }))),
  });
}
