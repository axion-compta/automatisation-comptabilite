import { useEffect, useRef, useState } from 'react';
import { socleVisite } from '../../../../packages/textes/src/ecrans/socle-visite.js';

const CLE_SESSION = 'visite-guidee-ignoree';
const CHEMIN_PIECE = '/documents/piece?id=';

function ignoreeDansLaSession(): boolean {
  try {
    return sessionStorage.getItem(CLE_SESSION) === '1';
  } catch {
    return false;
  }
}

export interface VisiteGuideeProps {
  /** Nombre de pièces de la société ; `null` tant qu'il est inconnu (la visite reste cachée). */
  nombrePieces: number | null;
  /** Pièce lue à montrer à l'étape trois (lien vers E08). */
  idPiece?: string;
}

/** Visite en 3 étapes, ignorable, affichée seulement quand la société n'a aucune pièce. */
export function VisiteGuidee({ nombrePieces, idPiece }: VisiteGuideeProps) {
  const [etape, setEtape] = useState(0);
  const [fermee, setFermee] = useState(ignoreeDansLaSession);
  const titre = useRef<HTMLHeadingElement>(null);
  const visible = nombrePieces === 0 && !fermee;
  useEffect(() => {
    if (visible) titre.current?.focus();
  }, [visible, etape]);
  if (!visible) return null;
  const courante = socleVisite.etapes[etape] ?? socleVisite.etapes[0];
  const derniere = etape === socleVisite.etapes.length - 1;
  function ignorer() {
    try {
      sessionStorage.setItem(CLE_SESSION, '1');
    } catch {
      /* mémoire de session indisponible : la visite reste masquée jusqu'au rechargement */
    }
    setFermee(true);
  }
  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-label={socleVisite.titre}
      onKeyDown={(e) => {
        if (e.key === 'Escape') ignorer();
      }}
    >
      <p>{socleVisite.progression.replace('{n}', String(etape + 1)).replace('{total}', String(socleVisite.etapes.length))}</p>
      <h2 ref={titre} tabIndex={-1}>{courante.titre}</h2>
      <p>{courante.texte}</p>
      {derniere && idPiece !== undefined ? <a href={CHEMIN_PIECE + encodeURIComponent(idPiece)}>{socleVisite.lienPiece}</a> : null}
      <div>
        {etape > 0 ? <button type="button" onClick={() => setEtape(etape - 1)}>{socleVisite.actions.precedent}</button> : null}
        {derniere ? (
          <button type="button" onClick={ignorer}>{socleVisite.actions.terminer}</button>
        ) : (
          <button type="button" onClick={() => setEtape(etape + 1)}>{socleVisite.actions.suivant}</button>
        )}
        <button type="button" onClick={ignorer}>{socleVisite.actions.ignorer}</button>
      </div>
    </section>
  );
}
