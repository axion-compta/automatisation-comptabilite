// Source officielle d'un paramètre légal (spec 09 §03, D31). Aucune valeur légale ici.
import { z } from 'zod';
import { ParametreLegal } from './au-jour.js';

export const DOMAINES_OFFICIELS = [
  'legifrance.gouv.fr',
  'bofip.impots.gouv.fr',
  'impots.gouv.fr',
  'entreprendre.service-public.gouv.fr',
  'economie.gouv.fr',
] as const;

/** Vrai si l'URL est en https, sans identifiants, et que l'hôte est un domaine permis ou l'un de ses sous-domaines. */
export function domaineOfficiel(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' || u.username !== '' || u.password !== '') return false;
  const hote = u.hostname.toLowerCase();
  return DOMAINES_OFFICIELS.some((d) => hote === d || hote.endsWith('.' + d));
}

const dateIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date AAAA-MM-JJ attendue');

export const ParametreSource = ParametreLegal.extend({
  source_url: z.string(),
  source_titre: z.string().min(1, 'titre vide'),
  source_maj: dateIso.nullable(),
  date_releve: dateIso,
}).superRefine((p, ctx) => {
  if (!domaineOfficiel(p.source_url)) {
    ctx.addIssue({ code: 'custom', path: ['source_url'], message: 'url non officielle' });
  }
  if (p.source_maj !== null && p.date_releve < p.source_maj) {
    ctx.addIssue({ code: 'custom', path: ['date_releve'], message: 'releve avant maj' });
  }
});
export type ParametreSource = z.infer<typeof ParametreSource>;

export type ErreurCatalogue = { cle: string; motif: string };

/** Liste des erreurs par clé ; vide si tout va bien. */
export function verifierCatalogue(lignes: readonly unknown[]): ErreurCatalogue[] {
  const erreurs: ErreurCatalogue[] = [];
  for (const ligne of lignes) {
    const r = ParametreSource.safeParse(ligne);
    if (r.success) continue;
    const brut = typeof ligne === 'object' && ligne !== null ? (ligne as { cle?: unknown }).cle : undefined;
    const cle = typeof brut === 'string' && brut !== '' ? brut : '(sans cle)';
    for (const i of r.error.issues) erreurs.push({ cle, motif: [...i.path, i.message].join(' : ') });
  }
  return erreurs;
}
