import { useEffect, useRef } from 'react';
import { ReponseExplication, type Explication as ExplicationVue } from '../../../../../packages/contrat/src/domaines/banque.js';
import { explication, facteur, type CodeExplication, type ValeursExplication } from '../../../../../packages/textes/src/banque/mots.js';
import { e12 } from '../../../../../packages/textes/src/ecrans/e12.js';
import { EtatChargement, EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { useLecture } from '../../donnees/lecture.js';

const t = e12.explication;
const CODES: readonly string[] = ['rattache', 'propose', 'hesite', 'sans_piece', 'a_qualifier', 'neutralisee', 'ignoree'] satisfies CodeExplication[];
const CLES: readonly (keyof ValeursExplication)[] = ['objet', 'piece', 'tiers', 'montant'];
const remplir = (modele: string, valeurs: Record<string, string | number>): string =>
  Object.entries(valeurs).reduce((r, [k, v]) => r.replace('{' + k + '}', String(v)), modele);
const points = (n: number) => remplir(n === 0 || n === 1 ? t.points : t.pointsPluriel, { points: n });
const nomFacteur = (nom: string): string => (t.noms as Record<string, string>)[nom] ?? nom;

/** Phrase principale : valeurs prises dans les facteurs, autre facture dans le premier autre candidat. */
export function phrase(e: ExplicationVue): string {
  if (!CODES.includes(e.codeMot)) return t.sansScore;
  const v: ValeursExplication = {};
  for (const f of e.facteurs) for (const k of CLES) if (v[k] === undefined && f.valeurs[k] !== undefined) v[k] = String(f.valeurs[k]);
  const autre = e.autresCandidats[0]?.pieceId;
  if (autre !== undefined) v.autrePiece = autre;
  return explication(e.codeMot as CodeExplication, v);
}

/** Panneau « Pourquoi ? » d'une ligne : lecture seule. */
export function Explication({ ligneId, surFermeture }: { ligneId: string; surFermeture: () => void }) {
  const l = useLecture('/banque/lignes/' + encodeURIComponent(ligneId) + '/explication', ReponseExplication);
  const titre = useRef<HTMLHeadingElement>(null);
  useEffect(() => titre.current?.focus(), []);
  let corps;
  if (l.etat === 'chargement') corps = <EtatChargement libelle={t.chargement} />;
  else if (l.etat === 'erreur') corps = <EtatErreur message={l.erreur?.code === 'introuvable' ? t.introuvable : t.erreur} />;
  else if (l.donnees) {
    const e = l.donnees.body;
    const total = e.facteurs.reduce((s, f) => s + f.points, 0);
    corps = (
      <>
        <p>{phrase(e)}</p>
        {e.score === undefined ? <p>{t.sansScore}</p> : (
          <>
            <h3>{t.facteurs}</h3>
            <ul>
              {e.facteurs.map((f) => <li key={f.nom}>{nomFacteur(f.nom)} : {points(f.points)}, {facteur(f.nom, f.valeurs)}</li>)}
            </ul>
            <p>{remplir(t.total, { total, max: e.score })}</p>
          </>
        )}
        {e.autresCandidats.length > 0 && (
          <>
            <h3>{t.autres}</h3>
            <ul>{e.autresCandidats.map((c) => <li key={c.pieceId}>{remplir(t.autre, { piece: c.pieceId, points: c.score })}</li>)}</ul>
          </>
        )}
        {e.proposePar === 'regle' || e.proposePar === 'personne' ? <p>{t.source[e.proposePar]}</p> : null}
      </>
    );
  }
  return (
    <aside className="e12-explication" aria-labelledby="e12-expl-titre" onKeyDown={(ev) => ev.key === 'Escape' && surFermeture()}>
      <h2 id="e12-expl-titre" ref={titre} tabIndex={-1}>{t.titre}</h2>
      {corps}
      <button type="button" onClick={surFermeture}>{t.fermer}</button>
    </aside>
  );
}
