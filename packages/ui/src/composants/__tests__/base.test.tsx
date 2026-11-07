// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Bouton } from "../Bouton.js";
import { Carte } from "../Carte.js";
import { EtatChargement, EtatErreur } from "../Etats.js";
import { Pastille } from "../Pastille.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const conteneurs: HTMLElement[] = [];

async function monter(element: ReactNode): Promise<HTMLElement> {
  const conteneur = document.createElement("div");
  document.body.appendChild(conteneur);
  conteneurs.push(conteneur);
  await act(async () => {
    createRoot(conteneur).render(element);
  });
  return conteneur;
}

afterEach(() => {
  for (const c of conteneurs.splice(0)) c.remove();
});

describe("composants de base", () => {
  it("bouton-type-button-par-defaut", async () => {
    const c = await monter(<Bouton>Valider</Bouton>);
    expect(c.querySelector("button")?.getAttribute("type")).toBe("button");
    const s = await monter(<Bouton type="submit">Envoyer</Bouton>);
    expect(s.querySelector("button")?.getAttribute("type")).toBe("submit");
  });

  it("bouton-desactive", async () => {
    const c = await monter(<Bouton desactive>Valider</Bouton>);
    expect(c.querySelector("button")?.disabled).toBe(true);
    const actif = await monter(<Bouton>Valider</Bouton>);
    expect(actif.querySelector("button")?.disabled).toBe(false);
  });

  it("carte-nommee-par-son-titre", async () => {
    const c = await monter(
      <Carte titre="Ma carte" niveau={3}>
        <p>Contenu</p>
      </Carte>,
    );
    const section = c.querySelector("section");
    const id = section?.getAttribute("aria-labelledby");
    expect(id).toBeTruthy();
    const titre = document.getElementById(id as string);
    expect(titre?.tagName).toBe("H3");
    expect(titre?.textContent).toBe("Ma carte");
    expect(section?.contains(titre)).toBe(true);
  });

  it("chargement-role-status", async () => {
    const c = await monter(<EtatChargement libelle="Chargement en cours" />);
    const el = c.querySelector("[role='status']");
    expect(el?.getAttribute("aria-busy")).toBe("true");
    expect(el?.textContent).toBe("Chargement en cours");
  });

  it("erreur-role-alert-et-reessayer", async () => {
    const rappel = vi.fn();
    const c = await monter(<EtatErreur message="Échec" libelleReessayer="Réessayer" surReessayer={rappel} />);
    expect(c.querySelector("[role='alert']")).not.toBeNull();
    const bouton = c.querySelector("button");
    expect(bouton?.textContent).toBe("Réessayer");
    await act(async () => {
      bouton?.click();
    });
    expect(rappel).toHaveBeenCalledTimes(1);
    const sans = await monter(<EtatErreur message="Échec" />);
    expect(sans.querySelector("[role='alert']")).not.toBeNull();
    expect(sans.querySelector("button")).toBeNull();
    const incomplet = await monter(<EtatErreur message="Échec" libelleReessayer="Réessayer" />);
    expect(incomplet.querySelector("button")).toBeNull();
  });

  it("pastille-texte-visible", async () => {
    for (const etat of ["ok", "attente", "bloque"] as const) {
      const c = await monter(<Pastille etat={etat} libelle={`Libellé ${etat}`} />);
      expect(c.textContent).toBe(`Libellé ${etat}`);
      expect(c.querySelector("[aria-hidden='true']")?.textContent).toBe("");
    }
  });

  it("pastille-icone-masquee-aux-lecteurs", async () => {
    const formes = new Set<string>();
    for (const etat of ["ok", "attente", "bloque"] as const) {
      const c = await monter(<Pastille etat={etat} libelle="Texte" />);
      const svg = c.querySelector("svg");
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
      formes.add(svg?.querySelector("path")?.getAttribute("d") ?? "");
    }
    expect(formes.size).toBe(3);
  });
});
