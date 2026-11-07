// Vie d'un alias de libellé appris : proposition, activation, désactivation, « jamais ça ».
// Les seuils sont des réglages passés en argument ; aucun calcul par division.
export type Alias = {
  readonly id: string;
  readonly contrepartieId: string;
  readonly motif: string;
  readonly type: 'exact' | 'prefixe';
  readonly source: 'regle' | 'ia' | 'personne';
  readonly acceptes: number;
  readonly rejets: number;
  readonly rejetsConsecutifs: number;
  readonly etat: 'propose' | 'actif' | 'desactive';
};

export type ReglageAlias = {
  readonly acceptationsMin: number;
  /** Taux minimal d'acceptation en points de base (10 000 = 100 %). */
  readonly tauxMinPb: number;
  readonly rejetsConsecutifsMax: number;
};

export type RegleJamais = { readonly motif: string; readonly contrepartieId: string };

const PB_MAX = 10_000;

function verifier(r: ReglageAlias): void {
  const ok =
    Number.isSafeInteger(r.acceptationsMin) &&
    r.acceptationsMin >= 1 &&
    Number.isSafeInteger(r.rejetsConsecutifsMax) &&
    r.rejetsConsecutifsMax >= 1 &&
    Number.isSafeInteger(r.tauxMinPb) &&
    r.tauxMinPb >= 0 &&
    r.tauxMinPb <= PB_MAX;
  if (!ok) throw new Error('reglage_invalide');
}

function motifValide(motif: string): boolean {
  return motif.trim() !== '';
}

export function enregistrerDecision(
  alias: Alias,
  decision: 'accepte' | 'rejete',
  reglage: ReglageAlias,
): Alias {
  verifier(reglage);
  if (!motifValide(alias.motif)) throw new Error('motif_vide');
  const accepte = decision === 'accepte';
  const acceptes = alias.acceptes + (accepte ? 1 : 0);
  const rejets = alias.rejets + (accepte ? 0 : 1);
  const rejetsConsecutifs = accepte ? 0 : alias.rejetsConsecutifs + 1;
  let etat = alias.etat;
  if (etat !== 'desactive') {
    if (rejetsConsecutifs >= reglage.rejetsConsecutifsMax) etat = 'desactive';
    else if (
      etat === 'propose' &&
      acceptes >= reglage.acceptationsMin &&
      acceptes * PB_MAX >= reglage.tauxMinPb * (acceptes + rejets)
    ) {
      etat = 'actif';
    }
  }
  return { ...alias, acceptes, rejets, rejetsConsecutifs, etat };
}

/** Réactivation explicite par une personne : retour en proposition, série de rejets remise à zéro. */
export function reactiver(alias: Alias): Alias {
  return { ...alias, etat: 'propose', rejetsConsecutifs: 0 };
}

export function bloqueParJamais(alias: Alias, reglesJamais: readonly RegleJamais[]): boolean {
  return reglesJamais.some(
    (r) => r.contrepartieId === alias.contrepartieId && r.motif === alias.motif,
  );
}

export function aliasApplicable(
  alias: Alias,
  motif: string,
  reglesJamais: readonly RegleJamais[],
): boolean {
  if (alias.etat !== 'actif' || !motifValide(alias.motif) || !motifValide(motif)) return false;
  if (bloqueParJamais(alias, reglesJamais)) return false;
  if (reglesJamais.some((r) => r.contrepartieId === alias.contrepartieId && r.motif === motif)) {
    return false;
  }
  return alias.type === 'exact' ? motif === alias.motif : motif.startsWith(alias.motif);
}
