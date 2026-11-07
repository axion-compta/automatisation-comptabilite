// Étanchéité : la société vient de la session, jamais de la requête ; un export vit sous compta/<société>/.
export type CodeErreurEtancheite = 'session_sans_societe' | 'nom_invalide';

export class ErreurEtancheite extends Error {
  override name = 'ErreurEtancheite';
  readonly code: CodeErreurEtancheite;
  constructor(code: CodeErreurEtancheite, message: string) {
    super(message);
    this.code = code;
  }
}

export interface ReponseIntrouvable {
  readonly statutHttp: 404;
  readonly code: 'introuvable';
}

// Réponse unique : société étrangère et objet inexistant sont indiscernables (jamais 403).
export const REPONSE_INTROUVABLE: ReponseIntrouvable = Object.freeze({ statutHttp: 404, code: 'introuvable' });

export interface SessionSociete {
  societeId: string;
}

export type ResultatSociete = { ok: true; societeId: string } | { ok: false; reponse: ReponseIntrouvable };

function aControle(texte: string): boolean {
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte.charCodeAt(i);
    if (c < 32 || c === 127) return true;
  }
  return false;
}

function sansDanger(texte: string): boolean {
  return !(texte.includes('\\') || texte.includes('..') || aControle(texte));
}

function segmentValide(texte: string): boolean {
  return texte !== '' && !texte.includes('/') && !texte.startsWith('.') && sansDanger(texte);
}

function societeSession(session: SessionSociete): string {
  if (typeof session.societeId !== 'string' || session.societeId === '') {
    throw new ErreurEtancheite('session_sans_societe', 'La session ne porte aucune société.');
  }
  return session.societeId;
}

export function societeDeLaRequete(session: SessionSociete, demandee?: string): ResultatSociete {
  const societeId = societeSession(session);
  if (demandee === undefined || demandee === societeId) return { ok: true, societeId };
  return { ok: false, reponse: REPONSE_INTROUVABLE };
}

export function cheminExport(societeId: string, nomFichier: string): string {
  if (!segmentValide(societeId) || !segmentValide(nomFichier)) {
    throw new ErreurEtancheite('nom_invalide', 'Identifiant de société ou nom de fichier invalide.');
  }
  return `compta/${societeId}/${nomFichier}`;
}

export function exportAccessible(chemin: string, session: SessionSociete): boolean {
  if (typeof session.societeId !== 'string' || session.societeId === '') return false;
  return chemin.startsWith(`compta/${session.societeId}/`) && sansDanger(chemin);
}
