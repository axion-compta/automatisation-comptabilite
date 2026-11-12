import { describe, expect, it } from 'vitest';
import { autoriserCloture, type AccordExpert, type DemandeCloture } from '../autorisation-cloture.js';

// Personnes, sociétés et empreintes INVENTÉES pour les tests.
const EMPREINTE = 'a'.repeat(64);
const HORO = '2026-11-12T10:00:00Z';

function demande(over: Partial<DemandeCloture> = {}): DemandeCloture {
  return {
    societeId: 'soc-1',
    exerciceId: 'ex-2026',
    auteur: { personneId: 'p-admin', role: 'administrateur', reauthRecente: true },
    canal: 'clic',
    expertActif: true,
    maintenant: HORO,
    ...over,
  };
}
const expert = { personneId: 'p-expert', role: 'comptable', reauthRecente: true } as const;
const approbation = (over: Record<string, unknown> = {}) =>
  ({ type: 'approbation', par: 'p-expert', role: 'comptable', reauthRecente: true, horodatage: HORO,
    societeId: 'soc-1', exerciceId: 'ex-2026', ...over }) as AccordExpert;
const CONF = {
  confirmations: [
    { id: 'confirmation_1', horodatage: HORO },
    { id: 'confirmation_2', horodatage: HORO },
  ],
  responsabiliteAcceptee: true,
} as const;

describe('autorisation de clôture', () => {
  it('expert-reauthentifie-cloture', () => {
    const ok = autoriserCloture(demande({ auteur: expert }));
    expect(ok.permis).toBe(true);
    expect(autoriserCloture(demande({ auteur: { ...expert, reauthRecente: false } }))).toMatchObject({
      permis: false, raison: 'reauthentification_requise',
    });
  });

  it('administrateur-sans-accord-refuse', () => {
    expect(autoriserCloture(demande())).toMatchObject({ permis: false, raison: 'accord_expert_requis' });
    expect(autoriserCloture(demande({ accord: { type: 'document', empreinte: 'abc', rattacheA: 'ex-2026' } })))
      .toMatchObject({ permis: false, raison: 'accord_expert_requis' });
    expect(autoriserCloture(demande({ accord: { type: 'document', empreinte: EMPREINTE, rattacheA: 'ex-2025' } })))
      .toMatchObject({ permis: false, raison: 'accord_expert_requis' });
  });

  it('accord-par-approbation-apres-reauth', () => {
    expect(autoriserCloture(demande({ accord: approbation() })).permis).toBe(true);
    for (const over of [{ reauthRecente: false }, { role: 'administrateur' }, { par: '' }, { par: 'p-admin' }, { horodatage: '' }]) {
      expect(autoriserCloture(demande({ accord: approbation(over) }))).toMatchObject({
        permis: false, raison: 'accord_expert_requis',
      });
    }
  });

  it('accord-par-document-rattache', () => {
    const accord = { type: 'document', empreinte: EMPREINTE, rattacheA: 'ex-2026' } as const;
    expect(autoriserCloture(demande({ accord })).permis).toBe(true);
  });

  it('sans-expert-confirmation-renforcee', () => {
    const d = demande({ expertActif: false });
    expect(autoriserCloture(d)).toMatchObject({ permis: false, raison: 'confirmation_renforcee_requise' });
    expect(autoriserCloture({ ...d, confirmations: CONF.confirmations.slice(0, 1), responsabiliteAcceptee: true }))
      .toMatchObject({ permis: false, raison: 'confirmation_renforcee_requise' });
    const deuxIdentiques = [CONF.confirmations[0]!, CONF.confirmations[0]!];
    expect(autoriserCloture({ ...d, confirmations: deuxIdentiques, responsabiliteAcceptee: true }))
      .toMatchObject({ permis: false, raison: 'confirmation_renforcee_requise' });
    expect(autoriserCloture({ ...d, confirmations: CONF.confirmations, responsabiliteAcceptee: false }))
      .toMatchObject({ permis: false, raison: 'confirmation_renforcee_requise' });
    expect(autoriserCloture({ ...d, ...CONF }).permis).toBe(true);
    expect(autoriserCloture({ ...d, ...CONF, auteur: { personneId: 'p-u', role: 'utilisateur', reauthRecente: true } }))
      .toMatchObject({ permis: false, raison: 'role_insuffisant' });
  });

  it('chat-seul-refuse', () => {
    for (const canal of ['chat', 'voix'] as const) {
      expect(autoriserCloture(demande({ canal, auteur: expert }))).toMatchObject({ permis: false, raison: 'chat_seul' });
      expect(autoriserCloture(demande({ canal, auteur: expert, confirmeeAEcran: true })).permis).toBe(true);
    }
    for (const canal of ['inconnu', 'api', 'systeme', 'import'])
      expect(autoriserCloture(demande({ canal: canal as never, auteur: expert }))).toMatchObject({ raison: 'chat_seul' });
  });

  it('trace-auteur-et-accord', () => {
    const a = approbation();
    const r = autoriserCloture(demande({ accord: a }));
    expect(r).toMatchObject({ permis: true, trace: { auteur: 'p-admin', accord: a, horodatage: HORO } });
    const sans = autoriserCloture(demande({ expertActif: false, ...CONF }));
    expect(sans).toMatchObject({ permis: true, trace: { auteur: 'p-admin', confirmations: CONF.confirmations } });
    const doc = autoriserCloture(demande({ accord: { type: 'document', empreinte: EMPREINTE, rattacheA: 'ex-2026' } }));
    expect(doc).toMatchObject({ permis: true, trace: { horodatage: HORO } });
    const exp = autoriserCloture(demande({ auteur: expert }));
    expect(exp).toMatchObject({ permis: true, trace: { auteur: 'p-expert', horodatage: HORO } });
  });

  it('accord-d-une-autre-societe-refuse', () => {
    for (const over of [{ societeId: 'soc-2' }, { exerciceId: 'ex-2025' }]) {
      expect(autoriserCloture(demande({ accord: approbation(over) }))).toMatchObject({
        permis: false, raison: 'accord_expert_requis',
      });
    }
  });

  it('autres-roles-refuses', () => {
    for (const role of ['utilisateur', 'lecture', 'invite_externe', 'personnel_axion', 'xyz'] as const) {
      expect(autoriserCloture(demande({ auteur: { personneId: 'p', role: role as never, reauthRecente: true } })))
        .toMatchObject({ permis: false, raison: 'role_insuffisant' });
    }
  });
});
