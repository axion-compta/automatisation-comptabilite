import type { ReactNode } from 'react';

type Couleur = 'vert' | 'orange' | 'rouge';
type CouleurArc = Couleur | 'pointille';
type Code = 'pieces' | 'banque' | 'tva';

/** Forme rendue par calculerAnneau (copiée : packages/ui ne dépend pas du noyau métier). */
export interface AnneauDonnees {
  arcs: { code: Code; couleur: CouleurArc; sous: { code: string; couleur: CouleurArc }[] }[];
  global: CouleurArc;
  centre: { mot: Couleur; nombre: number; sur: number } | { mot: 'donnees_absentes' };
}

export interface AnneauProps {
  anneau: AnneauDonnees;
  textes: {
    titre: string;
    arcs: Record<Code, string>;
    couleurs: Record<CouleurArc, string>;
    centre: string;
    colonnes: [string, string, string];
  };
}

const RAYON = 40;
const CENTRE = 50;
const ARCS_TOTAL = 3;
const TOUR = 360;
const ECART = 12;
const POINTILLE = '4 3';
const rad = (deg: number): number => ((deg - 90) * Math.PI) / 180;
const point = (deg: number): string =>
  `${(CENTRE + RAYON * Math.cos(rad(deg))).toFixed(2)} ${(CENTRE + RAYON * Math.sin(rad(deg))).toFixed(2)}`;

function chemin(i: number): string {
  const part = TOUR / ARCS_TOTAL;
  const debut = i * part + ECART / 2;
  const fin = (i + 1) * part - ECART / 2;
  return `M ${point(debut)} A ${RAYON} ${RAYON} 0 0 1 ${point(fin)}`;
}

/** Anneau de santé : 3 arcs, pointillés si donnée absente, mot et nombre au centre, tableau équivalent. */
export function Anneau({ anneau, textes }: AnneauProps): ReactNode {
  const c = anneau.centre;
  const mot = 'nombre' in c ? textes.couleurs[c.mot] : textes.couleurs.pointille;
  const compte = 'nombre' in c ? `${c.nombre} ${textes.centre} ${c.sur}` : null;
  const libelle = [textes.titre, ...anneau.arcs.map((a) => `${textes.arcs[a.code]} : ${textes.couleurs[a.couleur]}`), mot, compte]
    .filter((t) => t !== null)
    .join(', ');
  return (
    <div className="axion-anneau" data-global={anneau.global}>
      <svg className="axion-anneau__svg" viewBox="0 0 100 100" role="img" aria-label={libelle}>
        {anneau.arcs.map((a, i) => (
          <path
            key={a.code}
            className="axion-anneau__arc"
            data-arc={a.code}
            data-etat={a.couleur}
            d={chemin(i)}
            fill="none"
            strokeWidth={8}
            strokeDasharray={a.couleur === 'pointille' ? POINTILLE : undefined}
          />
        ))}
      </svg>
      <p className="axion-anneau__centre" data-centre="">
        {compte === null ? mot : `${mot} ${compte}`}
      </p>
      <table className="axion-anneau__tableau">
        <caption>{textes.titre}</caption>
        <thead>
          <tr>
            {textes.colonnes.map((t) => (
              <th key={t} scope="col">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {anneau.arcs.map((a) => (
            <tr key={a.code}>
              <th scope="row">{textes.arcs[a.code]}</th>
              <td colSpan={2}>{textes.couleurs[a.couleur]}</td>
            </tr>
          ))}
        </tbody>
        {compte === null ? null : (
          <tfoot>
            <tr>
              <th scope="row">{textes.titre}</th>
              <td>{mot}</td>
              <td>{compte}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
