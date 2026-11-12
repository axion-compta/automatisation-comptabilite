import { useId, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface BoutonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  variante?: "principal" | "discret";
  desactive?: boolean;
  /** Touche rapide : `touche` (syntaxe aria-keyshortcuts) et `libelle` fourni par les textes de l'appelant. */
  raccourci?: { touche: string; libelle: string };
  children: ReactNode;
}

/** Bouton standard : `type="button"` par défaut, texte fourni par l'appelant. Une touche rapide s'affiche dans une infobulle (survol ou focus). */
export function Bouton({ variante = "principal", desactive = false, type = "button", className, raccourci, children, ...reste }: BoutonProps) {
  const classes = ["axion-bouton", `axion-bouton--${variante}`, className].filter(Boolean).join(" ");
  const id = useId();
  const [vue, setVue] = useState(false);
  if (!raccourci) {
    return (
      <button {...reste} type={type} disabled={desactive} className={classes}>
        {children}
      </button>
    );
  }
  const montrer = (v: boolean) => () => setVue(v);
  return (
    <>
      <button
        {...reste}
        type={type}
        disabled={desactive}
        className={classes}
        aria-keyshortcuts={raccourci.touche}
        aria-describedby={id}
        onFocus={(e) => { montrer(true)(); reste.onFocus?.(e); }}
        onBlur={(e) => { montrer(false)(); reste.onBlur?.(e); }}
        onMouseEnter={(e) => { montrer(true)(); reste.onMouseEnter?.(e); }}
        onMouseLeave={(e) => { montrer(false)(); reste.onMouseLeave?.(e); }}
      >
        {children}
      </button>
      <span id={id} role="tooltip" hidden={!vue} className="axion-bouton__infobulle">
        {raccourci.libelle} ({raccourci.touche})
      </span>
    </>
  );
}
