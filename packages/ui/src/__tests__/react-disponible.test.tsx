// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

const TEXTE = "Bonjour depuis le paquet ui";

describe("react-disponible", () => {
  it("monte un paragraphe avec createRoot et lit son texte", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const conteneur = document.createElement("div");
    document.body.appendChild(conteneur);
    const racine = createRoot(conteneur);
    await act(async () => {
      racine.render(<p>{TEXTE}</p>);
    });
    expect(conteneur.querySelector("p")?.textContent).toBe(TEXTE);
    await act(async () => {
      racine.unmount();
    });
    conteneur.remove();
  });
});
