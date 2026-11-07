// garde:sous-traitants (V3-PLA-121, 124, 145, 050) : aucun fournisseur actif sans contrat archivé, hors de l'Union
// ou, pour un fournisseur d'IA, avec conservation. Le dépôt ne porte que des rôles et des références opaques.
// Fichier absent = vert ; présent sans l'en-tête exact = rouge. Limite : CSV simple (guillemets doubles gérés).
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ENTETE = 'ref,role,traitement_dans_ue,societe_mere_ue,conservation_chez_fournisseur,contrat_archive_le,annonce_le,active_le,actif';
const COLS = ENTETE.split(',');
const OUI_NON = ['oui', 'non'];
const ROLE = /^[a-zàâäçéèêëîïôöùûüÿœæ0-9'’ ]+$/;

function champs(ligne) {
  const out = [];
  let cur = '';
  let guil = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (guil) {
      if (c === '"' && ligne[i + 1] === '"') cur += ligne[i++];
      else if (c === '"') guil = false;
      else cur += c;
    } else if (c === '"') guil = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function dateReelle(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const ms = Date.parse(`${d}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === d;
}

// texte : contenu du fichier, ou null s'il est absent. Retourne la liste de problèmes { ligne, ref, code }.
export function analyserListe(texte) {
  if (texte === null || texte === undefined) return [];
  const lignes = texte.split(/\r?\n/);
  if (lignes[lignes.length - 1] === '') lignes.pop();
  if (lignes[0]?.charCodeAt(0) === 0xfeff) lignes[0] = lignes[0].slice(1);
  if (lignes[0] !== ENTETE) return [{ ligne: 1, ref: '', code: 'entete_invalide' }];
  const pb = [];
  const vus = new Set();
  lignes.slice(1).forEach((l, k) => {
    const n = k + 2;
    const c = champs(l);
    const ref = c[0] ?? '';
    const ajoute = (code) => pb.push({ ligne: n, ref, code });
    if (!/^[A-Z]{2,4}-\d{1,2}$/.test(ref)) ajoute('ref_invalide');
    else if (vus.has(ref)) ajoute('ref_en_double');
    vus.add(ref);
    if (c.length !== COLS.length) return ajoute('valeur_invalide');
    const v = Object.fromEntries(COLS.map((nom, i) => [nom, c[i]]));
    const actif = v.actif === 'oui';
    const ouiNonOk = (x) => OUI_NON.includes(x) || (x === '' && v.actif === 'non');
    const dates = [v.contrat_archive_le, v.annonce_le, v.active_le];
    const invalide =
      !OUI_NON.includes(v.actif) ||
      ![v.traitement_dans_ue, v.societe_mere_ue, v.conservation_chez_fournisseur].every(ouiNonOk) ||
      !dates.every((d) => d === '' || dateReelle(d));
    if (invalide) return ajoute('valeur_invalide');
    if (!ROLE.test(v.role)) ajoute('role_invalide');
    if (actif && v.contrat_archive_le === '') ajoute('actif_sans_contrat');
    if (actif && v.active_le === '') ajoute('actif_sans_activation');
    if (actif && v.traitement_dans_ue === 'non') ajoute('hors_ue');
    if (actif && ref.startsWith('IA-') && v.conservation_chez_fournisseur !== 'non') ajoute('ia_avec_conservation');
    if (v.contrat_archive_le !== '' && v.active_le !== '' && v.active_le < v.contrat_archive_le) ajoute('activation_avant_contrat');
    if (v.annonce_le !== '' && v.active_le !== '' && v.active_le < v.annonce_le) ajoute('activation_avant_annonce');
  });
  return pb;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const f = 'docs/sous-traitants.csv';
    const pb = analyserListe(existsSync(f) ? readFileSync(f, 'utf8') : null);
    if (pb.length > 0) {
      console.error('garde:sous-traitants ROUGE\n' + pb.map((p) => ` - ligne ${p.ligne} ${p.ref} : ${p.code}`).join('\n'));
      process.exit(1);
    }
    console.log('garde:sous-traitants vert');
  } catch (e) {
    console.error('garde:sous-traitants ROUGE\n - ' + e.message);
    process.exit(1);
  }
}
