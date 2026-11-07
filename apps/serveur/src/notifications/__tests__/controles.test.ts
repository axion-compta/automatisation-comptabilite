import { describe, expect, it } from 'vitest';
import type { Gravite } from '../../../../../packages/noyau/src/controles/moteur.js';
import type { Ouvert } from '../../../../../packages/noyau/src/controles/notifications.js';
import { envoyerNotificationsControles, type HoteC4, type MessageCloche, type MessageEmail } from '../controles.js';

const o = (regleId: string, objetId: string, gravite: Gravite): Ouvert => ({ regleId, objetId, gravite, ouvertLe: '2026-10-05T08:00:00Z' });
const CT41 = [o('CC-T02', 'F1', 'B'), o('CC-K05', 'F2', 'M'), o('CC-K06', 'F3', 'M'), o('CC-K07', 'F4', 'm'), o('CC-K08', 'F5', 'm'), o('CC-K09', 'F6', 'm')];

// Faux hôte C4 : interrupteur fermé par défaut, enregistre ce qui part.
function fauxHote(opts: { actif?: boolean; clocheEnPanne?: boolean } = {}) {
  const cloches: MessageCloche[] = [];
  const emails: MessageEmail[] = [];
  const hote: HoteC4 = {
    actif: opts.actif ?? false,
    cloche: (m) => { if (opts.clocheEnPanne === true) throw new Error('cloche indisponible'); cloches.push(m); },
    email: (m) => { emails.push(m); },
  };
  return { hote, cloches, emails };
}

describe('envoi des notifications des contrôles', () => {
  it('CT-41 envoi', async () => {
    const f = fauxHote({ actif: true });
    const r = await envoyerNotificationsControles({ hote: f.hote, ouverts: CT41, dejaNotifies: [], destinataire: { id: 'pers-1' } });
    expect(f.cloches).toEqual([{ code: 'controle_bloquant', personneId: 'pers-1', regleId: 'CC-T02', objetId: 'F1' }]);
    expect(f.emails).toEqual([]);
    expect(r.envoyees).toEqual([{ regleId: 'CC-T02', objetId: 'F1' }]);
    expect(r.dejaNotifies).toEqual([{ regleId: 'CC-T02', objetId: 'F1' }]);
    expect(r.resume).toEqual({ nombre: 2, regles: ['CC-K05', 'CC-K06'] });
  });

  it('interrupteur-ferme-rien-n-part', async () => {
    const f = fauxHote();
    expect(f.hote.actif).toBe(false);
    const deja = [{ regleId: 'CC-X', objetId: 'F0' }];
    const r = await envoyerNotificationsControles({ hote: f.hote, ouverts: CT41, dejaNotifies: deja, destinataire: { id: 'pers-1', email: 'lea@exemple.fr' } });
    expect(f.cloches).toEqual([]);
    expect(f.emails).toEqual([]);
    expect(r.envoyees).toEqual([]);
    expect(r.dejaNotifies).toEqual([]);
  });

  it('email-seulement-si-choisi-et-sans-donnee-de-client', async () => {
    const f = fauxHote({ actif: true });
    await envoyerNotificationsControles({ hote: f.hote, ouverts: CT41, dejaNotifies: [], destinataire: { id: 'pers-1', email: 'lea@exemple.fr' } });
    expect(f.emails).toEqual([{ code: 'controle_bloquant', a: 'lea@exemple.fr', regleId: 'CC-T02', objetId: 'F1' }]);
    expect(Object.keys(f.emails[0] ?? {}).sort()).toEqual(['a', 'code', 'objetId', 'regleId']);
  });

  it('pas-deux-fois-et-reouverture', async () => {
    const f = fauxHote({ actif: true });
    const premier = await envoyerNotificationsControles({ hote: f.hote, ouverts: CT41, dejaNotifies: [], destinataire: { id: 'pers-1' } });
    const second = await envoyerNotificationsControles({ hote: f.hote, ouverts: CT41, dejaNotifies: premier.dejaNotifies, destinataire: { id: 'pers-1' } });
    expect(f.cloches).toHaveLength(1);
    expect(second.envoyees).toEqual([]);
    const ferme = await envoyerNotificationsControles({ hote: f.hote, ouverts: [], dejaNotifies: second.dejaNotifies, destinataire: { id: 'pers-1' } });
    expect(ferme.dejaNotifies).toEqual([]);
    await envoyerNotificationsControles({ hote: f.hote, ouverts: CT41, dejaNotifies: ferme.dejaNotifies, destinataire: { id: 'pers-1' } });
    expect(f.cloches).toHaveLength(2);
  });

  it('cloche-en-panne-non-marquee-notifiee', async () => {
    const f = fauxHote({ actif: true, clocheEnPanne: true });
    const r = await envoyerNotificationsControles({ hote: f.hote, ouverts: CT41, dejaNotifies: [], destinataire: { id: 'pers-1', email: 'lea@exemple.fr' } });
    expect(r.envoyees).toEqual([]);
    expect(r.dejaNotifies).toEqual([]);
    expect(f.emails).toEqual([]);
  });

  it('liste-vide', async () => {
    const f = fauxHote({ actif: true });
    expect(await envoyerNotificationsControles({ hote: f.hote, ouverts: [], dejaNotifies: [], destinataire: { id: 'pers-1' } })).toEqual({ envoyees: [], dejaNotifies: [], resume: null });
  });
});
