// @vitest-environment jsdom
// Fiche L19-T12 : état « doute » commun (texte + raison, rôle status, action facultative).
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { EtatChargement, EtatDoute, EtatErreur, EtatVide } from "../Etats.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function monter(element: ReactNode): Promise<HTMLElement> {
  const c = document.createElement("div");
  document.body.appendChild(c);
  await act(async () => {
    createRoot(c).render(element);
  });
  return c;
}

describe("EtatDoute", () => {
  it("etat-doute-raison-affichee", async () => {
    const c = await monter(<EtatDoute message="À vérifier (fictif)" raison="Deux montants diffèrent" />);
    const etat = c.querySelector(".axion-etat--doute")!;
    expect(etat.getAttribute("role")).toBe("status");
    expect(etat.textContent).toContain("À vérifier (fictif)");
    expect(etat.querySelector(".axion-etat__detail")!.textContent).toBe("Deux montants diffèrent");
    // Jamais la couleur seule : le texte du message est présent et non vide.
    expect(etat.querySelector(".axion-etat__titre")!.textContent).not.toBe("");
  });

  it("etat-doute-action-facultative", async () => {
    const sans = await monter(<EtatDoute message="m" raison="r" />);
    expect(sans.querySelector("button")).toBeNull();
    const libelleSeul = await monter(<EtatDoute message="m" raison="r" libelleAction="Vérifier" />);
    expect(libelleSeul.querySelector("button")).toBeNull();
    const surAction = vi.fn();
    const avec = await monter(<EtatDoute message="m" raison="r" libelleAction="Vérifier" surAction={surAction} />);
    const bouton = avec.querySelector("button")!;
    expect(bouton.textContent).toBe("Vérifier");
    await act(async () => bouton.click());
    expect(surAction).toHaveBeenCalledTimes(1);
  });

  it("etats-existants-inchanges", async () => {
    const c = await monter(
      <>
        <EtatChargement libelle="Chargement" />
        <EtatVide titre="Vide" detail="Détail" />
        <EtatErreur message="Erreur" />
      </>,
    );
    expect(c.querySelector('[role="status"][aria-busy="true"]')!.textContent).toBe("Chargement");
    expect(c.querySelector(".axion-etat--vide .axion-etat__detail")!.textContent).toBe("Détail");
    expect(c.querySelector('[role="alert"]')!.textContent).toBe("Erreur");
  });
});
