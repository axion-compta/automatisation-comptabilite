// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeuilleMobile } from "../FeuilleMobile.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const montes: { racine: Root; el: HTMLElement }[] = [];
const surFermer = vi.fn();

function Essai({ ouverteAuDepart = true }: { ouverteAuDepart?: boolean }) {
  const [ouverte, setOuverte] = useState(ouverteAuDepart);
  return (
    <div>
      <button id="declencheur" type="button" onClick={() => setOuverte(true)}>ouvrir</button>
      <FeuilleMobile ouverte={ouverte} titre="Filtres" libelleFermer="Fermer" onFermer={() => { surFermer(); setOuverte(false); }}>
        <button id="premier" type="button">un</button>
        <button id="dernier" type="button">deux</button>
      </FeuilleMobile>
    </div>
  );
}
async function monter(ouverteAuDepart = true): Promise<HTMLElement> {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const racine = createRoot(el);
  montes.push({ racine, el });
  await act(async () => racine.render(<Essai ouverteAuDepart={ouverteAuDepart} />));
  return el;
}
const touche = (cible: Element, key: string, shiftKey = false) =>
  act(async () => void cible.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true })));
const feuille = (el: HTMLElement) => el.querySelector('[role="dialog"]') as HTMLElement;

afterEach(() => {
  for (const m of montes.splice(0)) { act(() => m.racine.unmount()); m.el.remove(); }
  surFermer.mockClear();
});

describe("FeuilleMobile", () => {
  it("feuille-focus-piege", async () => {
    const el = await monter();
    const f = feuille(el);
    expect(f.getAttribute("aria-modal")).toBe("true");
    expect(f.getAttribute("aria-label")).toBe("Filtres");
    expect(f.contains(document.activeElement)).toBe(true);
    const fermer = f.querySelector("button") as HTMLButtonElement;
    const dernier = el.querySelector("#dernier") as HTMLButtonElement;
    // Tab sur le dernier élément : retour au premier ; Maj+Tab sur le premier : retour au dernier.
    dernier.focus();
    await touche(dernier, "Tab");
    expect(document.activeElement).toBe(fermer);
    await touche(fermer, "Tab", true);
    expect(document.activeElement).toBe(dernier);
    // Tab au milieu : pas d'interception.
    const premier = el.querySelector("#premier") as HTMLButtonElement;
    premier.focus();
    const evt = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    premier.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(false);
  });
  it("feuille-echap-ferme", async () => {
    const el = await monter();
    await touche(feuille(el), "a");
    expect(surFermer).not.toHaveBeenCalled();
    await touche(feuille(el), "Escape");
    expect(surFermer).toHaveBeenCalledTimes(1);
    expect(feuille(el)).toBeNull();
  });
  it("feuille-voile-ferme", async () => {
    const el = await monter();
    await act(async () => (el.querySelector(".axion-feuille-mobile__voile") as HTMLElement).click());
    expect(surFermer).toHaveBeenCalledTimes(1);
    const el2 = await monter();
    // Un clic dans la feuille elle-même ne ferme pas.
    surFermer.mockClear();
    await act(async () => (feuille(el2).querySelector("#premier") as HTMLElement).click());
    expect(surFermer).not.toHaveBeenCalled();
    expect(feuille(el2)).not.toBeNull();
  });
  it("feuille-focus-rendu", async () => {
    const el = await monter(false);
    expect(feuille(el)).toBeNull();
    const declencheur = el.querySelector("#declencheur") as HTMLButtonElement;
    declencheur.focus();
    await act(async () => declencheur.click());
    expect(feuille(el)).not.toBeNull();
    expect(document.activeElement).not.toBe(declencheur);
    await touche(feuille(el), "Escape");
    expect(feuille(el)).toBeNull();
    expect(document.activeElement).toBe(declencheur);
  });
});
