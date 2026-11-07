import { createElement, useId, type ReactNode } from "react";

export interface CarteProps {
  titre: string;
  niveau?: 2 | 3 | 4;
  children?: ReactNode;
}

/** Carte : section nommée par son titre (aria-labelledby). */
export function Carte({ titre, niveau = 2, children }: CarteProps) {
  const idTitre = useId();
  return (
    <section className="axion-carte" aria-labelledby={idTitre}>
      {createElement(`h${niveau}`, { id: idTitre, className: "axion-carte__titre" }, titre)}
      {children}
    </section>
  );
}
