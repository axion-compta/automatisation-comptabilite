import { describe, expect, it } from 'vitest';
import { ReponseSiren, ReponseVerificationTva } from '../domaines/identite.js';
import { SirenInvalide, creerServiceIdentite } from '../domaines/identite-service.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

describe('identité fictive en mémoire', () => {
  it('siren-trouve', () => {
    const r = creerServiceIdentite().lireSiren('123456782');
    expect(ReponseSiren.parse({ body: r }).body).toMatchObject({ etat: 'trouve', denomination: 'Lemoine Rénovation', forme: 'SARL' });
    expect(r.dateReponse).toBeDefined();
  });

  it('siren-cle-fausse-422-p01', () => {
    for (const s of ['123456789', '000000001']) expect(() => creerServiceIdentite().lireSiren(s)).toThrow(SirenInvalide);
  });

  it('siren-panne-saisie-manuelle-p03', () => {
    const r = creerServiceIdentite({ sirenePanne: true }).lireSiren('123456782');
    expect(r).toEqual({ etat: 'saisie_manuelle' });
    expect(() => creerServiceIdentite({ sirenePanne: true }).lireSiren('123456789')).toThrow(SirenInvalide);
  });

  it('tva-cle-juste-p02', () => {
    const r = creerServiceIdentite().verifierTva('FR11123456782', true);
    expect(ReponseVerificationTva.parse({ body: r }).body).toEqual({ cle: 'juste', vies: 'verifie' });
  });

  it('tva-cle-fausse-p02', () => {
    const appels: string[] = [];
    const r = creerServiceIdentite({ surAppelVies: (n) => appels.push(n) }).verifierTva('FR12123456782', false);
    expect(r).toEqual({ cle: 'fausse', vies: 'non_verifie' });
    expect(appels).toEqual([]);
  });

  it('vies-indisponible-non-verifie', () => {
    const s = creerServiceIdentite();
    expect(s.verifierTva('FR14987654324', true)).toEqual({ cle: 'juste', vies: 'non_verifie' });
    expect(s.verifierTva('FR00000000000', true).vies).toBe('invalide');
    expect(ReponseVerificationTva.safeParse({ body: { cle: 'juste', vies: 'indisponible' } }).success).toBe(false);
  });

  it('openapi-contient-identite', () => {
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId?: string }>> };
    expect(doc.paths['/siren/{siren}']?.get?.operationId).toBe('lireSiren');
    expect(doc.paths['/tva-intracom/{numero}/verification']?.get?.operationId).toBe('verifierTva');
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
