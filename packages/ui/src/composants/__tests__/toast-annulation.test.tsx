// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastAnnulation } from "../ToastAnnulation.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const montes: { racine: Root; el: HTMLElement }[] = [];
const texte = (s: number) => `reste ${s}`;
const maintenant = () => Date.now();

async function monter(dureeMs: number) {
  const onAnnuler = vi.fn();
  const onFin = vi.fn();
  const el = document.createElement("div");
  document.body.appendChild(el);
  const racine = createRoot(el);
  montes.push({ racine, el });
  await act(async () => {
    racine.render(<ToastAnnulation dureeMs={dureeMs} libelleAnnuler="Annuler" texteRestant={texte} onAnnuler={onAnnuler} onFin={onFin} maintenant={maintenant} />);
  });
  return { el, onAnnuler, onFin, racine };
}
const avancer = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const visible = (el: HTMLElement) => el.querySelector("[aria-hidden]")?.textContent;
const bouton = (el: HTMLElement) => el.querySelector("button") as HTMLButtonElement;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  for (const m of montes.splice(0)) { act(() => m.racine.unmount()); m.el.remove(); }
  vi.useRealTimers();
});

describe("ToastAnnulation", () => {
  it("decompte-a-la-seconde", async () => {
    const { el } = await monter(5000);
    expect(visible(el)).toBe("reste 5");
    await avancer(1000);
    expect(visible(el)).toBe("reste 4");
    await avancer(2000);
    expect(visible(el)).toBe("reste 2");
  });

  it("fin-appelee-une-fois", async () => {
    const { el, onFin, onAnnuler } = await monter(2000);
    await avancer(1900);
    expect(onFin).not.toHaveBeenCalled();
    await avancer(10000);
    expect(onFin).toHaveBeenCalledTimes(1);
    expect(onAnnuler).not.toHaveBeenCalled();
    expect(el.querySelector("button")).toBeNull();
  });

  it("annuler-une-seule-fois", async () => {
    const { el, onAnnuler, onFin } = await monter(5000);
    await act(async () => { bouton(el).click(); bouton(el).click(); });
    expect(onAnnuler).toHaveBeenCalledTimes(1);
    expect(el.querySelector("button")).toBeNull();
    await avancer(10000);
    expect(onFin).not.toHaveBeenCalled();
  });

  it("annuler-au-clavier", async () => {
    for (const [key, appels] of [["Enter", 1], [" ", 1], ["a", 0]] as const) {
      const { el, onAnnuler } = await monter(5000);
      await act(async () => { bouton(el).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })); });
      expect(onAnnuler).toHaveBeenCalledTimes(appels);
    }
  });

  it("pause-au-focus", async () => {
    const { el, onFin } = await monter(4000);
    await act(async () => { bouton(el).focus(); });
    await avancer(10000);
    expect(onFin).not.toHaveBeenCalled();
    expect(visible(el)).toBe("reste 4");
    await act(async () => { bouton(el).blur(); });
    await avancer(4500);
    expect(onFin).toHaveBeenCalledTimes(1);
    const survol = await monter(4000);
    await act(async () => { survol.el.firstElementChild?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })); });
    await avancer(10000);
    expect(survol.onFin).not.toHaveBeenCalled();
  });

  it("annonces-limitees", async () => {
    const { el } = await monter(6000);
    const vues = new Set<string>();
    for (let i = 0; i < 24; i++) {
      vues.add(el.querySelector("[role=status]")?.textContent ?? "");
      await avancer(250);
    }
    expect([...vues]).toEqual(["reste 6", "reste 3"]);
  });

  it("duree-invalide", async () => {
    for (const d of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { el, onFin } = await monter(d);
      expect(el.querySelector(".axion-toast")).toBeNull();
      expect(onFin).toHaveBeenCalledTimes(1);
    }
  });

  it("demontage-sans-fuite", async () => {
    const { racine, onFin } = await monter(5000);
    expect(vi.getTimerCount()).toBe(1);
    await act(async () => { racine.unmount(); });
    expect(vi.getTimerCount()).toBe(0);
    await avancer(10000);
    expect(onFin).not.toHaveBeenCalled();
  });
});
