// Santé quotidienne d'un connecteur : ok, dégradé, panne. Les seuils d'échecs sont des arguments.
// Jours en chaînes AAAA-MM-JJ, aucune horloge lue.

export type CodeConnecteur =
  | 'connecteur_vide'
  | 'seuil_invalide'
  | 'seuils_incoherents'
  | 'jour_invalide'
  | 'meme_jour'
  | 'jour_anterieur';

export class ErreurConnecteur extends Error {
  override name = 'ErreurConnecteur';
  constructor(
    public readonly code: CodeConnecteur,
    message: string,
  ) {
    super(message);
  }
}

export interface SanteConnecteur {
  connecteur: string;
  dernierOk: string | null;
  dernierEssai: string | null;
  echecsConsecutifs: number;
  etat: 'ok' | 'degrade' | 'panne';
}

export interface SeuilsEchecs {
  echecsAvantDegrade: number;
  echecsAvantPanne: number | null;
}

const FORMAT_JOUR = /^\d{4}-\d{2}-\d{2}$/;

function verifierJour(jour: string): string {
  const d = FORMAT_JOUR.test(jour) ? new Date(jour + 'T00:00:00Z') : null;
  if (d === null || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== jour) {
    throw new ErreurConnecteur('jour_invalide', 'Jour invalide : ' + jour);
  }
  return jour;
}

function verifierSeuils(s: SeuilsEchecs): void {
  const entiers = [s.echecsAvantDegrade, ...(s.echecsAvantPanne === null ? [] : [s.echecsAvantPanne])];
  if (entiers.some((v) => !Number.isSafeInteger(v) || v <= 0)) {
    throw new ErreurConnecteur('seuil_invalide', 'Les seuils doivent être des entiers strictement positifs');
  }
  if (s.echecsAvantPanne !== null && s.echecsAvantPanne <= s.echecsAvantDegrade) {
    throw new ErreurConnecteur('seuils_incoherents', 'Le seuil de panne doit dépasser le seuil de dégradation');
  }
}

export function santeInitiale(connecteur: string): SanteConnecteur {
  if (connecteur.trim() === '') throw new ErreurConnecteur('connecteur_vide', 'Nom de connecteur vide');
  return { connecteur, dernierOk: null, dernierEssai: null, echecsConsecutifs: 0, etat: 'ok' };
}

/** Nouvelle santé après l'essai quotidien ; l'entrée n'est pas modifiée. */
export function enregistrerEssai(
  sante: SanteConnecteur,
  essai: { jour: string; ok: boolean },
  seuils: SeuilsEchecs,
): SanteConnecteur {
  if (sante.connecteur.trim() === '') throw new ErreurConnecteur('connecteur_vide', 'Nom de connecteur vide');
  verifierSeuils(seuils);
  verifierJour(essai.jour);
  if (sante.dernierEssai !== null) {
    if (essai.jour === sante.dernierEssai) throw new ErreurConnecteur('meme_jour', 'Un seul essai par jour');
    if (essai.jour < sante.dernierEssai) throw new ErreurConnecteur('jour_anterieur', 'Jour antérieur au dernier essai');
  }
  if (essai.ok) {
    return { ...sante, dernierOk: essai.jour, dernierEssai: essai.jour, echecsConsecutifs: 0, etat: 'ok' };
  }
  const echecs = sante.echecsConsecutifs + 1;
  let etat: SanteConnecteur['etat'] = 'ok';
  if (echecs >= seuils.echecsAvantDegrade) etat = 'degrade';
  if (seuils.echecsAvantPanne !== null && echecs >= seuils.echecsAvantPanne) etat = 'panne';
  return { ...sante, dernierEssai: essai.jour, echecsConsecutifs: echecs, etat };
}

export function bandeau(sante: SanteConnecteur): 'connecteur_degrade' | 'connecteur_en_panne' | null {
  if (sante.etat === 'degrade') return 'connecteur_degrade';
  if (sante.etat === 'panne') return 'connecteur_en_panne';
  return null;
}
