import { describe, expect, it } from 'vitest';
import { NotificationSchema } from '../domaines/notifications.js';
import { creerServiceNotifications, ErreurNotification } from '../domaines/notifications-service.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

const T = 1_700_000_000_000;

describe('contrat notifications : service en mémoire', () => {
  it('liste-plus-recentes-d-abord', () => {
    const l = creerServiceNotifications().lister();
    expect(l.body.map((n) => n.id)).toEqual(['no-1', 'no-3', 'no-2']);
    expect(l.total).toBe(3);
    expect(creerServiceNotifications().lister({ limite: 1, decalage: 1 }).body.map((n) => n.id)).toEqual(['no-3']);
  });

  it('filtre-non-lues', () => {
    const l = creerServiceNotifications().lister({ nonLues: true });
    expect(l.body.map((n) => n.id)).toEqual(['no-1', 'no-3']);
    expect(l.body.every((n) => n.lueLe === undefined)).toBe(true);
  });

  it('marquer-lue', () => {
    const s = creerServiceNotifications({ maintenant: () => T });
    expect(s.marquerLue('no-1', 'cle-0001').body.lueLe).toBe(new Date(T).toISOString());
    expect(s.lister({ nonLues: true }).body.map((n) => n.id)).toEqual(['no-3']);
  });

  it('marquer-deux-fois-meme-lue-le', () => {
    let t = T;
    const s = creerServiceNotifications({ maintenant: () => t });
    const un = s.marquerLue('no-1', 'cle-0001').body.lueLe;
    t += 5000;
    expect(s.marquerLue('no-1', 'cle-0002').body.lueLe).toBe(un);
    expect(s.marquerLue('no-2', 'cle-0003').body.lueLe).toBe('2026-10-10');
  });

  it('tout-lire-compte-les-non-lues', () => {
    const s = creerServiceNotifications({ maintenant: () => T });
    expect(s.toutLire('cle-0001')).toEqual({ body: { marquees: 2 } });
    expect(s.toutLire('cle-0002')).toEqual({ body: { marquees: 0 } });
    expect(s.toutLire('cle-0001')).toEqual({ body: { marquees: 2 } });
    expect(s.lister({ nonLues: true }).total).toBe(0);
  });

  it('autre-personne-404-meme-corps', () => {
    const s = creerServiceNotifications();
    expect(s.lister().body.map((n) => n.id)).not.toContain('no-autre');
    for (const id of ['no-autre', 'no-inconnu']) {
      expect(() => s.marquerLue(id, 'cle-0001')).toThrow(ErreurNotification);
    }
    s.toutLire('cle-0002');
    expect(() => s.marquerLue('no-autre', 'cle-0003')).toThrow('notification_inconnue');
  });

  it('aucun-montant-ni-tiers-dans-le-schema', () => {
    expect(Object.keys(NotificationSchema.shape).sort()).toEqual(['categorie', 'creeLe', 'gravite', 'id', 'lien', 'lueLe', 'titreCode']);
    const ok = { id: 'n', categorie: 'alerte', gravite: 'info', titreCode: 'ALR-01', lien: '/alertes', creeLe: '2026-10-15' };
    expect(NotificationSchema.safeParse(ok).success).toBe(true);
    for (const extra of [{ montantCentimes: 100 }, { nomTiers: 'Société Fictive' }]) {
      expect(NotificationSchema.safeParse({ ...ok, ...extra }).success).toBe(false);
    }
    expect(JSON.stringify(creerServiceNotifications().lister())).not.toMatch(/montant|tiers|€/);
  });

  it('sans-idempotency-key-400', () => {
    const spec = genererOpenapi() as { paths: Record<string, Record<string, { parameters?: Array<{ name: string; in: string; required?: boolean }> }>> };
    for (const chemin of ['/notifications/{id}/lue', '/notifications/tout-lire']) {
      const p = spec.paths[chemin]?.['post']?.parameters ?? [];
      expect(p.some((x) => x.in === 'header' && x.name.toLowerCase() === 'idempotency-key' && x.required)).toBe(true);
    }
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
