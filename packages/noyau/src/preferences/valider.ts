// Validation des préférences par liste blanche (spec 15, PR-R1, PR-R4, PR-R8). Codes seulement.

export type CodePreference = 'preference_invalide' | 'format_fixe' | 'raccourci_invalide';

export class ErreurPreference extends Error {
  override name = 'ErreurPreference';
  constructor(readonly code: CodePreference) {
    super(code);
  }
}

export type Appareil = 'bureau' | 'mobile' | 'tous';
export type PreferenceValidee = { cle: string; valeur: unknown; appareil: Appareil };

// Réglages d'interface (pas des valeurs légales).
const LARGEUR_MIN_PCT = 20;
const LARGEUR_MAX_PCT = 50;
const CLES_PAR_APPAREIL = new Set(['menu_etat', 'chat_etat', 'chat_largeur_pct']);
const CATEGORIES = ['a_valider', 'echeance', 'urgent', 'cabinet'];
const HEURE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const LETTRE = /^[a-z]$/;

const invalide = (): never => {
  throw new ErreurPreference('preference_invalide');
};

function parmi(valeur: unknown, permises: readonly string[]): string {
  return typeof valeur === 'string' && permises.includes(valeur) ? valeur : invalide();
}

function objet(valeur: unknown, champs: readonly string[]): Record<string, unknown> {
  if (typeof valeur !== 'object' || valeur === null || Array.isArray(valeur)) return invalide();
  const cles = Object.keys(valeur);
  if (cles.length !== champs.length || !champs.every((c) => Object.hasOwn(valeur, c))) return invalide();
  return valeur as Record<string, unknown>;
}

function booleen(valeur: unknown): boolean {
  return typeof valeur === 'boolean' ? valeur : invalide();
}

function raccourcis(valeur: unknown, reservees: readonly string[]): unknown {
  const o = objet(valeur, ['actifs', 'remap']);
  const actifs = booleen(o['actifs']);
  const remap = o['remap'];
  if (typeof remap !== 'object' || remap === null || Array.isArray(remap)) return invalide();
  const vues = new Set<string>();
  const propre: [string, string][] = [];
  for (const [action, lettre] of Object.entries(remap)) {
    if (typeof lettre !== 'string' || !LETTRE.test(lettre) || vues.has(lettre) || reservees.includes(lettre)) {
      throw new ErreurPreference('raccourci_invalide');
    }
    vues.add(lettre);
    propre.push([action, lettre]);
  }
  return { actifs, remap: Object.fromEntries(propre) };
}

function valeurDe(cle: string, valeur: unknown, reservees: readonly string[]): unknown {
  switch (cle) {
    case 'menu_etat':
      return parmi(valeur, ['ouvert', 'reduit']);
    case 'chat_etat':
      return parmi(valeur, ['reduit', 'normal', 'elargi', 'plein']);
    case 'chat_largeur_pct':
      if (typeof valeur !== 'number' || !Number.isInteger(valeur)) return invalide();
      return Math.min(LARGEUR_MAX_PCT, Math.max(LARGEUR_MIN_PCT, valeur));
    case 'mode':
      return parmi(valeur, ['simple', 'comptable']);
    case 'raccourcis':
      return raccourcis(valeur, reservees);
    case 'resume_email': {
      const o = objet(valeur, ['actif', 'heure']);
      const heure = o['heure'];
      if (typeof heure !== 'string' || !HEURE.test(heure)) return invalide();
      return { actif: booleen(o['actif']), heure };
    }
    case 'notif_categories':
      if (!Array.isArray(valeur) || new Set(valeur).size !== valeur.length) return invalide();
      return valeur.map((c) => parmi(c, CATEGORIES));
    case 'usage_mesure':
      return parmi(valeur, ['active', 'desactivee']);
    case 'premier_lancement':
      return { termine: booleen(objet(valeur, ['termine'])['termine']) };
    default:
      return invalide();
  }
}

/** Valide et normalise une préférence ; lève `ErreurPreference` (code seulement) sinon. */
export function validerPreference(
  cle: string,
  valeur: unknown,
  appareil: string,
  options: { lettresReservees?: readonly string[] } = {},
): PreferenceValidee {
  if (cle === 'format_nombre') throw new ErreurPreference('format_fixe');
  const connue = [...CLES_PAR_APPAREIL, 'mode', 'raccourcis', 'resume_email', 'notif_categories', 'usage_mesure', 'premier_lancement'];
  if (!connue.includes(cle)) return invalide();
  const attendu = CLES_PAR_APPAREIL.has(cle) ? ['bureau', 'mobile'] : ['tous'];
  if (!attendu.includes(appareil)) return invalide();
  return { cle, valeur: valeurDe(cle, valeur, options.lettresReservees ?? []), appareil: appareil as Appareil };
}
