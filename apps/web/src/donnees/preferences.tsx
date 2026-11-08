import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { ErreurEcriture, ErreurLecture, ecrire as ecrireApi, lire, nouvelleCle } from '../api.js';
import { validerPreference } from '../../../../packages/noyau/src/preferences/valider.js';

/** Même borne que la coque (socle.css). */
const REQUETE_MOBILE = '(max-width: 719px)';
const CLE_COPIE = 'axion.preferences.v1';
const CLE_FILE = 'axion.preferences.file.v1';
const CLES_DISPOSITION = ['menu_etat', 'chat_etat', 'chat_largeur_pct'];

export type Appareil = 'bureau' | 'mobile';
type Ecriture = { cle: string; valeur: unknown; appareil: string; modifieLeClient: number; idempotencyKey: string };
type Valeurs = Record<string, unknown>;

const SchemaLecture = z.object({ body: z.record(z.string(), z.object({ valeur: z.unknown() })) });
const SchemaEcriture = z.object({}).passthrough();

export const appareilCourant = (): Appareil =>
  typeof window.matchMedia === 'function' && window.matchMedia(REQUETE_MOBILE).matches ? 'mobile' : 'bureau';
const appareilDe = (cle: string, appareil: Appareil): string => (CLES_DISPOSITION.includes(cle) ? appareil : 'tous');

function lireJson(cle: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(cle) ?? 'null');
  } catch {
    return null;
  }
}
function ecrireJson(cle: string, v: unknown): void {
  try {
    localStorage.setItem(cle, JSON.stringify(v));
  } catch {
    /* stockage indisponible : la copie locale est facultative */
  }
}

/** Valeur relue par le validateur ; hors liste ou illisible = ignorée. */
function propre(cle: string, valeur: unknown, appareil: Appareil): { valeur: unknown } | null {
  try {
    return { valeur: validerPreference(cle, valeur, appareilDe(cle, appareil)).valeur };
  } catch {
    return null;
  }
}

function copieLocale(appareil: Appareil): Valeurs {
  const brut = lireJson(CLE_COPIE);
  const sortie: Valeurs = {};
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return sortie;
  const parAppareil = (brut as Record<string, unknown>)[appareil];
  if (typeof parAppareil !== 'object' || parAppareil === null || Array.isArray(parAppareil)) return sortie;
  for (const [cle, valeur] of Object.entries(parAppareil)) {
    const v = propre(cle, valeur, appareil);
    if (v) sortie[cle] = v.valeur;
  }
  return sortie;
}
function memoriser(appareil: Appareil, valeurs: Valeurs): void {
  const brut = lireJson(CLE_COPIE);
  const base = typeof brut === 'object' && brut !== null && !Array.isArray(brut) ? (brut as Record<string, unknown>) : {};
  ecrireJson(CLE_COPIE, { ...base, [appareil]: valeurs });
}

const estEcriture = (e: unknown): e is Ecriture => {
  const o = e as Partial<Ecriture> | null;
  return typeof o?.cle === 'string' && typeof o.appareil === 'string' && typeof o.idempotencyKey === 'string' && typeof o.modifieLeClient === 'number';
};
const lireFile = (): Ecriture[] => {
  const brut = lireJson(CLE_FILE);
  return Array.isArray(brut) ? brut.filter(estEcriture) : [];
};

type Contexte = { valeurs: Valeurs; ecrire: (cle: string, valeur: unknown) => void };
const Ctx = createContext<Contexte | null>(null);

/** Profil serveur = référence ; copie locale et file d'écritures rejouées en silence quand le serveur revient. */
export function FournisseurPreferences({ children }: { children: ReactNode }) {
  const appareil = useMemo(appareilCourant, []);
  const [valeurs, setValeurs] = useState<Valeurs>(() => copieLocale(appareil));
  const enCours = useRef(false);
  const vivant = useRef(true);

  const rejouer = useCallback(async (): Promise<void> => {
    if (enCours.current) return;
    enCours.current = true;
    try {
      for (let file = lireFile(); file[0]; file = lireFile()) {
        const e = file[0];
        try {
          await ecrireApi('PUT', '/preferences/' + encodeURIComponent(e.cle), { valeur: e.valeur, appareil: e.appareil, modifieLeClient: e.modifieLeClient }, SchemaEcriture, e.idempotencyKey);
        } catch (x) {
          if (!(x instanceof ErreurEcriture) || x.statut === 0 || x.statut >= 500) return;
        }
        ecrireJson(CLE_FILE, lireFile().filter((r) => r.idempotencyKey !== e.idempotencyKey));
      }
    } finally {
      enCours.current = false;
    }
  }, []);

  const charger = useCallback(async (): Promise<void> => {
    await rejouer();
    try {
      const r = await lire('/preferences?appareil=' + appareil, SchemaLecture);
      const serveur: Valeurs = {};
      for (const [cle, { valeur }] of Object.entries(r.body)) {
        const v = propre(cle, valeur, appareil);
        if (v) serveur[cle] = v.valeur;
      }
      for (const e of lireFile()) serveur[e.cle] = e.valeur;
      memoriser(appareil, serveur);
      if (vivant.current) setValeurs(serveur);
    } catch (x) {
      if (!(x instanceof ErreurLecture)) throw x;
    }
  }, [appareil, rejouer]);

  useEffect(() => {
    vivant.current = true;
    void charger();
    const auRetour = () => void rejouer();
    window.addEventListener('online', auRetour);
    return () => {
      vivant.current = false;
      window.removeEventListener('online', auRetour);
    };
  }, [charger, rejouer]);

  const ecrire = useCallback(
    (cle: string, valeur: unknown) => {
      const v = propre(cle, valeur, appareil);
      if (!v) return;
      setValeurs((avant) => {
        const suite = { ...avant, [cle]: v.valeur };
        memoriser(appareil, suite);
        return suite;
      });
      const entree: Ecriture = { cle, valeur: v.valeur, appareil: appareilDe(cle, appareil), modifieLeClient: Date.now(), idempotencyKey: nouvelleCle() };
      ecrireJson(CLE_FILE, [...lireFile(), entree]);
      void rejouer();
    },
    [appareil, rejouer],
  );

  const contexte = useMemo(() => ({ valeurs, ecrire }), [valeurs, ecrire]);
  return <Ctx.Provider value={contexte}>{children}</Ctx.Provider>;
}

/** Lit une préférence et donne la fonction qui l'écrit (appliquée tout de suite, envoyée en arrière-plan). */
export function usePreference<T = unknown>(cle: string): [T | undefined, (valeur: T) => void] {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePreference hors de FournisseurPreferences');
  const { ecrire } = c;
  return [c.valeurs[cle] as T | undefined, useCallback((v: T) => ecrire(cle, v), [ecrire, cle])];
}
