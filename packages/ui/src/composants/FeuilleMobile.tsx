import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import "./feuille-mobile.css";

export interface FeuilleMobileProps {
  ouverte: boolean;
  titre: string;
  libelleFermer: string;
  onFermer(): void;
  children: ReactNode;
}

const FOCALISABLES = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Feuille du bas : focus piégé, Échap et voile ferment, le focus revient au déclencheur. Textes par propriétés. */
export function FeuilleMobile({ ouverte, titre, libelleFermer, onFermer, children }: FeuilleMobileProps) {
  const feuille = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouverte) return;
    const declencheur = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    feuille.current?.querySelector<HTMLElement>(FOCALISABLES)?.focus();
    return () => declencheur?.focus();
  }, [ouverte]);
  if (!ouverte) return null;
  const surTouche = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onFermer();
      return;
    }
    if (e.key !== "Tab") return;
    const liste = Array.from(feuille.current?.querySelectorAll<HTMLElement>(FOCALISABLES) ?? []);
    const premier = liste[0];
    const dernier = liste[liste.length - 1];
    if (!premier || !dernier) return;
    if (e.shiftKey && document.activeElement === premier) {
      e.preventDefault();
      dernier.focus();
    } else if (!e.shiftKey && document.activeElement === dernier) {
      e.preventDefault();
      premier.focus();
    }
  };
  return (
    <div className="axion-feuille-mobile">
      <div className="axion-feuille-mobile__voile" aria-hidden="true" onClick={onFermer} />
      <div ref={feuille} className="axion-feuille-mobile__feuille" role="dialog" aria-modal="true" aria-label={titre} onKeyDown={surTouche}>
        <button type="button" className="axion-feuille-mobile__fermer" onClick={onFermer}>
          {libelleFermer}
        </button>
        <div className="axion-feuille-mobile__contenu">{children}</div>
      </div>
    </div>
  );
}
