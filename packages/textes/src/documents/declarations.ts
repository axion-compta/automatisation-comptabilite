// Textes des déclarations (V3-DEC-042, V3-DEC-062, V3-MOD-005, V3-QUA-028). Convention : objets de chaînes, vouvoiement.
// Chaque erreur métier a une phrase simple pour l'écran (message_client) ; le code technique reste côté noyau.

// Codes, avec la fiche d'origine du noyau :
// - mode_saisie_seule, exercice_non_cloture : L03-T03 (documents, mention, filigrane)
// - autre_entreprise, doublon, fichier_de_travail : L03-T15 (vérification du FEC avant import)
// - tva_en_doute, regime_non_traite : L03-T25 (totaux de TVA et estimation non calculée)
// - ligne_absente, base_negative : L03-T27 (formules entre lignes)
// - siren_absent, prorata, lien_expire, controle_bloquant_ouvert, conserver_originaux : spec 03 (S1, C5, X3, TVA, IMP-032)
export const messagesDeclarations = {
  siren_absent: 'Ajoutez votre numéro SIREN pour préparer ce fichier',
  mode_saisie_seule: 'Votre expert-comptable réalise la clôture : je vous montre une vue indicative',
  exercice_non_cloture: 'Cet exercice n’est pas encore clôturé : les chiffres restent indicatifs',
  autre_entreprise: 'Ce fichier appartient à une autre entreprise',
  doublon: 'Ce fichier a déjà été ajouté',
  fichier_de_travail: 'Ce fichier est un fichier de travail : il ne peut pas être importé comme définitif',
  prorata: 'Votre déclaration demande un calcul de prorata : à faire avec votre expert-comptable',
  lien_expire: 'Ce lien a expiré : demandez-en un nouveau',
  tva_en_doute: 'Un doute subsiste sur la TVA de certaines pièces : le montant n’est pas calculé',
  regime_non_traite: 'Votre régime de TVA n’est pas encore pris en charge : le montant n’est pas calculé',
  ligne_absente: 'Une ligne nécessaire au calcul est absente : complétez-la avant de continuer',
  base_negative: 'Une base de calcul est négative : vérifiez les opérations concernées',
  controle_bloquant_ouvert: 'Un contrôle bloquant reste ouvert : réglez-le avant de continuer',
  conserver_originaux: 'Conservez vos justificatifs originaux',
} as const;

export const filigranes = {
  a_valider: 'À valider',
  indicatif: 'Indicatif',
  non_officiel: 'Non officiel',
  provisoire: 'Provisoire',
} as const;

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function decouper(date: string): { a: string; m: string; j: string } {
  const r = DATE.exec(date);
  const mois = Number(r?.[2]);
  const jour = Number(r?.[3]);
  if (!r || mois < 1 || mois > 12 || jour < 1 || jour > 31) throw new RangeError(`date attendue au format AAAA-MM-JJ : ${date}`);
  return { a: r[1] as string, m: r[2] as string, j: r[3] as string };
}

export function mentionDocument(p: { validePar?: string; valideLe?: string } = {}): string {
  const base = 'Préparé par IA, à valider';
  const nom = p.validePar?.trim() ?? '';
  if (p.validePar === undefined && p.valideLe === undefined) return base;
  if (nom === '' || p.valideLe === undefined) throw new RangeError('validePar et valideLe vont ensemble');
  const d = decouper(p.valideLe);
  return `${base}. Validé par ${nom} le ${d.j}/${d.m}/${d.a}`;
}

export function piecesARegarder(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('n doit être un entier positif ou nul');
  if (n === 0) return 'Il ne reste aucune pièce à regarder';
  return n === 1 ? 'Il reste 1 pièce à regarder' : `Il reste ${n} pièces à regarder`;
}

export function datesIndicatives(debut: string, fin: string): string {
  const d = decouper(debut);
  const f = decouper(fin);
  return `Dates indicatives, calculées sur votre année comptable du ${d.j}/${d.m} au ${f.j}/${f.m}. À vérifier sur impots.gouv.fr et urssaf.fr.`;
}
