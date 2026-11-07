// Interrupteurs fermés par défaut : fermé, pilote (durée pleine), puis ouvert par une personne habilitée.
// Instants en millisecondes entières ; la durée du pilote est toujours fournie par l'appelant.
export type EtatCode = 'ferme' | 'pilote' | 'ouvert';
export type TypeActeur = 'personne' | 'service' | 'agent' | 'tache';

export interface EtatInterrupteur {
  code: string;
  etat: EtatCode;
  depuis: number;
}

export interface ContexteTransition {
  maintenant: number;
  dureePiloteMs: number;
  acteur: { type: TypeActeur; habilite: boolean };
  motif?: string;
}

export type CodeRefus =
  | 'passage_direct_interdit'
  | 'pilote_trop_court'
  | 'geste_requis'
  | 'motif_obligatoire'
  | 'deja_dans_cet_etat'
  | 'horloge_incoherente';

export type ResultatTransition = { ok: true; etat: EtatInterrupteur } | { ok: false; code: CodeRefus };

export class ErreurInterrupteur extends Error {
  override name = 'ErreurInterrupteur';
  readonly code = 'entree_invalide';
  constructor(message: string) {
    super(message);
  }
}

const ETATS: readonly string[] = ['ferme', 'pilote', 'ouvert'];
const ACTEURS: readonly string[] = ['personne', 'service', 'agent', 'tache'];

function instant(valeur: number, nom: string): void {
  if (!Number.isSafeInteger(valeur)) throw new ErreurInterrupteur(`${nom} doit être un entier sûr.`);
}

export function creerInterrupteur(code: string, maintenant: number): EtatInterrupteur {
  if (code.trim() === '') throw new ErreurInterrupteur('Le code ne peut pas être vide.');
  instant(maintenant, 'maintenant');
  return { code, etat: 'ferme', depuis: maintenant };
}

export function demanderTransition(
  etat: EtatInterrupteur,
  cible: EtatCode,
  ctx: ContexteTransition,
): ResultatTransition {
  if (!ETATS.includes(etat.etat) || !ETATS.includes(cible)) throw new ErreurInterrupteur('État inconnu.');
  if (!ACTEURS.includes(ctx.acteur.type)) throw new ErreurInterrupteur('Type d’acteur inconnu.');
  instant(etat.depuis, 'depuis');
  instant(ctx.maintenant, 'maintenant');
  instant(ctx.dureePiloteMs, 'dureePiloteMs');
  if (ctx.dureePiloteMs < 0) throw new ErreurInterrupteur('La durée ne peut pas être négative.');

  if (cible === etat.etat) return { ok: false, code: 'deja_dans_cet_etat' };
  const nouveau: ResultatTransition = { ok: true, etat: { code: etat.code, etat: cible, depuis: ctx.maintenant } };
  if (cible === 'ferme') return nouveau;
  if (ctx.maintenant < etat.depuis) return { ok: false, code: 'horloge_incoherente' };
  if (etat.etat === 'ferme' && cible === 'ouvert') return { ok: false, code: 'passage_direct_interdit' };
  if (ctx.acteur.type !== 'personne' || !ctx.acteur.habilite) return { ok: false, code: 'geste_requis' };
  if (cible === 'ouvert') {
    if (ctx.maintenant - etat.depuis < ctx.dureePiloteMs) return { ok: false, code: 'pilote_trop_court' };
    if (ctx.motif === undefined || ctx.motif.trim() === '') return { ok: false, code: 'motif_obligatoire' };
  }
  return nouveau;
}

export function envoisAuRetourFerme(file: readonly { id: string; parti: boolean }[]): {
  annules: string[];
  dejaPartis: string[];
} {
  const ids = (parti: boolean): string[] =>
    file
      .filter((e) => e.parti === parti)
      .map((e) => e.id)
      .sort();
  return { annules: ids(false), dejaPartis: ids(true) };
}
