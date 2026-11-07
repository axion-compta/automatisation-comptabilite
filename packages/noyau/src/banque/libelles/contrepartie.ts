// Reconnaissance de la contrepartie d'une ligne : IBAN haché, alias exact, alias préfixe, similarité (proposition seulement).
// La catégorie fournie par la banque est ignorée. Aucun texte affiché : codes seulement.
import { aliasApplicable, bloqueParJamais, type Alias, type RegleJamais } from './alias.js';
import { memeIban } from '../iban.js';
import { similariteMots } from './similarite.js';

export type LigneALire = { readonly libelleNormalise: string; readonly ibanHache?: string; readonly categorieBanque?: string };
export type Connues = {
  readonly contreparties: readonly { readonly id: string; readonly ibanHaches: readonly string[] }[];
  readonly alias: readonly Alias[];
  readonly reglesJamais: readonly RegleJamais[];
};
export type ReglageContrepartie = { /** Seuil en points de base (10 000 = 100 %). */ readonly seuilSimilaritePb: number };
export type Reconnaissance = {
  readonly contrepartieId?: string;
  readonly par: 'iban' | 'alias_exact' | 'alias_prefixe' | 'similarite' | 'aucune';
  readonly certitude: 'connue' | 'proposee' | 'aucune';
  readonly codeRaison: string;
};

const PB_MAX = 10_000;
const AUCUNE = (codeRaison: string): Reconnaissance => ({ par: 'aucune', certitude: 'aucune', codeRaison });

/** Meilleure contrepartie parmi des candidats notés ; ex aequo entre deux contreparties : rien. */
function meilleure(candidats: readonly { id: string; note: number }[]): { id: string } | 'ex_aequo' | undefined {
  if (candidats.length === 0) return undefined;
  const max = Math.max(...candidats.map((c) => c.note));
  const ids = new Set(candidats.filter((c) => c.note === max).map((c) => c.id));
  const [premier] = ids;
  return ids.size === 1 && premier !== undefined ? { id: premier } : 'ex_aequo';
}

export function reconnaitre(ligne: LigneALire, connues: Connues, reglage: ReglageContrepartie): Reconnaissance {
  const seuil = reglage.seuilSimilaritePb;
  if (!Number.isSafeInteger(seuil) || seuil < 0 || seuil > PB_MAX) throw new Error('seuil_invalide');
  const libelle = ligne.libelleNormalise;
  if (libelle.trim() === '') return AUCUNE('libelle_vide');
  const etape = (par: 'iban' | 'alias_exact' | 'alias_prefixe', candidats: readonly { id: string; note: number }[]): Reconnaissance | undefined => {
    const m = meilleure(candidats);
    if (m === undefined) return undefined;
    return m === 'ex_aequo' ? AUCUNE('ex_aequo') : { contrepartieId: m.id, par, certitude: 'connue', codeRaison: par };
  };

  const hache = ligne.ibanHache;
  const parIban = hache === undefined || hache === '' ? [] : connues.contreparties.filter((c) => c.ibanHaches.some((x) => memeIban(x, hache))).map((c) => ({ id: c.id, note: 0 }));
  const applicables = connues.alias.filter((a) => aliasApplicable(a, libelle, connues.reglesJamais));
  const parType = (type: Alias['type']) => applicables.filter((a) => a.type === type).map((a) => ({ id: a.contrepartieId, note: a.motif.length }));

  const connue = etape('iban', parIban) ?? etape('alias_exact', parType('exact')) ?? etape('alias_prefixe', parType('prefixe'));
  if (connue) return connue;

  const proches = connues.alias
    .filter((a) => a.etat === 'actif' && a.motif.trim() !== '' && !bloqueParJamais(a, connues.reglesJamais))
    .map((a) => ({ id: a.contrepartieId, note: similariteMots(libelle, a.motif) }))
    .filter((c) => c.note >= seuil);
  const m = meilleure(proches);
  if (m === 'ex_aequo') return AUCUNE('ex_aequo');
  return m ? { contrepartieId: m.id, par: 'similarite', certitude: 'proposee', codeRaison: 'similarite_proposee' } : AUCUNE('aucune_reconnaissance');
}
