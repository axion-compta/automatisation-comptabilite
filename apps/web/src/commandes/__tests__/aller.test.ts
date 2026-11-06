// Fiche L00-T16 : /aller sur 50 phrases fictives et palette Ctrl+K.
import { describe, expect, it, vi } from 'vitest';
import { aller, executerCommande, normaliser } from '../aller.js';
import { estRaccourciPalette, installerRaccourci, proposer } from '../palette.js';

const PHRASES: ReadonlyArray<readonly [string, string]> = [
  ['je veux voir mon accueil', 'accueil'], ['ouvre le tableau de bord', 'accueil'], ['retour au début', 'accueil'], ['affiche le résumé', 'accueil'], ["va à l'accueil", 'accueil'],
  ['voir les écritures', 'ecritures'], ['ouvre le journal', 'ecritures'], ['nouvelle saisie', 'ecritures'], ["montre une ligne d'écriture", 'ecritures'], ['aller aux écritures du mois', 'ecritures'],
  ['ouvre la banque', 'banque'], ['relevé bancaire', 'banque'], ['faire le rapprochement', 'banque'], ['voir mon compte', 'banque'], ['afficher le relevé', 'banque'],
  ['mes ventes', 'ventes'], ['liste des clients', 'ventes'], ['créer un devis', 'ventes'], ['aller sur les ventes', 'ventes'], ['voir un client', 'ventes'],
  ['mes achats', 'achats'], ['liste des fournisseurs', 'achats'], ['voir les dépenses', 'achats'], ['ouvre un achat', 'achats'], ['page fournisseur', 'achats'],
  ['la TVA', 'tva'], ['ma déclaration', 'tva'], ['voir la taxe', 'tva'], ['TVA collectée', 'tva'], ['TVA déductible', 'tva'],
  ['mes documents', 'documents'], ['ouvre une pièce', 'documents'], ['voir les justificatifs', 'documents'], ['les pièces du mois', 'documents'], ['aller aux documents', 'documents'],
  ['les contrôles', 'controles'], ['voir les doutes', 'controles'], ['une anomalie', 'controles'], ['ouvre un contrôle', 'controles'], ['vérifier les écarts', 'controles'],
  ['mes paramètres', 'parametres'], ['les réglages', 'parametres'], ['changer une option', 'parametres'], ['voir mon profil', 'parametres'], ['ouvre les paramètres', 'parametres'],
  ["j'ai besoin d'aide", 'aide'], ['assistance', 'aide'], ['ouvre le guide', 'aide'], ['la notice', 'aide'], ['contacter le support', 'aide'],
];

describe('/aller sur 50 phrases', () => {
  it('le jeu compte bien 50 phrases', () => {
    expect(PHRASES).toHaveLength(50);
  });
  it.each(PHRASES)('« %s » mène à %s', (phrase, attendu) => {
    expect(aller(phrase)?.id).toBe(attendu);
  });
  it('une phrase inconnue ne mène nulle part', () => {
    expect(aller('bonjour tout le monde')).toBeNull();
    expect(aller('')).toBeNull();
  });
  it('normalise accents, casse et mots vides', () => {
    expect(normaliser('  Ouvre LES Écritures ! ')).toEqual(['ecritures']);
  });
  it('/aller : reconnue ou ignorée', () => {
    expect(executerCommande('/aller la banque')?.destination?.chemin).toBe('/banque');
    expect(executerCommande('/aller')?.destination).toBeNull();
    expect(executerCommande('/aller charabia')?.destination).toBeNull();
    expect(executerCommande('bonjour')).toBeNull();
  });
});

describe('palette Ctrl+K', () => {
  const touche = (o: Partial<Parameters<typeof estRaccourciPalette>[0]>) => ({ key: 'k', ctrlKey: false, metaKey: false, ...o });
  it('Ctrl+K et Cmd+K ouvrent, le reste non', () => {
    expect(estRaccourciPalette(touche({ ctrlKey: true }))).toBe(true);
    expect(estRaccourciPalette(touche({ metaKey: true, key: 'K' }))).toBe(true);
    expect(estRaccourciPalette(touche({}))).toBe(false);
    expect(estRaccourciPalette(touche({ ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(estRaccourciPalette(touche({ ctrlKey: true, key: 'j' }))).toBe(false);
  });
  it('propose tout si vide, filtre sinon, accepte le préfixe /aller', () => {
    expect(proposer('')).toHaveLength(8);
    expect(proposer('tva').map((d) => d.id)).toEqual(['tva']);
    expect(proposer('/aller banque')[0]?.id).toBe('banque');
    expect(proposer('zzz')).toEqual([]);
  });
  it("installe puis retire l'écouteur", () => {
    const ouvrir = vi.fn();
    const cible = new EventTarget() as unknown as Document;
    const retirer = installerRaccourci(cible, ouvrir);
    const ev = new Event('keydown', { cancelable: true });
    Object.assign(ev, { key: 'k', ctrlKey: true, metaKey: false });
    cible.dispatchEvent(ev);
    expect(ouvrir).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
    retirer();
    cible.dispatchEvent(ev);
    expect(ouvrir).toHaveBeenCalledTimes(1);
  });
});
