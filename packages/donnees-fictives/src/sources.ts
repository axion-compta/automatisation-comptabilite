// État fictif des sources et connecteurs, à graine fixe (V3-PRI-017). Aucun vrai nom de connecteur commercial.
import { creerAlea, GRAINE } from './generateur.js';
import { serialiserStable, type OptionsFictives } from './juridique.js';

export interface ConnecteurFictif {
  connecteur: string;
  etat: 'ok' | 'degrade' | 'panne';
  dernierOk: string | null;
}

export interface JeuSources {
  version: 1;
  veille: { etat: 'ok' | 'alerte'; dernierBalayage: string; depotAutomatiqueAutorise: boolean };
  connecteurs: ConnecteurFictif[];
}

export function serialiserSources(jeu: JeuSources): string {
  return serialiserStable(jeu);
}

export function genererSources(graine: number = GRAINE, options: OptionsFictives = {}): JeuSources {
  const alea = creerAlea(graine);
  const etat: 'ok' | 'alerte' = alea() < 0.5 ? 'ok' : 'alerte';
  const jourBalayage = String(1 + Math.floor(alea() * 28)).padStart(2, '0');
  const veille = {
    etat,
    dernierBalayage: `2026-11-${jourBalayage}`,
    // Le dépôt automatique est interdit dès que la veille est en alerte.
    depotAutomatiqueAutorise: etat === 'ok',
  };
  if (options.vide === true) return { version: 1, veille, connecteurs: [] };
  return {
    version: 1,
    veille,
    connecteurs: [
      { connecteur: 'annuaire_entreprises', etat: 'ok', dernierOk: '2026-11-05' },
      { connecteur: 'tva_intracom', etat: 'degrade', dernierOk: '2026-11-03' },
      { connecteur: 'plateforme_agreee', etat: 'ok', dernierOk: '2026-11-06' },
    ],
  };
}
