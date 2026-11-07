// Journal des lectures d'un paramètre et statut calculé (spec 09 §03, D31). Aucune valeur légale ici.
// Union de codes d'ErreurParametre fermée : classe locale plutôt que modifier au-jour.ts.
import { z } from 'zod';
import { domaineOfficiel } from './source.js';

export type CodeErreurLecture = 'lecture_en_double' | 'lecture_invalide';

export class ErreurLecture extends Error {
  readonly code: CodeErreurLecture;
  constructor(code: CodeErreurLecture, detail = '') {
    super(detail === '' ? code : `${code} : ${detail}`);
    this.name = 'ErreurLecture';
    this.code = code;
  }
}

const dateReelle = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().split('T')[0] === s;
};

export const Lecture = z.object({
  parametreCle: z.string().min(1),
  lecteur: z.object({ id: z.string().min(1), modele: z.string().min(1), version: z.string().min(1) }),
  sourceUrl: z.string().refine(domaineOfficiel, 'url non officielle'),
  extrait: z.string().refine((s) => s.trim() !== '', 'extrait vide'),
  valeurLue: z.string(),
  luLe: z.string().refine(dateReelle, 'date invalide'),
  complete: z.boolean(),
  conclusion: z.enum(['concorde', 'differe', 'introuvable']),
});
export type Lecture = z.infer<typeof Lecture>;

export type Validateur = { id: string; type: 'personne' | 'agent' } | null;
export type StatutLu = 'non_verifie' | 'a_verifier' | 'valide';
export type MotifStatut =
  | 'une_seule_lecture'
  | 'lecture_partielle'
  | 'lecteurs_identiques'
  | 'desaccord'
  | 'introuvable'
  | 'sans_validateur'
  | 'validateur_agent';

/** Ajout seul : renvoie une nouvelle liste. */
export function ajouterLecture(journal: readonly Lecture[], lecture: unknown): readonly Lecture[] {
  const r = Lecture.safeParse(lecture);
  if (!r.success) throw new ErreurLecture('lecture_invalide', r.error.issues.map((i) => i.message).join(' ; '));
  const l = r.data;
  const doublon = journal.some(
    (x) => x.parametreCle === l.parametreCle && x.lecteur.id === l.lecteur.id && x.luLe === l.luLe,
  );
  if (doublon) throw new ErreurLecture('lecture_en_double', `${l.parametreCle} ${l.lecteur.id} ${l.luLe}`);
  return [...journal, l];
}

/** Deux lectures complètes concordantes, lecteurs d'id distincts, même valeur ; sans désaccord plus récent. */
function paireValide(lectures: readonly Lecture[]): boolean {
  const ok = lectures.filter((l) => l.complete && l.conclusion === 'concorde');
  for (const a of ok) {
    for (const b of ok) {
      if (a.lecteur.id === b.lecteur.id || a.valeurLue !== b.valeurLue) continue;
      const plusAncienne = a.luLe < b.luLe ? a.luLe : b.luLe;
      if (!lectures.some((l) => l.conclusion === 'differe' && l.luLe > plusAncienne)) return true;
    }
  }
  return false;
}

export function motifsStatut(journal: readonly Lecture[], cle: string, validateur: Validateur): MotifStatut[] {
  const lectures = journal.filter((l) => l.parametreCle === cle);
  if (lectures.length === 0) return [];
  const motifs: MotifStatut[] = [];
  const ok = lectures.filter((l) => l.complete && l.conclusion === 'concorde');
  if (lectures.some((l) => !l.complete)) motifs.push('lecture_partielle');
  if (lectures.some((l) => l.conclusion === 'introuvable')) motifs.push('introuvable');
  const valeurs = new Set(ok.map((l) => l.valeurLue));
  if (lectures.some((l) => l.conclusion === 'differe') || valeurs.size > 1) motifs.push('desaccord');
  if (ok[0] !== undefined && ok[1] === undefined) motifs.push('une_seule_lecture');
  if (ok[1] !== undefined && new Set(ok.map((l) => l.lecteur.id)).size === 1) motifs.push('lecteurs_identiques');
  if (paireValide(lectures)) {
    if (validateur === null) motifs.push('sans_validateur');
    else if (validateur.type === 'agent') motifs.push('validateur_agent');
  }
  return motifs;
}

export function statutCalcule(journal: readonly Lecture[], cle: string, validateur: Validateur): StatutLu {
  const lectures = journal.filter((l) => l.parametreCle === cle);
  if (lectures.length === 0) return 'non_verifie';
  return paireValide(lectures) && validateur !== null && validateur.type === 'personne' ? 'valide' : 'a_verifier';
}
