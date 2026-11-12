// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BandeauEtat } from "../BandeauEtat.js";

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
afterEach(() => conteneurs.splice(0).forEach((c) => c.remove()));

describe("BandeauEtat", () => {
  it("bandeau-trois-niveaux", async () => {
    const icones = new Set<string | null>();
    for (const niveau of ["info", "attention", "panne"] as const) {
      const el = await monter(<BandeauEtat niveau={niveau} texte={`texte ${niveau}`} />);
      const b = el.firstElementChild as HTMLElement;
      expect(b.className).toContain(`axion-bandeau-etat--${niveau}`);
      expect(b.textContent).toContain(`texte ${niveau}`);
      const icone = b.querySelector("[data-icone]");
      expect(icone?.getAttribute("aria-hidden")).toBe("true");
      expect(icone?.textContent).not.toBe("");
      icones.add(icone?.textContent ?? null);
    }
    expect(icones.size).toBe(3);
  });
  it("bandeau-panne-role-alert", async () => {
    const role = async (niveau: "info" | "attention" | "panne") => (await monter(<BandeauEtat niveau={niveau} texte="t" />)).firstElementChild?.getAttribute("role");
    expect([await role("info"), await role("attention"), await role("panne")]).toEqual(["status", "status", "alert"]);
  });
  it("bandeau-action-facultative", async () => {
    const sans = await monter(<BandeauEtat niveau="info" texte="t" />);
    expect(sans.querySelector("button")).toBeNull();
    const onClick = vi.fn();
    const avec = await monter(<BandeauEtat niveau="attention" texte="t" action={{ libelle: "Réessayer", onClick }} />);
    const bouton = avec.querySelector("button") as HTMLButtonElement;
    expect(bouton.textContent).toBe("Réessayer");
    expect(bouton.type).toBe("button");
    await act(async () => bouton.click());
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it("refuse-texte-vide-ou-niveau-inconnu", async () => {
    await expect(monter(<BandeauEtat niveau="info" texte="  " />)).rejects.toThrow("texte_bandeau_vide");
    await expect(monter(<BandeauEtat niveau={"x" as "info"} texte="t" />)).rejects.toThrow("niveau_bandeau_inconnu");
  });
});
