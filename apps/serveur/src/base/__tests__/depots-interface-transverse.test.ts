import { describe, expect, it } from 'vitest';
import { ErreurDepot, TABLES_PAR_PERSONNE, creerDepotsInterfaceMemoire, type Alerte } from '../depots-interface-transverse.js';

const A = 'societe-a';
const B = 'societe-b';
const depots = () => { let n = 0; return creerDepotsInterfaceMemoire({ nouvelId: () => `id-${++n}` }); };
const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return (e as { code?: string }).code; }
  return undefined;
};
const alerte = (o: Partial<Alerte> = {}): Alerte => ({
  id: 'al-1', regleId: 'regle-1', cleDedoublonnage: 'cle-1', etat: 'ouverte', ouverteLe: '2026-03-01T10:00:00Z', reporteeJusquau: null, ...o,
});
const evenement = { id: 'ev-1', alerteId: 'al-1', le: '2026-03-01T10:00:00Z', evenement: 'ouverte' as const, par: 'personne-1' };

describe('depots interface transverse', () => {
  it('unicite-alerte-active', () => {
    const d = depots();
    d.alertes.ajouter(A, alerte());
    expect(code(() => d.alertes.ajouter(A, alerte({ id: 'al-2' })))).toBe('doublon');
    expect(code(() => d.alertes.ajouter(A, alerte({ id: 'al-3', etat: 'reportee' })))).toBe('doublon');
    expect(d.alertes.lister(A)).toHaveLength(1);
    expect(code(() => d.alertes.ajouter(A, alerte({ id: 'al-4', cleDedoublonnage: 'cle-2' })))).toBeUndefined();
    expect(code(() => d.alertes.ajouter(B, alerte({ id: 'al-5' })))).toBeUndefined();
  });

  it('alerte-fermee-reouvrable', () => {
    const d = depots();
    d.alertes.ajouter(A, alerte());
    d.alertes.changerEtat(A, 'al-1', 'fermee');
    d.alertes.ajouter(A, alerte({ id: 'al-2' }));
    expect(code(() => d.alertes.changerEtat(A, 'al-1', 'ouverte'))).toBe('doublon');
    d.alertes.changerEtat(A, 'al-2', 'fermee');
    d.alertes.changerEtat(A, 'al-1', 'reportee');
    expect(d.alertes.lire(A, 'al-1')?.etat).toBe('reportee');
    expect(code(() => d.alertes.changerEtat(A, 'absente', 'fermee'))).toBe('inconnue');
  });

  it('journal-ajout-seul-update', () => {
    const d = depots();
    d.journal.ajouter(A, evenement);
    expect(code(() => d.journal.modifier(A, 'ev-1', { par: 'autre' }))).toBe('ajout_seul');
    expect(code(() => d.journal.modifier(A, 'absent', {}))).toBe('ajout_seul');
    expect(d.journal.lister(A)).toEqual([evenement]);
  });

  it('journal-ajout-seul-delete', () => {
    const d = depots();
    d.journal.ajouter(A, evenement);
    expect(code(() => d.journal.supprimer(A, 'ev-1'))).toBe('ajout_seul');
    expect(code(() => d.journal.supprimer(A, 'absent'))).toBe('ajout_seul');
    expect(d.journal.lister(A)).toHaveLength(1);
    expect(code(() => d.journal.ajouter(A, evenement))).toBe('doublon');
  });

  it('isolation-societe', () => {
    const d = depots();
    d.alertes.ajouter(A, alerte());
    d.journal.ajouter(A, evenement);
    d.instantanes.ajouter(A, { id: 'i-1', le: '2026-03-01T10:00:00Z', indicateur: 'tresorerie', montantCentimes: 100 });
    d.compteurs.validerEcriture(A, { id: 'e-1', montantCentimes: 100 });
    d.compteurs.incrementerMenu(A, 'achats');
    d.echeances.ajouter(A, { id: 'ec-1', libelle: 'Échéance fictive', le: '2026-04-01', montantCentimes: null });
    d.notifications.ajouter(A, { id: 'n-1', destinataireId: 'personne-1', texte: 'Texte fictif', le: '2026-03-01T10:00:00Z', lue: false });
    d.usage.ajouter(A, { id: 'u-1', evenement: 'ouverture', le: '2026-03-01T10:00:00Z' });
    d.exports.ajouter(A, { id: 'x-1', nom: 'export-essai.csv', empreinte: 'e'.repeat(64), le: '2026-03-01T10:00:00Z' });
    for (const l of [d.alertes, d.journal, d.instantanes, d.echeances, d.notifications, d.usage, d.exports]) {
      expect(l.lister(A)).toHaveLength(1);
      expect(l.lister(B)).toEqual([]);
    }
    expect(d.alertes.lire(B, 'al-1')).toBeUndefined();
    expect(d.compteurs.nombreEcritures(B)).toBe(0);
    expect(d.compteurs.nombreMenu(B, 'achats')).toBe(0);
    expect(code(() => d.notifications.marquerLue(B, 'n-1'))).toBe('inconnue');
    expect(d.notifications.lister(A)[0]?.lue).toBe(false);
    expect(code(() => d.compteurs.validerEcriture(B, { id: 'e-1', montantCentimes: 1 }))).toBeUndefined();
  });

  it('compteur-atomique', () => {
    const d = depots();
    d.compteurs.validerEcriture(A, { id: 'e-1', montantCentimes: 500 });
    expect(d.compteurs.nombreEcritures(A)).toBe(1);
    expect(code(() => d.compteurs.validerEcriture(A, { id: 'e-1', montantCentimes: 500 }))).toBe('doublon');
    expect(code(() => d.compteurs.validerEcriture(A, { id: 'e-2', montantCentimes: Number.NaN }))).toBe('montant_invalide');
    expect(d.compteurs.nombreEcritures(A)).toBe(1);
    d.compteurs.validerEcriture(A, { id: 'e-2', montantCentimes: 700 });
    expect(d.compteurs.nombreEcritures(A)).toBe(2);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.5, 0.1])('montant-invalide %s', (m) => {
    const d = depots();
    expect(code(() => d.instantanes.ajouter(A, { id: 'i-1', le: '2026-03-01T10:00:00Z', indicateur: 'x', montantCentimes: m }))).toBe('montant_invalide');
    expect(code(() => d.echeances.ajouter(A, { id: 'ec-1', libelle: 'x', le: '2026-04-01', montantCentimes: m }))).toBe('montant_invalide');
    expect(code(() => d.compteurs.validerEcriture(A, { id: 'e-1', montantCentimes: m }))).toBe('montant_invalide');
    expect(d.instantanes.lister(A)).toEqual([]);
    expect(d.echeances.lister(A)).toEqual([]);
    expect(d.compteurs.nombreEcritures(A)).toBe(0);
    expect(code(() => d.echeances.ajouter(A, { id: 'ec-2', libelle: 'x', le: '2026-04-01', montantCentimes: -250 }))).toBeUndefined();
    expect(new ErreurDepot('montant_invalide').name).toBe('ErreurDepot');
  });

  it('copie-non-modifiable', () => {
    const d = depots();
    const source = alerte();
    d.alertes.ajouter(A, source);
    source.etat = 'fermee';
    const lue = d.alertes.lire(A, 'al-1') as Alerte;
    expect(lue.etat).toBe('ouverte');
    expect(() => { lue.etat = 'fermee'; }).toThrow();
    expect(() => { (d.alertes.lister(A) as Alerte[]).push(alerte()); }).toThrow();
    expect(d.alertes.lire(A, 'al-1')?.etat).toBe('ouverte');
    d.personnes.definirPreference('personne-1', 'theme', 'clair');
    expect(() => { (d.personnes.preferences('personne-1') as Record<string, string>)['theme'] = 'sombre'; }).toThrow();
    expect(d.personnes.preferences('personne-1')).toEqual({ theme: 'clair' });
  });

  it('exceptions-par-personne', () => {
    expect([...TABLES_PAR_PERSONNE]).toEqual(['preference_personne', 'resume_email_envoi']);
    const d = depots();
    d.personnes.definirPreference('personne-1', 'theme', 'clair');
    d.personnes.noterResume('personne-1', '2026-03-01');
    d.personnes.noterResume('personne-1', '2026-03-01');
    expect(d.personnes.preferences('personne-1')).toEqual({ theme: 'clair' });
    expect(d.personnes.resumes('personne-1')).toEqual(['2026-03-01']);
    expect(d.personnes.preferences('personne-2')).toEqual({});
    expect(d.personnes.resumes('personne-2')).toEqual([]);
    d.termes.definir('tva', 'Libellé fictif');
    expect(d.termes.lire('tva')).toBe('Libellé fictif');
    expect(d.termes.lire('absent')).toBeUndefined();
  });
});
