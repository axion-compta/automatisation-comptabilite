// Mesure d'usage sans contenu (spec 15, PR-R7) : liste blanche des champs, données pseudonymisées.
import { createHmac } from 'node:crypto';

export const TYPES_USAGE: readonly string[] = Object.freeze([
  'ecran_ouvert',
  'carte_ouverte',
  'carte_resolue',
  'export_lance',
  'recherche_lancee',
  'preference_modifiee',
  'raccourci_utilise',
  'palette_ouverte',
]);

export type CodeRejet = 'champ_inconnu' | 'type_inconnu' | 'valeur_invalide';
export type EvenementUsage = {
  type: string;
  ecran_code?: string;
  duree_ms?: number;
  appareil?: 'bureau' | 'mobile';
  version_app?: string;
  horodatage?: number;
};

const CHAMPS = ['type', 'ecran_code', 'duree_ms', 'appareil', 'version_app', 'horodatage'];
const ECRAN = /^[a-z][a-z0-9]{1,5}$/;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
// Au-delà, la valeur est en millisecondes : refusée.
const HORODATAGE_MAX_SECONDES = 99_999_999_999;
const SECRET_MIN_OCTETS = 32;

function lireEvenement(brut: unknown, dureeMaxMs: number): EvenementUsage | CodeRejet {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return 'valeur_invalide';
  const o = brut as Record<string, unknown>;
  if (Object.keys(o).some((k) => !CHAMPS.includes(k))) return 'champ_inconnu';
  const type = o['type'];
  if (typeof type !== 'string' || !TYPES_USAGE.includes(type)) return 'type_inconnu';
  const e: EvenementUsage = { type };
  const { ecran_code, duree_ms, appareil, version_app, horodatage } = o;
  if (ecran_code !== undefined) {
    if (typeof ecran_code !== 'string' || !ECRAN.test(ecran_code)) return 'valeur_invalide';
    e.ecran_code = ecran_code;
  }
  if (duree_ms !== undefined) {
    if (typeof duree_ms !== 'number' || !Number.isInteger(duree_ms) || duree_ms < 0) return 'valeur_invalide';
    e.duree_ms = Math.min(duree_ms, dureeMaxMs);
  }
  if (appareil !== undefined) {
    if (appareil !== 'bureau' && appareil !== 'mobile') return 'valeur_invalide';
    e.appareil = appareil;
  }
  if (version_app !== undefined) {
    if (typeof version_app !== 'string' || !VERSION.test(version_app)) return 'valeur_invalide';
    e.version_app = version_app;
  }
  if (horodatage !== undefined) {
    if (typeof horodatage !== 'number' || !Number.isInteger(horodatage) || horodatage < 0 || horodatage > HORODATAGE_MAX_SECONDES) {
      return 'valeur_invalide';
    }
    e.horodatage = horodatage;
  }
  return e;
}

/** Garde les seuls champs de la liste blanche ; un événement refusé est jeté avec son code. */
export function validerEvenements(
  brut: unknown[],
  options: { dureeMaxMs: number },
): { acceptes: EvenementUsage[]; rejetes: { index: number; code: CodeRejet }[] } {
  const { dureeMaxMs } = options;
  if (!Number.isInteger(dureeMaxMs) || dureeMaxMs <= 0) throw new RangeError('dureeMaxMs doit être un entier positif');
  const acceptes: EvenementUsage[] = [];
  const rejetes: { index: number; code: CodeRejet }[] = [];
  brut.forEach((b, index) => {
    const r = lireEvenement(b, dureeMaxMs);
    if (typeof r === 'string') rejetes.push({ index, code: r });
    else acceptes.push(r);
  });
  return { acceptes, rejetes };
}

/** Référence pseudonymisée d'une personne : HMAC-SHA-256 hexadécimal avec un secret propre au client. */
export function pseudonyme(personneId: string, secret: string): string {
  if (typeof personneId !== 'string' || personneId === '') throw new Error('personneId vide');
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < SECRET_MIN_OCTETS) {
    throw new Error('secret trop court');
  }
  return createHmac('sha256', secret).update(personneId, 'utf8').digest('hex');
}

/** Liste à écrire : vide si la mesure est désactivée par la personne ou par l'installation. */
export function enregistrer(
  evenements: readonly EvenementUsage[],
  options: { mesure: 'active' | 'desactivee'; reglageInstallation?: 'desactivee' },
): EvenementUsage[] {
  if (options.reglageInstallation === 'desactivee' || options.mesure !== 'active') return [];
  return [...evenements];
}
