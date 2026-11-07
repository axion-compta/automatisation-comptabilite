// Gardien d'entrée du chat : texte non fiable encadré, motifs d'injection signalés, demande des consignes repérée.
// Fonctions pures. Un motif repéré est un signal, jamais une consigne suivie. Le détecteur de données sensibles est un port.
export type Signal = 'ia.injection_suspecte' | 'consignes_demandees';
export type ZoneSensible = { readonly debut: number; readonly fin: number; readonly sorte: string };
export type VerdictSensibles = { readonly zones: readonly ZoneSensible[] } | { readonly refus: true };
export type DetecteurSensibles = (texte: string) => VerdictSensibles;
export type EntreePreparee = { entree: string; signaux: Signal[]; refus?: 'donnee_sensible' };
export type Detection = { suspect: boolean; motifs: string[] };
const BALISE = 'donnees_non_fiables';
const INVISIBLES = /[\u200b-\u200d\ufeff]/gu;
const LETTRES_ISOLEES = /(?<!\p{L})(?:\p{L}[ .\-_]){2,}\p{L}(?!\p{L})/gu;
const SEPARATEURS = /[ .\-_]/gu;
const FIN = '[^.!?\\n]{0,40}';
const SUJET = '(?:consignes?|instructions?|regles?|directives?|prompts?)';
// Formes sur texte normalisé : minuscules, sans accent, sans caractère invisible, espaces simples.
export const MOTIFS_INJECTION: readonly { nom: string; re: RegExp }[] = [
  { nom: 'ignore_consignes', re: new RegExp(`\\bignor(?:e|ez|er)\\b${FIN}\\b${SUJET}\\b`) },
  { nom: 'oublie_consignes', re: new RegExp(`\\boubli(?:e|ez|er)\\b${FIN}\\b${SUJET}\\b`) },
  { nom: 'tu_es_maintenant', re: /\btu es (?:maintenant|desormais)\b/ },
  { nom: 'a_partir_de_maintenant', re: /\ba partir de maintenant,? (?:tu|vous)\b/ },
  { nom: 'valide_tout', re: /(?:^|[.!?;:\n] ?|\bet |\bpuis )valide (?:tout|tous|toutes)\b/ },
  { nom: 'ignore_previous', re: /\b(?:ignore|disregard|forget) (?:all |any )?(?:the )?(?:previous|prior|above|earlier) (?:instructions|prompts?|rules|messages)\b/ },
  { nom: 'you_are_now', re: /\byou are now\b/ },
  { nom: 'nouvelles_consignes', re: /\b(?:nouvelles?|new) (?:consignes?|instructions?) ?:/ },
  { nom: 'role_systeme', re: /(?:^|[.!?,;] )(?:system|assistant|developpeur|developer) ?:/ },
  { nom: 'mode_contournement', re: /\b(?:mode developpeur|developer mode|dan mode|jailbreak)\b/ },
  { nom: 'faire_semblant', re: /\b(?:fais semblant d|pretend (?:that|to be|you))/ },
  { nom: 'desactiver_garde_fous', re: new RegExp(`\\b(?:desactiv(?:e|ez|er)|contourn(?:e|ez|er)|bypass|disable)\\b${FIN}\\b(?:garde-?fous?|securite|regles|filtres?|restrictions?|safety|guardrails?)\\b`) },
  { nom: 'appliquer_sans_confirmation', re: /\b(?:applique|execute|approuve|valide) (?:automatiquement|sans (?:confirmation|verification|demander))/ },
  { nom: 'envoyer_vers_adresse', re: /\b(?:envoie|envoyez|envoyer|transmets|transmettez|transfere|forward|send)\b[^.!?\n]{0,60}\S@\S/ },
];
const MOTIFS_CONSIGNES: readonly RegExp[] = [
  /\b(?:montre|montrez|affiche|affichez|donne|donnez|dis|dites|revele|revelez|ecris|repete|repetez|liste|recite)(?:-moi|-nous)? ?[^.!?\n]{0,30}\b(?:tes|ton|vos|votre|your|the)\b[^.!?\n]{0,20}\b(?:consignes?|instructions?|prompt|directives?|configuration)\b/,
  /\b(?:show|reveal|print|repeat|display|tell)\b[^.!?\n]{0,30}\b(?:your|the) (?:system )?(?:prompt|instructions|rules)\b/,
  /\bquel(?:le)? (?:est|sont) (?:ton|tes|votre|vos) (?:prompt|consignes?|instructions?)\b/,
];
function normaliser(texte: string): string {
  return texte
    .replace(/[’‘]/gu, "'")
    .replace(INVISIBLES, '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/gu, ' ')
    .trim();
}
// Deux lectures : le texte normalisé, et le même texte avec les lettres isolées recollées (« i.g.n.o.r.e »).
function lectures(texte: string): string[] {
  const n = normaliser(texte);
  const recolle = n.replace(LETTRES_ISOLEES, (m) => m.replace(SEPARATEURS, ''));
  return recolle === n ? [n] : [n, recolle];
}
export function encadrer(texteNonFiable: string): string {
  if (texteNonFiable === '') return '';
  const neutre = texteNonFiable.replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
  return `<${BALISE}>\n${neutre}\n</${BALISE}>`;
}
export function detecterInjection(texte: string): Detection {
  const l = lectures(texte);
  const motifs = MOTIFS_INJECTION.filter((m) => l.some((t) => m.re.test(t))).map((m) => m.nom);
  return { suspect: motifs.length > 0, motifs };
}
export function demandeDeConsignes(texte: string): boolean {
  const l = lectures(texte);
  return MOTIFS_CONSIGNES.some((re) => l.some((t) => re.test(t)));
}
type Remplacement = { texte: string } | { refus: true };
function remplacer(texte: string, verdict: VerdictSensibles, jetons: Map<string, string>, compteurs: Map<string, number>): Remplacement {
  if ('refus' in verdict) return { refus: true };
  const zones = [...verdict.zones].sort((a, b) => a.debut - b.debut);
  let sortie = '';
  let curseur = 0;
  for (const z of zones) {
    const valide = Number.isInteger(z.debut) && Number.isInteger(z.fin) && z.debut >= curseur && z.fin > z.debut && z.fin <= texte.length;
    if (!valide || !/^[A-Za-z_]{1,20}$/u.test(z.sorte)) return { refus: true };
    const cle = `${z.sorte}:${texte.slice(z.debut, z.fin)}`;
    let jeton = jetons.get(cle);
    if (jeton === undefined) {
      const n = (compteurs.get(z.sorte) ?? 0) + 1;
      compteurs.set(z.sorte, n);
      jeton = `[${z.sorte.toUpperCase()}_${n}]`;
      jetons.set(cle, jeton);
    }
    sortie += texte.slice(curseur, z.debut) + jeton;
    curseur = z.fin;
  }
  return { texte: sortie + texte.slice(curseur) };
}
export function preparerEntree(p: {
  texteUtilisateur: string;
  textesNonFiables: readonly string[];
  detecteurSensibles: DetecteurSensibles;
}): EntreePreparee {
  const signaux = new Set<Signal>();
  const jetons = new Map<string, string>();
  const compteurs = new Map<string, number>();
  const refuse: EntreePreparee = { entree: '', signaux: [], refus: 'donnee_sensible' };
  const nettoyer = (t: string): string | undefined => {
    const r = remplacer(t, p.detecteurSensibles(t), jetons, compteurs);
    return 'refus' in r ? undefined : r.texte;
  };
  const utilisateur = nettoyer(p.texteUtilisateur);
  if (utilisateur === undefined) return refuse;
  if (demandeDeConsignes(p.texteUtilisateur)) signaux.add('consignes_demandees');
  if (detecterInjection(p.texteUtilisateur).suspect) signaux.add('ia.injection_suspecte');
  const parties = [utilisateur];
  for (const brut of p.textesNonFiables) {
    const propre = nettoyer(brut);
    if (propre === undefined) return refuse;
    if (detecterInjection(brut).suspect || demandeDeConsignes(brut)) signaux.add('ia.injection_suspecte');
    parties.push(encadrer(propre));
  }
  return { entree: parties.filter((x) => x !== '').join('\n\n'), signaux: [...signaux] };
}
