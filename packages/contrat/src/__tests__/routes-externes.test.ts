import { describe, expect, it } from 'vitest';
import { registre as registreReel, type Registre } from '../actions/index.js';
import { genererOpenapi } from '../openapi.js';
import { FRAGMENTS_EXTERNES, ROUTES_EXTERNES } from '../routes-externes.js';

type Operation = { operationId?: string; parameters?: unknown[]; requestBody?: unknown };
type Document = { paths?: Record<string, Record<string, Operation>> };
type Carte = Readonly<Record<string, string>>;

function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function routesExternesSansInterrupteur(doc: Document, carte: Carte): string[] {
  const trouvees: string[] = [];
  for (const [chemin, operations] of Object.entries(doc.paths ?? {})) {
    for (const [methode, operation] of Object.entries(operations ?? {})) {
      const operationId = operation?.operationId ?? '';
      const cibles = [normaliser(chemin), normaliser(operationId)];
      const externe = FRAGMENTS_EXTERNES.some((f) => cibles.some((c) => c.includes(f)));
      if (externe && !Object.hasOwn(carte, operationId)) trouvees.push(`${methode} ${chemin}`);
    }
  }
  return trouvees;
}

function interrupteursInconnusOuOuverts(carte: Carte, registre: Registre): string[] {
  const fautifs: string[] = [];
  for (const [operationId, code] of Object.entries(carte)) {
    const declare = Object.hasOwn(registre.interrupteurs, code) ? registre.interrupteurs[code] : undefined;
    if (declare === undefined || declare.actif_par_defaut !== false) fautifs.push(operationId);
  }
  return fautifs;
}

const SOCIETE = /^societe_?id$/i;

function contientSociete(valeur: unknown): boolean {
  if (Array.isArray(valeur)) return valeur.some(contientSociete);
  if (valeur !== null && typeof valeur === 'object') {
    const objet = valeur as Record<string, unknown>;
    if (typeof objet['name'] === 'string' && SOCIETE.test(objet['name'])) return true;
    return Object.entries(objet).some(([cle, v]) => SOCIETE.test(cle) || contientSociete(v));
  }
  return false;
}

function entreesAvecSociete(doc: Document): string[] {
  const trouvees: string[] = [];
  for (const [chemin, operations] of Object.entries(doc.paths ?? {})) {
    for (const [methode, operation] of Object.entries(operations ?? {})) {
      const parametres = (operation?.parameters ?? []).filter(
        (p) => (p as { in?: string } | null)?.in !== 'path',
      );
      if (contientSociete(parametres) || contientSociete(operation?.requestBody)) trouvees.push(`${methode} ${chemin}`);
    }
  }
  return trouvees;
}

const registreFerme: Registre = {
  ...registreReel,
  interrupteurs: { ...registreReel.interrupteurs, courriel_sortant: { actif_par_defaut: false } },
};

describe('routes externes (interrupteur fermé, société jamais en entrée)', () => {
  it('contrat-actuel-vert', () => {
    const doc = genererOpenapi() as Document;
    expect(Object.keys(doc.paths ?? {}).length).toBeGreaterThan(0);
    expect(routesExternesSansInterrupteur(doc, ROUTES_EXTERNES)).toEqual([]);
    expect(interrupteursInconnusOuOuverts(ROUTES_EXTERNES, registreReel)).toEqual([]);
    expect(entreesAvecSociete(doc)).toEqual([]);
    expect(routesExternesSansInterrupteur({}, {})).toEqual([]);
    expect(entreesAvecSociete({ paths: {} })).toEqual([]);
  });

  it('route-externe-forgee-sans-interrupteur-rouge', () => {
    const doc: Document = { paths: { '/emails/envoyer': { post: { operationId: 'poster' } } } };
    expect(routesExternesSansInterrupteur(doc, {})).toEqual(['post /emails/envoyer']);
    expect(routesExternesSansInterrupteur(doc, { poster: 'courriel_sortant' })).toEqual([]);
  });

  it('fragment-dans-operation-id-detecte', () => {
    for (const f of FRAGMENTS_EXTERNES) {
      const doc: Document = { paths: { '/x': { post: { operationId: `faire${f.toUpperCase()}Truc` } } } };
      expect(routesExternesSansInterrupteur(doc, {})).toEqual(['post /x']);
    }
    const accent: Document = { paths: { '/x': { post: { operationId: 'Télétransmettre' } } } };
    expect(routesExternesSansInterrupteur(accent, {})).toEqual(['post /x']);
    const neutre: Document = { paths: { '/x': { get: { operationId: 'lire' } } } };
    expect(routesExternesSansInterrupteur(neutre, {})).toEqual([]);
    expect(FRAGMENTS_EXTERNES).toHaveLength(7);
  });

  it('interrupteur-absent-du-registre-rouge', () => {
    expect(interrupteursInconnusOuOuverts({ poster: 'inexistant' }, registreFerme)).toEqual(['poster']);
    expect(interrupteursInconnusOuOuverts({ poster: 'toString' }, registreFerme)).toEqual(['poster']);
    expect(interrupteursInconnusOuOuverts({ poster: 'courriel_sortant' }, registreFerme)).toEqual([]);
  });

  it('interrupteur-ouvert-par-defaut-rouge', () => {
    const ouvert: Registre = {
      ...registreFerme,
      interrupteurs: { ...registreFerme.interrupteurs, courriel_sortant: { actif_par_defaut: true } },
    };
    expect(interrupteursInconnusOuOuverts({ poster: 'courriel_sortant' }, ouvert)).toEqual(['poster']);
  });

  it('societe-dans-un-corps-rouge', () => {
    const corps = (schema: unknown): Document => ({
      paths: { '/x': { post: { requestBody: { content: { 'application/json': { schema } } } } } },
    });
    const profond = corps({ type: 'object', properties: { lignes: { type: 'array', items: { properties: { SocieteId: {} } } } } });
    expect(entreesAvecSociete(profond)).toEqual(['post /x']);
    expect(entreesAvecSociete(corps({ properties: { societe_id: {} } }))).toEqual(['post /x']);
    expect(entreesAvecSociete(corps({ properties: { societe: {}, libelle: {} } }))).toEqual([]);
    const requete: Document = { paths: { '/y': { get: { parameters: [{ name: 'societeId', in: 'query' }] } } } };
    expect(entreesAvecSociete(requete)).toEqual(['get /y']);
  });

  it('societe-dans-le-chemin-permise', () => {
    const doc: Document = {
      paths: { '/societes/{societeId}/x': { get: { parameters: [{ name: 'societeId', in: 'path', required: true }] } } },
    };
    expect(entreesAvecSociete(doc)).toEqual([]);
  });
});
