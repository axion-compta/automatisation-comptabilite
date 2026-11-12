// Lanceur du banc réel (fiche L22-T23, V3-QUA-003, V3-QUA-025). Le banc est conservé HORS du dépôt :
// chemins par variables d'environnement, valeurs attendues dans un manifeste hors dépôt.
// Le rapport ne contient que des codes et des compteurs : jamais un montant, un libellé ni un chemin.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const VARIABLE_DOSSIER = 'BANC_REEL_DOSSIER';
export const VARIABLE_MANIFESTE = 'BANC_REEL_MANIFESTE';
export const MESSAGE_IGNORE = `Banc réel ignoré (fiche L22-T23) : définir ${VARIABLE_DOSSIER} et ${VARIABLE_MANIFESTE} sur la machine qui détient le banc.`;

const defini = (v) => typeof v === 'string' && v !== '';
export function variablesPresentes(env) {
  return defini(env?.[VARIABLE_DOSSIER]) && defini(env?.[VARIABLE_MANIFESTE]);
}

function lireJson(chemin) {
  try {
    return JSON.parse(readFileSync(chemin, 'utf8'));
  } catch {
    const e = new Error('fichier_illisible');
    e.code = 'fichier_illisible';
    throw e;
  }
}

const centimesValides = (n) => Number.isSafeInteger(n);
/** Comparaison exacte au centime : 1 centime d'écart suffit. */
const compare = (code, attendu, obtenu) => ({
  code,
  statut: centimesValides(attendu) && centimesValides(obtenu) && attendu === obtenu ? 'ok' : 'ecart',
});

/** Import simulé : une ligne est créée seulement si son identifiant est inconnu. */
function importer(lignes, connus) {
  let creees = 0;
  for (const l of lignes) {
    if (!connus.has(l.id)) {
      connus.add(l.id);
      creees++;
    }
  }
  return creees;
}

export async function lancerBancReel(env = process.env) {
  if (!variablesPresentes(env)) return { etat: 'ignore', message: MESSAGE_IGNORE };
  let manifeste, releve, constats;
  try {
    manifeste = lireJson(env[VARIABLE_MANIFESTE]);
    releve = lireJson(join(env[VARIABLE_DOSSIER], 'releve.json'));
    constats = lireJson(join(env[VARIABLE_DOSSIER], 'constats.json'));
  } catch (e) {
    return { etat: 'erreur', code: e.code ?? 'erreur_inconnue' };
  }
  if (!Array.isArray(releve?.lignes) || !Array.isArray(constats) || typeof manifeste?.releve !== 'object' || manifeste.releve === null) {
    return { etat: 'erreur', code: 'forme_invalide' };
  }
  const lignes = releve.lignes;
  const montants = lignes.map((l) => l.montant);
  if (!montants.every(centimesValides)) return { etat: 'erreur', code: 'forme_invalide' };
  const unique = [];
  const vus = new Set();
  for (const l of lignes) {
    if (!vus.has(l.id)) {
      vus.add(l.id);
      unique.push(l);
    }
  }
  // Les doublons d'identifiant sont comptés tels quels dans les totaux : un écart doit se voir.
  const debits = -montants.filter((m) => m < 0).reduce((t, m) => t + m, 0);
  const credits = montants.filter((m) => m > 0).reduce((t, m) => t + m, 0);
  const net = credits - debits;
  const m = manifeste.releve;
  const verifications = [
    compare('total_debits', m.totalDebits, debits),
    compare('total_credits', m.totalCredits, credits),
    compare('solde_ouverture', m.soldeOuverture, releve.soldeOuverture),
    compare('solde_cloture', m.soldeCloture, (releve.soldeOuverture ?? NaN) + net),
  ];
  const compteConstats = {};
  for (const c of constats) compteConstats[c.code] = (compteConstats[c.code] ?? 0) + 1;
  const codes = new Set([...Object.keys(manifeste.constats ?? {}), ...Object.keys(compteConstats)]);
  for (const code of [...codes].sort()) {
    verifications.push(compare(`constats:${code}`, manifeste.constats?.[code] ?? 0, compteConstats[code] ?? 0));
  }
  const connus = new Set();
  importer(unique, connus);
  const lignesCreees = importer(unique, connus);
  verifications.push({ code: 'reimport', statut: lignesCreees === 0 ? 'ok' : 'ecart' });
  return {
    etat: 'execute',
    ok: verifications.every((v) => v.statut === 'ok'),
    verifications,
    reimport: { lignesLues: lignes.length, lignesCreees },
    compteurs: { lignes: lignes.length, constats: constats.length },
  };
}
