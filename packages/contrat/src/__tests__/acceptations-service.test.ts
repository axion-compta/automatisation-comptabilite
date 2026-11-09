import { describe, expect, it } from 'vitest';
import { creerServiceAcceptations } from '../domaines/acceptations-service.js';

const HORLOGE = () => '2026-06-15T10:00:00Z';
const neuf = (scenario: string | null = null) => creerServiceAcceptations({ horloge: HORLOGE, scenario });
const CLE = 'cle-fictive-0001';
describe('service des acceptations', () => {
  it('rien-a-accepter-par-defaut', () => {
    expect(neuf().aAccepter()).toEqual([]);
    expect(neuf('scenario-inconnu').aAccepter()).toEqual([]);
  });

  it('nouvelle-version-a-accepter', () => {
    const liste = neuf('cgv=a_accepter').aAccepter();
    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({ type: 'cgv', version: 2 });
    expect(liste[0]!.empreinte).toMatch(/^[0-9a-f]{64}$/);
    expect(liste[0]!.approuve_le).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(liste[0]!.sources.length).toBeGreaterThan(0);
  });

  it('accepter-vide-la-liste', () => {
    const s = neuf('cgv=a_accepter');
    const r = s.accepter(CLE, { type: 'cgv', version: 2 });
    expect(r).toEqual({ ok: true, valeur: { type: 'cgv', version: 2, accepte_le: '2026-06-15T10:00:00Z' } });
    expect(s.aAccepter()).toEqual([]);
    expect(s.journal().map((e) => e.type)).toEqual(['acceptation.enregistree']);
  });

  it('version-perimee-409', () => {
    const s = neuf('cgv=a_accepter');
    expect(s.accepter(CLE, { type: 'cgv', version: 1 })).toEqual({ ok: false, erreur: 'VERSION_PERIMEE' });
    expect(s.aAccepter()).toHaveLength(1);
    expect(s.journal()).toEqual([]);
  });

  it('type-inconnu-404', () => {
    expect(neuf().accepter(CLE, { type: 'type-fictif-inconnu', version: 1 })).toEqual({ ok: false, erreur: 'DOCUMENT_ABSENT' });
  });

  it('meme-cle-une-seule-acceptation', () => {
    const s = neuf('cgv=a_accepter');
    const a = s.accepter(CLE, { type: 'cgv', version: 2 });
    const b = s.accepter(CLE, { type: 'cgv', version: 2 });
    expect(b).toEqual(a);
    expect(s.journal()).toHaveLength(1);
  });

  it('etat-propre-a-chaque-instance', () => {
    const a = neuf('cgv=a_accepter');
    a.accepter(CLE, { type: 'cgv', version: 2 });
    expect(neuf('cgv=a_accepter').aAccepter()).toHaveLength(1);
  });
});
