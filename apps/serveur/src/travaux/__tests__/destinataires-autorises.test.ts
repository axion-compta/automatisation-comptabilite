import { describe, expect, it } from 'vitest';
import { creerTravailResume, type Courriel, type PersonneResume, type PortJetons, type PortResume } from '../resume-email.js';
import { envelopperPortEnvoi, ErreurDestinataire, verifierEnvoiAutomatique, type PersonneDuCompte } from '../destinataires-autorises.js';

const PERSONNES: PersonneDuCompte[] = [
  { adresse: 'alice@exemple.fr', actif: true },
  { adresse: 'Bob.Invite@Exemple.fr', actif: true },
  { adresse: 'ancien@exemple.fr', actif: false },
];

describe('destinataires autorisés', () => {
  it('envoi-automatique-vers-tiers-refuse', async () => {
    const recus: Courriel[] = [];
    const port = envelopperPortEnvoi({ envoyer: async (c) => void recus.push(c) }, async () => PERSONNES, () => undefined);
    for (const tiers of ['client@exemple.fr', 'ancien@exemple.fr', '', 'xalice@exemple.fr']) {
      await expect(port.envoyer({ destinataire: tiers, sujet: 's', texte: 't' })).rejects.toBeInstanceOf(ErreurDestinataire);
    }
    expect(recus).toHaveLength(0);
    expect(verifierEnvoiAutomatique({ destinataire: 'client@exemple.fr' }, PERSONNES)).toEqual({ ok: false, cause: 'destinataire_tiers' });
    expect(verifierEnvoiAutomatique({ destinataire: 'alice@exemple.fr' }, [])).toEqual({ ok: false, cause: 'destinataire_tiers' });
    // comparaison insensible à la casse et aux espaces autour
    expect(verifierEnvoiAutomatique({ destinataire: ' ALICE@exemple.FR ' }, PERSONNES)).toEqual({ ok: true });
    expect(verifierEnvoiAutomatique({ destinataire: 'bob.invite@exemple.fr' }, PERSONNES)).toEqual({ ok: true });
  });

  it('refus-journalise-sans-adresse', async () => {
    const lignes: unknown[] = [];
    const port = envelopperPortEnvoi({ envoyer: async () => undefined }, async () => PERSONNES, (l) => void lignes.push(l));
    await expect(port.envoyer({ destinataire: 'fournisseur@exemple.fr', sujet: 's', texte: 't' })).rejects.toThrow('destinataire_tiers');
    expect(lignes).toEqual([{ code: 'destinataire_tiers' }]);
    expect(JSON.stringify(lignes)).not.toContain('exemple.fr');
    await port.envoyer({ destinataire: 'alice@exemple.fr', sujet: 's', texte: 't' });
    expect(lignes).toHaveLength(1); // un envoi permis ne journalise rien
  });

  it('resume-quotidien-passe-par-l-enveloppe', async () => {
    const recus: Courriel[] = [];
    const pris = new Set<string>();
    const resume: PortResume = {
      personnes: async (): Promise<PersonneResume[]> => [
        { personneId: 'p1', adresse: 'alice@exemple.fr', actifs: true, comptes: { a_valider: 2 } },
        { personneId: 'p2', adresse: 'tiers@exemple.fr', actifs: true, comptes: { a_valider: 2 } },
      ],
      dejaEnvoyes: async () => [],
      reserver: async (p, d) => (pris.has(`${p}${d}`) ? false : (pris.add(`${p}${d}`), true)),
      liberer: async () => undefined,
      journaliser: async () => undefined,
    };
    const jetons: PortJetons = { creer: async () => 'jeton', consommer: async () => null };
    const envoi = envelopperPortEnvoi({ envoyer: async (c) => void recus.push(c) }, async () => PERSONNES, () => undefined);
    const travail = creerTravailResume({ resume, jetons, envoi, accesSortant: true, baseLiens: 'https://app.exemple.fr' });
    await expect(travail.passer('2026-11-12T12:00:00Z')).rejects.toThrow('envois_en_echec'); // le tiers est refusé
    expect(recus.map((c) => c.destinataire)).toEqual(['alice@exemple.fr']); // la personne du compte reçoit toujours son résumé
  });
});
