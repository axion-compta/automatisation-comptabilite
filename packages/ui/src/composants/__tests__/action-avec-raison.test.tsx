// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionAvecRaison } from "../ActionAvecRaison.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const conteneurs: HTMLElement[] = [];
async function monter(element: ReactNode): Promise<HTMLElement> {
  const c = document.createElement("div");
  document.body.appendChild(c);
  conteneurs.push(c);
  await act(async () => {
    createRoot(c).render(element);
  });
  return c;
}
afterEach(() => {
  for (const c of conteneurs.splice(0)) c.remove();
});

const refuse = (raison_texte: string) => ({ permis: false as const, raison_texte });
const boutons = (c: HTMLElement) => [...c.querySelectorAll("button")];
const touche = (b: HTMLElement, key: string) =>
  act(async () => {
    b.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    b.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }));
  });

describe("ActionAvecRaison", () => {
  it("permis-appelle-l-action", async () => {
    const f = vi.fn();
    const c = await monter(<ActionAvecRaison libelle="Libellé L" capacite={{ permis: true }} onAction={f} />);
    const b = boutons(c)[0]!;
    expect(b.textContent).toBe("Libellé L");
    expect(b.getAttribute("aria-disabled")).toBeNull();
    await act(async () => b.click());
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("refuse-n-appelle-pas-au-clic", async () => {
    const f = vi.fn();
    const c = await monter(<ActionAvecRaison libelle="L" capacite={refuse("Raison R")} onAction={f} />);
    const b = boutons(c)[0]!;
    expect(b.getAttribute("aria-disabled")).toBe("true");
    await act(async () => b.click());
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse-n-appelle-pas-au-clavier", async () => {
    const f = vi.fn();
    const c = await monter(<ActionAvecRaison libelle="L" capacite={refuse("Raison R")} onAction={f} />);
    const b = boutons(c)[0]!;
    b.focus();
    await touche(b, "Enter");
    await touche(b, " ");
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse-reste-focalisable", async () => {
    const c = await monter(<ActionAvecRaison libelle="L" capacite={refuse("Raison R")} onAction={() => {}} />);
    const b = boutons(c)[0]!;
    expect(b.disabled).toBe(false);
    b.focus();
    expect(document.activeElement).toBe(b);
  });

  it("phrase-visible-et-reliee", async () => {
    const phrase = "Phrase <spéciale> & très longue " + "mot ".repeat(80);
    const c = await monter(<ActionAvecRaison libelle="L" capacite={refuse(phrase)} onAction={() => {}} />);
    const b = boutons(c)[0]!;
    const id = b.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    const cible = c.querySelector(`[id="${id}"]`);
    expect(cible?.textContent).toBe(phrase);
    expect(cible?.hasAttribute("hidden")).toBe(false);
    expect(cible?.getAttribute("role")).not.toBe("tooltip");
    expect(cible?.getAttribute("title")).toBeNull();
    expect(b.contains(cible)).toBe(false);
  });

  it("phrase-vide-leve-une-erreur", async () => {
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const raison of ["", "   ", undefined as unknown as string]) {
      await expect(monter(<ActionAvecRaison libelle="L" capacite={refuse(raison)} onAction={() => {}} />)).rejects.toThrow();
    }
    erreur.mockRestore();
  });

  it("deux-actions-deux-ids", async () => {
    const c = await monter(
      <>
        <ActionAvecRaison libelle="A" capacite={refuse("Raison A")} onAction={() => {}} />
        <ActionAvecRaison libelle="B" capacite={refuse("Raison B")} onAction={() => {}} />
      </>,
    );
    const [a, b] = boutons(c);
    const ia = a!.getAttribute("aria-describedby");
    const ib = b!.getAttribute("aria-describedby");
    expect(ia).not.toBe(ib);
    expect(c.querySelector(`[id="${ia}"]`)?.textContent).toBe("Raison A");
    expect(c.querySelector(`[id="${ib}"]`)?.textContent).toBe("Raison B");
  });
});
