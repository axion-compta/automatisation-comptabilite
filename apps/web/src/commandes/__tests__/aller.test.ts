// Fiches L00-T16 et L01-T35 : /aller sur des phrases fictives (fautes, majuscules, pièges) et palette Ctrl+K.
import { describe, expect, it, vi } from 'vitest';
import { aller, destinations, executerCommande, normaliser } from '../aller.js';
import { estRaccourciPalette, installerRaccourci, proposer } from '../raccourci.js';

const PHRASES: ReadonlyArray<readonly [string, string | null]> = [
  ['je veux voir mon activité', 'activite'], ['OUVRE LE TABLEAU DE BORD', 'activite'], ['retour au début', 'activite'], ['affiche le résumé', 'activite'],
  ['mon mois', 'mois'], ['mois', 'mois'], ['le mensuel', 'mois'], ['une période', 'mois'],
  ['ouvre la banque', 'banque'], ['relevé bancaire', 'banque'], ['faire le rapprochement', 'banque'], ['ouvre la BNAQUE', 'banque'],
  ['mes factures', 'factures'], ['facutre', 'factures'], ['voir les ventes', 'factures'], ['les dépenses', 'factures'],
  ['mes déclarations', 'declarations'], ['déclarer', 'declarations'],
  ['la TVA', 'tva'], ['voir la taxe', 'tva'], ['voir la tba', 'tva'], ['TVA collectée', 'tva'], ['déclaration de TVA collectée', 'tva'],
  ['mes documents', 'documents'], ['ouvre une pièce', 'documents'], ['voir les justificatifs', 'documents'], ['docment', 'documents'],
  ['mes années comptables', 'annees'], ['la clôture', 'annees'],
  ['mes comptes comptables', 'comptes'], ['le plan', 'comptes'],
  ['liste des clients', 'tiers'], ['mes fournisseurs', 'tiers'], ['clients et fournisseurs', 'tiers'],
  ["j'ai besoin d'aide", 'aide'], ['assistance', 'aide'],
  ['quelle heure est-il', null], ['compte client', null], ['facture client', null], ['créer un devis', null], ['ma déclaration de TVA', null],
  ['ne pas aller à la banque', null], ['la banque de France monte ses taux', null], ['bonjour tout le monde', null],
];

describe('/aller sur des phrases fictives', () => {
  it('jeu de phrases : 44 phrases dont 8 sans destination', () => {
    expect(PHRASES).toHaveLength(44);
    expect(PHRASES.filter(([, id]) => id === null)).toHaveLength(8);
  });
  it('mois et proposer(mois) mènent à Mon mois', () => {
    expect(aller('mois')?.chemin).toBe('/mois');
    expect(proposer('mois').map((d) => d.id)).toEqual(['mois']);
  });
  it.each(PHRASES)('« %s » donne %s', (phrase, attendu) => {
    expect(aller(phrase)?.id ?? null).toBe(attendu);
  });
  it('destinations-sur-les-chemins-de-la-liste', () => {
    expect(destinations.map((d) => [d.chemin, d.titre])).toEqual([
      ['/activite', 'Mon activité'], ['/mois', 'Mon mois'], ['/banque', 'Ma banque'], ['/factures', 'Mes factures'],
      ['/declarations', 'Mes déclarations'], ['/declarations/tva', 'Ma TVA'], ['/documents', 'Mes documents'],
      ['/reglages/entreprise/annees', 'Mes années comptables'], ['/reglages/entreprise/comptes', 'Mes comptes comptables'],
      ['/reglages/entreprise/tiers', 'Mes clients et fournisseurs'], ['/reglages/aide', 'Aide'],
    ]);
    expect(aller('ma TVA')?.chemin).toBe('/declarations/tva');
    expect(executerCommande('/aller la banque')?.destination?.chemin).toBe('/banque');
  });
  it('aucun-mot-devis', () => {
    expect(destinations.flatMap((d) => d.motsCles)).not.toContain('devis');
    expect(destinations.map((d) => d.titre.toLowerCase())).not.toContain('lettrage');
    expect(aller('devis')).toBeNull();
    expect(proposer('devis')).toEqual([]);
  });
  it('mots-clés au singulier, sans accent', () => {
    for (const mot of destinations.flatMap((d) => d.motsCles)) {
      expect(mot).toBe(mot.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
    }
  });
  it('égalité de score : aucune devinette, mais la palette propose les deux', () => {
    expect(aller('compte client')).toBeNull();
    expect(proposer('compte client').map((d) => d.id)).toEqual(['comptes', 'tiers']);
  });
  it('« s » final retiré', () => {
    expect(normaliser('Ouvre LES Factures !')).toEqual(['facture']);
    expect(aller('les taxes')?.id).toBe('tva');
  });
  it('/aller : reconnue ou ignorée, forme unique', () => {
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
  it('requête vide : les 11 destinations ; sinon filtre, préfixe /aller accepté', () => {
    expect(proposer('')).toHaveLength(11);
    expect(proposer('/aller')).toHaveLength(11);
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
