// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ZoneDepot } from "../ZoneDepot.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const conteneurs: HTMLElement[] = [];
const libelles = { zone: "Déposez vos pièces ici", bouton: "Choisir des fichiers", survol: "Relâchez pour déposer" };

async function monter(element: ReactNode): Promise<HTMLElement> {
  const conteneur = document.createElement("div");
  document.body.appendChild(conteneur);
  conteneurs.push(conteneur);
  await act(async () => {
    createRoot(conteneur).render(element);
  });
  return conteneur;
}

function fichier(nom: string): File {
  return new File(["contenu"], nom, { type: "application/pdf" });
}

async function evenement(cible: Element, type: string, fichiers?: File[]): Promise<Event> {
  const e = new Event(type, { bubbles: true, cancelable: true });
  if (fichiers) Object.defineProperty(e, "dataTransfer", { value: { files: fichiers } });
  await act(async () => {
    cible.dispatchEvent(e);
  });
  return e;
}

async function choisir(entree: HTMLInputElement, fichiers: File[]): Promise<void> {
  Object.defineProperty(entree, "files", { value: fichiers, configurable: true });
  await evenement(entree, "change");
}

afterEach(() => {
  for (const c of conteneurs.splice(0)) c.remove();
});

describe("ZoneDepot", () => {
  it("bouton-ouvre-le-selecteur", async () => {
    const c = await monter(<ZoneDepot surFichiers={() => {}} libelles={libelles} />);
    const entree = c.querySelector("input[type=file]") as HTMLInputElement;
    expect(entree).not.toBeNull();
    expect(entree.multiple).toBe(true);
    const clic = vi.spyOn(entree, "click");
    await act(async () => {
      c.querySelector("button")?.click();
    });
    expect(clic).toHaveBeenCalledTimes(1);
  });
  it("selection-rend-les-fichiers-canal-selecteur", async () => {
    const sur = vi.fn();
    const c = await monter(<ZoneDepot surFichiers={sur} libelles={libelles} />);
    const a = fichier("a.pdf");
    const b = fichier("b.pdf");
    await choisir(c.querySelector("input[type=file]") as HTMLInputElement, [a, b]);
    expect(sur).toHaveBeenCalledTimes(1);
    expect(sur).toHaveBeenCalledWith([a, b], "selecteur");
  });
  it("depot-rend-les-fichiers-canal-glisser", async () => {
    const sur = vi.fn();
    const c = await monter(<ZoneDepot surFichiers={sur} libelles={libelles} />);
    const a = fichier("a.pdf");
    const zone = c.querySelector(".axion-zone-depot") as Element;
    const e = await evenement(zone, "drop", [a]);
    expect(e.defaultPrevented).toBe(true);
    expect(sur).toHaveBeenCalledTimes(1);
    expect(sur).toHaveBeenCalledWith([a], "glisser");
  });
  it("liste-vide-ignoree", async () => {
    const sur = vi.fn();
    const c = await monter(<ZoneDepot surFichiers={sur} libelles={libelles} />);
    await choisir(c.querySelector("input[type=file]") as HTMLInputElement, []);
    await evenement(c.querySelector(".axion-zone-depot") as Element, "drop", []);
    expect(sur).not.toHaveBeenCalled();
  });
  it("survol-visible", async () => {
    const c = await monter(<ZoneDepot surFichiers={() => {}} libelles={libelles} />);
    const zone = c.querySelector(".axion-zone-depot") as Element;
    expect(zone.classList.contains("axion-zone-depot--survol")).toBe(false);
    expect(c.textContent).not.toContain(libelles.survol);
    const e = await evenement(zone, "dragover", []);
    expect(e.defaultPrevented).toBe(true);
    expect(zone.classList.contains("axion-zone-depot--survol")).toBe(true);
    expect(c.textContent).toContain(libelles.survol);
    await evenement(zone, "dragleave");
    expect(zone.classList.contains("axion-zone-depot--survol")).toBe(false);
    expect(c.textContent).not.toContain(libelles.survol);
  });
  it("desactive-bloque-les-deux-voies", async () => {
    const sur = vi.fn();
    const c = await monter(<ZoneDepot surFichiers={sur} libelles={libelles} desactive />);
    const entree = c.querySelector("input[type=file]") as HTMLInputElement;
    expect(entree.disabled).toBe(true);
    expect(c.querySelector("button")?.disabled).toBe(true);
    await choisir(entree, [fichier("a.pdf")]);
    const zone = c.querySelector(".axion-zone-depot") as Element;
    await evenement(zone, "dragover", []);
    expect(zone.classList.contains("axion-zone-depot--survol")).toBe(false);
    await evenement(zone, "drop", [fichier("b.pdf")]);
    expect(sur).not.toHaveBeenCalled();
  });
  it("bouton-nomme-par-son-libelle", async () => {
    const c = await monter(<ZoneDepot surFichiers={() => {}} libelles={libelles} />);
    const bouton = c.querySelector("button") as HTMLButtonElement;
    expect(bouton.textContent).toBe(libelles.bouton);
    expect(c.textContent).toContain(libelles.zone);
  });
});
