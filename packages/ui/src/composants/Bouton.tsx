import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface BoutonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  variante?: "principal" | "discret";
  desactive?: boolean;
  children: ReactNode;
}

/** Bouton standard : `type="button"` par défaut, texte fourni par l'appelant. */
export function Bouton({ variante = "principal", desactive = false, type = "button", className, children, ...reste }: BoutonProps) {
  const classes = ["axion-bouton", `axion-bouton--${variante}`, className].filter(Boolean).join(" ");
  return (
    <button {...reste} type={type} disabled={desactive} className={classes}>
      {children}
    </button>
  );
}
