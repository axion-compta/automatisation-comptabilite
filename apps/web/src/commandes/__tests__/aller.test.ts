// Fiche L00-T16 : /aller sur 50 phrases fictives (dont fautes, majuscules, pièges) et palette Ctrl+K.
import { describe, expect, it, vi } from 'vitest';
import { aller, executerCommande, normaliser } from '../aller.js';
import { estRaccourciPalette, installerRaccourci, proposer } from '../raccourci.js';

const PHRASES: ReadonlyArray<readonly [string, string | null]> = [
  ['je veux voir mon accueil', 'accueil'], ['OUVRE LE TABLEAU DE BORD', 'accueil'], ['retour au début', 'accueil'], ['affiche le résumé', 'accueil'],
  ['voir les écritures', 'ecritures'], ['ouvre le journal', 'ecritures'], ['nouvelle saisie', 'ecritures'], ["montre une ligne d'écriture", 'ecritures'], ['ECRITUE', 'ecritures'],
  ['ouvre la banque', 'banque'], ['relevé bancaire', 'banque'], ['faire le rapprochement', 'banque'], ['voir mon compte', 'banque'], ['ouvre la BNAQUE', 'banque'],
  ['liste des clients', 'ventes'], ['créer un devis', 'ventes'], ['facture client', 'ventes'], ['MES VENTES', 'ventes'],
  ['mes achats', 'achats'], ['liste des fournisseurs', 'achats'], ['voir les dépenses', 'achats'], ['facture fournisseur', 'achats'],
  ['la TVA', 'tva'], ['ma déclaration', 'tva'], ['voir la taxe', 'tva'], ['voir la tba', 'tva'], ['TVA collectée', 'tva'],
  ['déclaration de TVA collectée', 'tva'], ['déclaration de TVA collectée sur les ventes', 'tva'],
  ['mes documents', 'documents'], ['ouvre une pièce', 'documents'], ['voir les justificatifs', 'documents'], ['docment du mois', 'documents'],
  ['les contrôles', 'controles'], ['voir les doutes', 'controles'], ['une anomalie', 'controles'], ['vérification des écarts', 'controles'],
  ['mes paramètres', 'parametres'], ['les réglages', 'parametres'], ['changer une option', 'parametres'],
  ["j'ai besoin d'aide", 'aide'], ['assistance', 'aide'],
  ['quelle heure est-il', null], ['compte client', null], ['compte fournisseur', null], ['tableau des ventes', null],
  ['ne pas aller à la banque', null], ['la banque de France monte ses taux', null], ['bonjour tout le monde', null], ['facture', null],
];

describe('/aller sur 50 phrases', () => {
  it('le jeu compte bien 50 phrases dont 8 sans destination', () => {
    expect(PHRASES).toHaveLength(50);
    expect(PHRASES.filter(([, a]) => a === null)).toHaveLength(8);
  });
  it.each(PHRASES)('« %s » donne %s', (phrase, attendu) => {
    expect(aller(phrase)?.id ?? null).toBe(attendu);
  });
  it('la meilleure destination gagne parmi plusieurs candidates', () => {
    expect(aller('déclaration de TVA collectée sur les ventes')?.id).toBe('tva');
    expect(aller('facture client')?.id).toBe('ventes');
  });
  it('égalité de score : aucune devinette, mais la palette propose les deux', () => {
    expect(aller('vérifier la banque')).toBeNull();
    expect(proposer('compte client').map((d) => d.id)).toEqual(['banque', 'ventes']);
  });
  it('« s » final retiré et nouveaux mots reconnus', () => {
    expect(normaliser('Ouvre LES Écritures !')).toEqual(['ecriture']);
    expect(aller('les taxes')?.id).toBe('tva');
    expect(aller('les anomalies')?.id).toBe('controles');
    expect(aller('contrôler')?.id).toBe('controles');
    expect(aller('déclarer')?.id).toBe('tva');
  });
  it('/aller : reconnue ou ignorée, forme unique', () => {
    expect(executerCommande('/aller la banque')?.destination?.chemin).toBe('/banque');
    expect(executerCommande('/aller')?.destination).toBeNull();
    expect(executerCommande('/aller charabia')?.destination).toBeNull();
    expect(executerCommande('/allerbanque')).toBeNull();
    expect(executerCommande('/aller\nla banque')?.destination?.id).toBe('banque');
    expect(executerCommande('/aller la\nbanque')?.destination?.id).toBe('banque');
    expect(executerCommande('bonjour')).toBeNull();
    expect(proposer('/allerbanque')).toEqual([]);
    expect(proposer('/aller\ntva').map((d) => d.id)).toEqual(['tva']);
  });
});

describe('palette Ctrl+K', () => {
  const touche = (o: Partial<Parameters<typeof estRaccourciPalette>[0]>) => ({ key: 'k', ctrlKey: false, metaKey: false, ...o });
  it('Ctrl+K et Cmd+K ouvrent, le reste non, même sans key', () => {
    expect(estRaccourciPalette(touche({ ctrlKey: true }))).toBe(true);
    expect(estRaccourciPalette(touche({ metaKey: true, key: 'K' }))).toBe(true);
    expect(estRaccourciPalette(touche({}))).toBe(false);
    expect(estRaccourciPalette(touche({ ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(estRaccourciPalette(touche({ ctrlKey: true, key: 'j' }))).toBe(false);
    expect(estRaccourciPalette({ ctrlKey: true, metaKey: false })).toBe(false);
  });
  it('requête vide : les 10 destinations ; sinon filtre, préfixe /aller accepté', () => {
    expect(proposer('')).toHaveLength(10);
    expect(proposer('/aller')).toHaveLength(10);
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
