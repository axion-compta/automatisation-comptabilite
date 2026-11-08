// Copie de la ligne 1 de docs/sous-traitants.csv ; le test la compare à celle de la garde.
export const ENTETE_CSV = 'ref,role,traitement_dans_ue,societe_mere_ue,conservation_chez_fournisseur,contrat_archive_le,annonce_le,active_le,actif';

export type LigneSousTraitant = { ref: string; role: string; nom?: string; dansUnion: boolean; etat: 'actif' | 'prevu' };

const COLONNES = ENTETE_CSV.split(',');
const [IDX_REF, IDX_ROLE, IDX_UE] = [0, 1, 2];
const IDX_ACTIF = COLONNES.length - 1;

/** Lit le CSV (rôles et références seulement) ; `noms` ajoute un nom pour les références connues. */
export function lignesSousTraitants(csv: string, noms: Record<string, string>): LigneSousTraitant[] {
  const lignes = csv.split(/\r?\n/);
  if (lignes[0] !== ENTETE_CSV) throw new Error('en-tête de sous-traitants invalide');
  return lignes
    .slice(1)
    .filter((l) => l.trim() !== '')
    .map((l) => {
      const c = l.split(',');
      if (c.length !== COLONNES.length) throw new Error('ligne de sous-traitants invalide');
      const ref = c[IDX_REF] ?? '';
      const nom = Object.hasOwn(noms, ref) ? noms[ref] : undefined;
      return {
        ref,
        role: c[IDX_ROLE] ?? '',
        ...(nom !== undefined ? { nom } : {}),
        dansUnion: c[IDX_UE] === 'oui',
        etat: c[IDX_ACTIF] === 'oui' ? 'actif' : 'prevu',
      };
    });
}
