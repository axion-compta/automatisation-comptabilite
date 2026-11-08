import { describe, expect, it } from 'vitest';
import type { GraviteAlerte } from '../../interface/types.js';
import type { Alerte } from '../moteur.js';
import { decisionResume, ErreurNotification, notificationsAEmettre, type Categorie } from '../notifications.js';

const alerte = (id: string, gravite: GraviteAlerte, p: Partial<Alerte> = {}): Alerte => ({
  id,
  regle: 'R1',
  objetType: 'piece',
  objetId: id,
  cle: `R1|piece|${id}`,
  gravite,
  etat: 'ouverte',
  version: 1,
  ...p,
});
const ctx = (p: Partial<Parameters<typeof notificationsAEmettre>[1]> = {}) => ({
  categoriesChoisies: ['a_valider', 'urgent'] as Categorie[],
  dejaEmises: [],
  categorieDe: (): Categorie => 'a_valider',
  ...p,
});
const ids = (l: { alerteId: string }[]) => l.map((n) => n.alerteId);

describe('notifications rares et utiles', () => {
  it('bloquant-et-urgent-immediats', () => {
    const r = notificationsAEmettre([alerte('a1', 'bloquant'), alerte('a2', 'urgent')], ctx());
    expect(ids(r.immediates)).toEqual(['a1', 'a2']);
    expect(r.pourResume).toEqual([]);
    expect(r.immediates[0]).toMatchObject({ lien: '/alertes/a1', titreCode: 'R1', categorie: 'a_valider' });
  });
  it('a-faire-pour-le-resume', () => {
    const r = notificationsAEmettre([alerte('a1', 'a_faire')], ctx());
    expect(r.immediates).toEqual([]);
    expect(ids(r.pourResume)).toEqual(['a1']);
  });
  it('info-jamais', () => {
    expect(notificationsAEmettre([alerte('a1', 'info')], ctx())).toEqual({ immediates: [], pourResume: [] });
  });
  it('categorie-non-choisie-rien', () => {
    const r = notificationsAEmettre([alerte('a1', 'urgent'), alerte('a2', 'a_faire')], ctx({ categoriesChoisies: ['cabinet'] }));
    expect(r).toEqual({ immediates: [], pourResume: [] });
  });
  it('alerte-inactive-rien', () => {
    const r = notificationsAEmettre([alerte('a1', 'urgent', { etat: 'resolue' }), alerte('a2', 'urgent', { etat: 'ignoree' })], ctx());
    expect(r.immediates).toEqual([]);
  });
  it('une-seule-fois-par-gravite', () => {
    const r = notificationsAEmettre([alerte('a1', 'urgent'), alerte('a2', 'a_faire')], ctx({ dejaEmises: [{ alerteId: 'a1', gravite: 'urgent' }, { alerteId: 'a2', gravite: 'a_faire' }] }));
    expect(r).toEqual({ immediates: [], pourResume: [] });
  });
  it('nouvelle-gravite-nouvelle-notification', () => {
    const r = notificationsAEmettre([alerte('a1', 'bloquant')], ctx({ dejaEmises: [{ alerteId: 'a1', gravite: 'urgent' }] }));
    expect(ids(r.immediates)).toEqual(['a1']);
  });
  it('aucun-montant-ni-tiers', () => {
    const r = notificationsAEmettre([alerte('a1', 'urgent', { objetId: 'Dupont-1234' })], ctx());
    expect(Object.keys(r.immediates[0]!).sort()).toEqual(['alerteId', 'categorie', 'gravite', 'lien', 'titreCode']);
    expect(JSON.stringify(r)).not.toContain('Dupont');
  });
  it('id-invalide-refuse', () => {
    for (const id of ['a/b', '<x>', '', 'a b', 'a?x=1']) {
      expect(() => notificationsAEmettre([alerte(id, 'urgent')], ctx())).toThrow(ErreurNotification);
      try {
        notificationsAEmettre([alerte(id, 'a_faire')], ctx());
      } catch (e) {
        expect((e as ErreurNotification).code).toBe('id_invalide');
      }
    }
  });
  it('entrees-non-modifiees', () => {
    const a = [alerte('a1', 'urgent')];
    const copie = JSON.stringify(a);
    notificationsAEmettre(a, ctx());
    expect(JSON.stringify(a)).toBe(copie);
  });
});

describe('décision du résumé quotidien', () => {
  const base = { personneId: 'p1', dateDuJour: '2026-11-08', actifs: true, nbActions: 3, dejaEnvoye: [] as { personneId: string; dateEnvoi: string }[] };
  it('resume-envoye-si-actions', () => {
    expect(decisionResume(base)).toBe('envoyer');
  });
  it('resume-desactive', () => {
    expect(decisionResume({ ...base, actifs: false })).toBe('desactive');
  });
  it('resume-rien-a-faire-pas-d-envoi', () => {
    expect(decisionResume({ ...base, nbActions: 0 })).toBe('ignore_rien_a_faire');
  });
  it('resume-jamais-deux-fois-le-meme-jour', () => {
    const dejaEnvoye = [{ personneId: 'p1', dateEnvoi: '2026-11-08' }];
    expect(decisionResume({ ...base, dejaEnvoye })).toBe('deja_envoye');
    expect(decisionResume({ ...base, dejaEnvoye: [{ personneId: 'p2', dateEnvoi: '2026-11-08' }] })).toBe('envoyer');
    expect(decisionResume({ ...base, dejaEnvoye: [{ personneId: 'p1', dateEnvoi: '2026-11-07' }] })).toBe('envoyer');
  });
  it('resume-nb-actions-invalide', () => {
    for (const nbActions of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => decisionResume({ ...base, nbActions })).toThrow(ErreurNotification);
    }
  });
});
