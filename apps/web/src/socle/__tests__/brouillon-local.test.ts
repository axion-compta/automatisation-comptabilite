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

const SAISIE = { libelle: 'Achat de fournitures Dupond-Exemple', montant: '1234,56' };

// WebCrypto s'exécute hors des horloges simulées : après l'avance du temps, on laisse finir les promesses réelles.
const nouveau = (m: { stockage: StockageBrouillon }, societeId = 's1', personneId = 'p1') =>
  creerBrouillon({ formulaire: 'ecriture', societeId, personneId, stockage: m.stockage });

async function attendre(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
  for (let i = 0; i < 300; i++) await new Promise<void>((r) => setImmediate(r));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('brouillon local chiffré', () => {
  it('rien-avant-2-s', async () => {
    const m = stockageMemoire();
    const b = nouveau(m);
    b.modifier(SAISIE);
    await attendre(1999);
    expect(m.brouillons.size).toBe(0);
  });

  it('ecrit-2-s-apres-la-derniere-frappe', async () => {
    const m = stockageMemoire();
    const b = nouveau(m);
    b.modifier({ ...SAISIE, montant: '1' });
    await attendre(1500);
    b.modifier(SAISIE); // relance le délai
    await attendre(1999);
    expect(m.brouillons.size).toBe(0);
    await attendre(1);
    expect(m.brouillons.size).toBe(1);
    expect(await b.reprendre()).toEqual(SAISIE);
  });

  it('repris-apres-fermeture', async () => {
    const m = stockageMemoire();
    const a = nouveau(m);
    a.modifier(SAISIE);
    await attendre(2000);
    const b = nouveau(m);
    expect(await b.reprendre()).toEqual(SAISIE);
  });

  it('stockage-sans-clair', async () => {
    const m = stockageMemoire();
    const espion = vi.spyOn(console, 'log');
    const b = nouveau(m);
    b.modifier(SAISIE);
    await attendre(2000);
    const octets = [...m.brouillons.values()][0]!;
    const texte = new TextDecoder('latin1').decode(octets);
    expect(texte).not.toContain('fournitures');
    expect(texte).not.toContain('Dupond');
    expect(texte).not.toContain('1234');
    expect(JSON.stringify(Object.entries(localStorage))).not.toContain('fournitures');
    expect(espion).not.toHaveBeenCalled();
    // la clé n'est pas extractible
    const cle = [...m.cles.values()][0]!;
    expect(cle.extractable).toBe(false);
    // nonce aléatoire : deux écritures de la même valeur donnent des octets différents
    b.modifier(SAISIE);
    await attendre(2000);
    const octets2 = [...m.brouillons.values()][0]!;
    expect(Array.from(octets2)).not.toEqual(Array.from(octets));
  });

  it('autre-societe-ne-lit-pas', async () => {
    const m = stockageMemoire();
    const a = nouveau(m);
    a.modifier(SAISIE);
    await attendre(2000);
    const autre = nouveau(m, 's2');
    expect(await autre.reprendre()).toBeNull();
    const autrePersonne = nouveau(m, 's1', 'p2');
    expect(await autrePersonne.reprendre()).toBeNull();
    // une clé par personne et par société
    autre.modifier(SAISIE);
    autrePersonne.modifier(SAISIE);
    await attendre(2000);
    expect(m.cles.size).toBe(3);
  });

  it('brouillon-altere-efface', async () => {
    const m = stockageMemoire();
    const a = nouveau(m);
    a.modifier(SAISIE);
    await attendre(2000);
    const [cle, octets] = [...m.brouillons.entries()][0]!;
    const abime = new Uint8Array(octets);
    abime[abime.length - 1] = abime[abime.length - 1]! ^ 0xff;
    m.brouillons.set(cle, abime);
    const b = nouveau(m);
    expect(await b.reprendre()).toBeNull();
    expect(m.brouillons.size).toBe(0);
    // trop court pour contenir un nonce : même traitement
    m.brouillons.set(cle, new Uint8Array(3));
    expect(await b.reprendre()).toBeNull();
    expect(m.brouillons.size).toBe(0);
  });

  it('efface-apres-envoi', async () => {
    const m = stockageMemoire();
    const b = nouveau(m);
    b.modifier(SAISIE);
    await attendre(2000);
    expect(m.brouillons.size).toBe(1);
    await b.effacer();
    expect(m.brouillons.size).toBe(0);
    expect(await b.reprendre()).toBeNull();
    // une écriture en attente est annulée par effacer()
    b.modifier(SAISIE);
    await b.effacer();
    await attendre(5000);
    expect(m.brouillons.size).toBe(0);
  });

  it('efface-pendant-le-chiffrement', async () => {
    const m = stockageMemoire();
    const b = nouveau(m);
    b.modifier(SAISIE);
    await vi.advanceTimersByTimeAsync(2000); // le chiffrement est lancé, pas terminé
    await b.effacer();
    for (let i = 0; i < 300; i++) await new Promise<void>((r) => setImmediate(r));
    expect(m.brouillons.size).toBe(0);
  });
});
