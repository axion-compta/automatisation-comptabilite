// Brouillon local chiffré (AES-GCM 256) : écrit 2 s après la dernière modification, repris après fermeture.
// Fiche L25-T08. La clé est non extractible, gardée par le stockage, une par personne et par société.

export const DELAI_ECRITURE_MS = 2000;
const OCTETS_NONCE = 12;

export interface StockageBrouillon {
  lire(cle: string): Promise<Uint8Array | null>;
  ecrire(cle: string, octets: Uint8Array): Promise<void>;
  effacer(cle: string): Promise<void>;
  lireCle(cle: string): Promise<CryptoKey | null>;
  ecrireCle(cle: string, valeur: CryptoKey): Promise<void>;
}

export interface Brouillon<T = unknown> {
  modifier(valeur: T): void;
  reprendre(): Promise<T | null>;
  effacer(): Promise<void>;
}

export interface OptionsBrouillon {
  formulaire: string;
  societeId: string;
  personneId: string;
  stockage?: StockageBrouillon;
}

const NOM_BASE = 'axion-brouillons';

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const demande = indexedDB.open(NOM_BASE, 1);
    demande.onupgradeneeded = () => {
      demande.result.createObjectStore('brouillons');
      demande.result.createObjectStore('cles');
    };
    demande.onsuccess = () => resolve(demande.result);
    demande.onerror = () => reject(demande.error);
  });
}

async function operer<R>(magasin: 'brouillons' | 'cles', mode: IDBTransactionMode, f: (m: IDBObjectStore) => IDBRequest<R>): Promise<R> {
  const base = await ouvrir();
  try {
    return await new Promise<R>((resolve, reject) => {
      const requete = f(base.transaction(magasin, mode).objectStore(magasin));
      requete.onsuccess = () => resolve(requete.result);
      requete.onerror = () => reject(requete.error);
    });
  } finally {
    base.close();
  }
}

/** Adaptateur IndexedDB par défaut. */
export function stockageIndexedDb(): StockageBrouillon {
  return {
    async lire(cle) {
      const v = await operer<Uint8Array | undefined>('brouillons', 'readonly', (m) => m.get(cle));
      return v ?? null;
    },
    async ecrire(cle, octets) {
      await operer('brouillons', 'readwrite', (m) => m.put(octets, cle));
    },
    async effacer(cle) {
      await operer('brouillons', 'readwrite', (m) => m.delete(cle));
    },
    async lireCle(cle) {
      const v = await operer<CryptoKey | undefined>('cles', 'readonly', (m) => m.get(cle));
      return v ?? null;
    },
    async ecrireCle(cle, valeur) {
      await operer('cles', 'readwrite', (m) => m.put(valeur, cle));
    },
  };
}

async function cleDe(stockage: StockageBrouillon, idCle: string): Promise<CryptoKey> {
  const existante = await stockage.lireCle(idCle);
  if (existante) return existante;
  const nouvelle = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await stockage.ecrireCle(idCle, nouvelle);
  return nouvelle;
}

export function creerBrouillon<T = unknown>({ formulaire, societeId, personneId, stockage = stockageIndexedDb() }: OptionsBrouillon): Brouillon<T> {
  const idCle = JSON.stringify([societeId, personneId]);
  const idBrouillon = JSON.stringify([societeId, personneId, formulaire]);
  let minuterie: ReturnType<typeof setTimeout> | null = null;
  let version = 0;

  const annuler = () => {
    version += 1;
    if (minuterie !== null) clearTimeout(minuterie);
    minuterie = null;
  };

  const ecrire = async (valeur: T, ma: number) => {
    try {
      const cle = await cleDe(stockage, idCle);
      const nonce = crypto.getRandomValues(new Uint8Array(OCTETS_NONCE));
      const clair = new TextEncoder().encode(JSON.stringify(valeur));
      const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cle, clair));
      if (ma !== version) return; // effacé ou remplacé pendant le chiffrement
      const sortie = new Uint8Array(OCTETS_NONCE + chiffre.length);
      sortie.set(nonce, 0);
      sortie.set(chiffre, OCTETS_NONCE);
      await stockage.ecrire(idBrouillon, sortie);
    } catch {
      // stockage indisponible : le brouillon est perdu, la saisie continue.
    }
  };

  return {
    modifier(valeur) {
      annuler();
      const ma = version;
      minuterie = setTimeout(() => {
        minuterie = null;
        void ecrire(valeur, ma);
      }, DELAI_ECRITURE_MS);
    },
    async reprendre() {
      try {
        const octets = await stockage.lire(idBrouillon);
        if (!octets) return null;
        try {
          if (octets.length <= OCTETS_NONCE) throw new Error('trop court');
          const cle = await stockage.lireCle(idCle);
          if (!cle) throw new Error('clé absente');
          const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: octets.slice(0, OCTETS_NONCE) }, cle, octets.slice(OCTETS_NONCE));
          return JSON.parse(new TextDecoder().decode(clair)) as T;
        } catch {
          await stockage.effacer(idBrouillon);
          return null;
        }
      } catch {
        return null;
      }
    },
    async effacer() {
      annuler();
      try {
        await stockage.effacer(idBrouillon);
      } catch {
        // rien à effacer
      }
    },
  };
}
