// @vitest-environment jsdom
// Fiche L25-T08 : brouillon local chiffré (AES-GCM 256), écrit 2 s après la dernière frappe.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { creerBrouillon, type StockageBrouillon } from '../brouillon-local.js';

function stockageMemoire() {
  const brouillons = new Map<string, Uint8Array>();
  const cles = new Map<string, CryptoKey>();
  const stockage: StockageBrouillon = {
    lire: async (cle) => brouillons.get(cle) ?? null,
    ecrire: async (cle, octets) => void brouillons.set(cle, octets),
    effacer: async (cle) => void brouillons.delete(cle),
    lireCle: async (cle) => cles.get(cle) ?? null,
    ecrireCle: async (cle, valeur) => void cles.set(cle, valeur),
  };
  return { stockage, brouillons, cles };
}
type Memoire = ReturnType<typeof stockageMemoire>;
const SAISIE = { libelle: 'Achat de fournitures Dupond-Exemple', montant: '1234,56' };
const nouveau = (m: Memoire, societeId = 's1', personneId = 'p1', formulaire = 'ecriture') => creerBrouillon({ formulaire, societeId, personneId, stockage: m.stockage });
const finir = async () => {
  const fin = Date.now() + 100;
  while (Date.now() < fin) await new Promise<void>((r) => setImmediate(r));
};
const attendre = async (ms: number) => {
  await vi.advanceTimersByTimeAsync(ms);
  await finir();
};
beforeEach(() => void vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => void vi.useRealTimers());
describe('brouillon local chiffré', () => {
  it('rien-avant-2-s', async () => {
    const m = stockageMemoire();
    nouveau(m).modifier(SAISIE); await attendre(1999);
    expect(m.brouillons.size).toBe(0);
  });
  it('ecrit-2-s-apres-la-derniere-frappe', async () => {
    const m = stockageMemoire();
    const b = nouveau(m);
    b.modifier({ ...SAISIE, montant: '1' }); await attendre(1500);
    b.modifier(SAISIE); await attendre(1999);
    expect(m.brouillons.size).toBe(0);
    await attendre(1);
    expect(m.brouillons.size).toBe(1);
    expect(await b.reprendre()).toEqual(SAISIE);
  });
  it('repris-apres-fermeture', async () => {
    const m = stockageMemoire();
    nouveau(m).modifier(SAISIE); await attendre(2000);
    expect(await nouveau(m).reprendre()).toEqual(SAISIE);
  });
  it('stockage-sans-clair', async () => {
    const m = stockageMemoire();
    const espion = vi.spyOn(console, 'log');
    const b = nouveau(m);
    b.modifier(SAISIE); await attendre(2000);
    const octets = [...m.brouillons.values()][0]!;
    const texte = new TextDecoder('latin1').decode(octets);
    for (const clair of ['fournitures', 'Dupond', '1234']) expect(texte).not.toContain(clair);
    expect(JSON.stringify(Object.entries(localStorage))).not.toContain('fournitures');
    expect(espion).not.toHaveBeenCalled();
    expect([...m.cles.values()][0]!.extractable).toBe(false);
    b.modifier(SAISIE); await attendre(2000);
    expect(Array.from([...m.brouillons.values()][0]!)).not.toEqual(Array.from(octets));
  });
  it('autre-societe-ne-lit-pas', async () => {
    const m = stockageMemoire();
    nouveau(m).modifier(SAISIE); await attendre(2000);
    const [autre, autrePersonne] = [nouveau(m, 's2'), nouveau(m, 's1', 'p2')];
    expect([await autre.reprendre(), await autrePersonne.reprendre()]).toEqual([null, null]);
    autre.modifier(SAISIE); autrePersonne.modifier(SAISIE); await attendre(2000);
    expect(m.cles.size).toBe(3);
    expect(await nouveau(m).reprendre()).toEqual(SAISIE);
  });
  it('deux-formulaires-une-seule-cle', async () => {
    const m = stockageMemoire();
    let ecritures = 0;
    const lent: StockageBrouillon = {
      ...m.stockage,
      lireCle: async (cle) => { await new Promise<void>((r) => setImmediate(r)); return m.cles.get(cle) ?? null; },
      ecrireCle: async (cle, valeur) => { ecritures += 1; m.cles.set(cle, valeur); },
    };
    const [a, b] = ['ecriture', 'facture'].map((formulaire) => creerBrouillon({ formulaire, societeId: 's1', personneId: 'p1', stockage: lent }));
    a!.modifier(SAISIE); b!.modifier({ ...SAISIE, montant: '9' }); await attendre(2000);
    expect([ecritures, m.cles.size]).toEqual([1, 1]);
    const cle = [...m.cles.values()][0];
    a!.modifier(SAISIE); await attendre(2000);
    expect([...m.cles.values(), ecritures]).toEqual([cle, 1]);
    expect([await a!.reprendre(), await b!.reprendre()]).toEqual([SAISIE, { ...SAISIE, montant: '9' }]);
  });
  it('brouillon-altere-efface', async () => {
    const m = stockageMemoire();
    nouveau(m).modifier(SAISIE); await attendre(2000);
    const [cle, octets] = [...m.brouillons.entries()][0]!;
    const abime = new Uint8Array(octets);
    abime[abime.length - 1] = abime[abime.length - 1]! ^ 0xff;
    m.brouillons.set(cle, abime);
    const b = nouveau(m);
    expect(await b.reprendre()).toBeNull();
    expect(m.brouillons.size).toBe(0);
    m.brouillons.set(cle, new Uint8Array(3));
    expect(await b.reprendre()).toBeNull();
    expect(m.brouillons.size).toBe(0);
  });
  it('efface-apres-envoi', async () => {
    const m = stockageMemoire();
    const b = nouveau(m);
    b.modifier(SAISIE); await attendre(2000);
    expect(m.brouillons.size).toBe(1);
    await b.effacer();
    expect([m.brouillons.size, await b.reprendre()]).toEqual([0, null]);
    b.modifier(SAISIE); await b.effacer(); await attendre(5000);
    expect(m.brouillons.size).toBe(0);
  });
  it('efface-pendant-le-chiffrement', async () => {
    const m = stockageMemoire();
    const b = nouveau(m);
    b.modifier(SAISIE); await vi.advanceTimersByTimeAsync(2000);
    await b.effacer(); await finir();
    expect(m.brouillons.size).toBe(0);
  });
});
