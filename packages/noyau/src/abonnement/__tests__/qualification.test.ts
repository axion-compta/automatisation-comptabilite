import { describe, expect, it } from 'vitest';
import type { DocumentContractuel } from '../documents.js';
import { archiverReponse, qualifier, QUESTIONS, type Reponses } from '../qualification.js';
import { ErreurAbonnement } from '../types.js';

const CLAUSE: DocumentContractuel = { type: 'clause_retractation', version: 2, approuveLe: '2026-06-01', empreinte: 'b'.repeat(64), sources: ['source fictive'] };
const rep = (forme: string, activite = 'oui'): Reponses => ({ activite_professionnelle: activite, forme }) as Reponses;
const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurAbonnement ? e.code : 'autre'; }
  return undefined;
};
const entree = (o: Record<string, unknown> = {}) => ({
  organisation: 'Société Exemple', personne: 'Camille Test', reponses: rep('EI'), documents: [CLAUSE], le: '2026-11-12T10:00:00Z', ...o,
}) as Parameters<typeof archiverReponse>[0];

describe('qualification du client', () => {
  it('ei-clause-jointe', () => {
    expect(qualifier(rep('EI'))).toEqual({ professionnel: true, documentsAJoindre: ['clause_retractation'] });
  });
  it('sci-clause-jointe', () => {
    expect(qualifier(rep('SCI')).documentsAJoindre).toEqual(['clause_retractation']);
  });
  it('non-professionnel-clause-jointe', () => {
    for (const forme of ['SAS', 'SARL', 'autre']) expect(qualifier(rep(forme, 'non'))).toEqual({ professionnel: false, documentsAJoindre: ['clause_retractation'] });
  });
  it('sas-professionnel-sans-clause', () => {
    for (const forme of ['SAS', 'SARL', 'autre']) expect(qualifier(rep(forme))).toEqual({ professionnel: true, documentsAJoindre: [] });
    expect(QUESTIONS.map((q) => q.id)).toEqual(['activite_professionnelle', 'forme']);
  });
  it('reponse-archivee-datee-avec-empreinte', () => {
    const a = archiverReponse(entree());
    expect(a).toMatchObject({ organisation: 'Société Exemple', personne: 'Camille Test', le: '2026-11-12T10:00:00Z', reponses: rep('EI') });
    expect(a.documents).toEqual([{ type: 'clause_retractation', version: 2, empreinte: 'b'.repeat(64) }]);
    expect(a.empreinte).toMatch(/^[0-9a-f]{64}$/);
    const { empreinte } = a;
    // même contenu, clés dans un autre ordre : même empreinte
    const b = archiverReponse(entree({ reponses: { forme: 'EI', activite_professionnelle: 'oui' } }));
    expect(b.empreinte).toBe(empreinte);
    // un champ différent change l'empreinte
    expect(archiverReponse(entree({ personne: 'Autre Test' })).empreinte).not.toBe(empreinte);
    expect(archiverReponse(entree({ le: '2026-11-12T10:00:01Z' })).empreinte).not.toBe(empreinte);
    expect(Object.isFrozen(a)).toBe(true); // ajout seul : pas de modification après coup
    expect(archiverReponse(entree({ reponses: rep('SAS') })).documents).toEqual([]);
  });
  it('clause-non-approuvee-refusee', () => {
    expect(code(() => archiverReponse(entree({ documents: [] })))).toBe('document_absent');
    expect(code(() => archiverReponse(entree({ le: '2026-05-31T23:59:59Z' })))).toBe('document_absent'); // veille de l'approbation
    expect(code(() => archiverReponse(entree({ le: '2026-06-01T00:00:00Z' })))).toBeUndefined(); // jour d'approbation
    expect(code(() => archiverReponse(entree({ reponses: rep('SAS'), documents: [] })))).toBeUndefined(); // rien à joindre
  });
  it('reponse-hors-liste-refusee', () => {
    const mauvaises: unknown[] = [
      rep('SNC'), rep('EI', 'peut-etre'), { forme: 'EI' }, { activite_professionnelle: 'oui' }, {}, null, 'oui', [],
      { ...rep('EI'), extra: 'x' }, rep('ei'), rep(''),
    ];
    for (const r of mauvaises) {
      expect(code(() => qualifier(r as Reponses)), JSON.stringify(r)).toBe('parametre_invalide');
      expect(code(() => archiverReponse(entree({ reponses: r })))).toBe('parametre_invalide');
    }
    for (const o of [{ organisation: ' ' }, { personne: '' }, { le: 'hier' }, { le: '2026-02-30T10:00:00Z' }]) {
      expect(code(() => archiverReponse(entree(o))), JSON.stringify(o)).not.toBeUndefined();
    }
  });
});
