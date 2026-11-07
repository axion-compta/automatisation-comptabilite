import { ErreurExploitation, verifierDate } from '../exploitation/types.js';

export type ConservationLisezmoi = { etat: 'date'; date: string; source: string } | { etat: 'a_confirmer' };

const FIN_DE_LIGNE = '\r\n';
const PLACEHOLDER = /\{[^{}]*\}/;
const DOSSIERS: ReadonlyArray<readonly [string, string]> = [
  ['fec/', 'dossierFec'],
  ['comptable/', 'dossierComptable'],
  ['pieces/', 'dossierPieces'],
  ['conversations/', 'dossierConversations'],
  ['parametrages/', 'dossierParametrages'],
];
const CLES_FIXES = [
  'titre', 'contenu', 'verifierTitre', 'verifierEtapes', 'conservationTitre',
  'conservationDate', 'conservationAConfirmer', 'conservationSource', 'contact',
];

function texte(modele: Record<string, string>, cle: string): string {
  const v = modele[cle];
  if (typeof v !== 'string' || v.trim() === '') throw new ErreurExploitation('champ_inconnu');
  return v;
}

const remplacer = (t: string, marque: string, valeur: string): string => t.split(marque).join(valeur);

function formaterDate(d: string): string {
  verifierDate(d);
  return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
}

export function lisezmoi(o: { chemins: string[]; conservation: ConservationLisezmoi; modele: Record<string, string> }): string {
  for (const c of [...CLES_FIXES, ...DOSSIERS.map(([, cle]) => cle)]) texte(o.modele, c);
  const m = (cle: string): string => texte(o.modele, cle);
  const conservation: string[] = [m('conservationTitre')];
  if (o.conservation.etat === 'date') {
    const source = o.conservation.source;
    const date = formaterDate(o.conservation.date);
    if (typeof source !== 'string' || source.trim() === '') throw new ErreurExploitation('champ_inconnu');
    conservation.push(remplacer(m('conservationDate'), '{date}', date), remplacer(m('conservationSource'), '{source}', source));
  } else {
    conservation.push(m('conservationAConfirmer'));
  }
  const dossiers = DOSSIERS.filter(([prefixe]) => o.chemins.some((c) => c.startsWith(prefixe))).map(([, cle]) => m(cle));
  const lignes = [m('titre'), m('contenu'), ...dossiers, m('verifierTitre'), m('verifierEtapes'), ...conservation, m('contact')];
  if (lignes.some((l) => PLACEHOLDER.test(l))) throw new ErreurExploitation('champ_inconnu');
  return lignes.join(FIN_DE_LIGNE) + FIN_DE_LIGNE;
}
