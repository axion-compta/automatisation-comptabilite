import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { envelopperPortEnvoi, type PersonneDuCompte } from '../destinataires-autorises.js';
import { envoyerInvitation } from '../invitation-email.js';
import type { Courriel, PortJetons } from '../resume-email.js';

function boite() {
  const recus: Courriel[] = [];
  const personnes: PersonneDuCompte[] = [{ adresse: 'alice@exemple.fr', actif: true }];
  const ordre: string[] = [];
  const envoi = envelopperPortEnvoi({ envoyer: async (c) => (ordre.push('envoi'), void recus.push(c)) }, async () => personnes, () => undefined);
  const params = {
    envoi, baseLiens: 'https://app.exemple.fr',
    ajouterInvite: async (_id: string, adresse: string) => (ordre.push('ajout'), void personnes.push({ adresse, actif: true })),
  };
  return { recus, params, ordre };
}

describe('invitation par e-mail', () => {
  it('invitation-recue-sur-boite-de-test', async () => {
    const { recus, params, ordre } = boite();
    await envoyerInvitation({ invitationId: 'inv-1', adresse: 'Expert@Exemple.fr', jeton: 'jeton-1' }, params);
    expect(recus).toHaveLength(1);
    expect(recus[0]?.destinataire).toBe('Expert@Exemple.fr');
    expect(recus[0]?.sujet.length).toBeGreaterThan(0);
    expect(ordre).toEqual(['ajout', 'envoi']); // l'invité est ajouté avant l'envoi
    await expect(envoyerInvitation({ invitationId: 'inv-2', adresse: 'pas-une-adresse', jeton: 'j' }, params)).rejects.toThrow('parametre_invalide');
    await expect(envoyerInvitation({ invitationId: 'inv-2', adresse: 'x@exemple.fr', jeton: ' ' }, params)).rejects.toThrow('parametre_invalide');
    expect(recus).toHaveLength(1);
  });

  it('lien-a-usage-unique', async () => {
    const { recus, params } = boite();
    const valides = new Map([['jeton/a b', 'inv-1']]);
    const jetons: PortJetons = { creer: async () => 'x', consommer: async (j) => { const v = valides.get(j) ?? null; valides.delete(j); return v; } };
    await envoyerInvitation({ invitationId: 'inv-1', adresse: 'expert@exemple.fr', jeton: 'jeton/a b' }, params);
    const lien = /https:\/\/\S+/.exec(recus[0]?.texte ?? '')?.[0] ?? '';
    expect(lien).toBe('https://app.exemple.fr/invitation/jeton%2Fa%20b');
    const jeton = decodeURIComponent(lien.split('/invitation/')[1] ?? '');
    expect(await jetons.consommer(jeton)).toBe('inv-1');
    expect(await jetons.consommer(jeton)).toBeNull(); // le second usage est refusé
    expect(recus[0]?.texte).toContain('ne sert qu’une fois');
  });

  it('invitation-sans-donnee-de-societe', async () => {
    const { recus, params } = boite();
    await envoyerInvitation({ invitationId: 'inv-1', adresse: 'expert@exemple.fr', jeton: 'jeton-1' }, params);
    const tout = `${recus[0]?.sujet}\n${recus[0]?.texte}`;
    expect(tout).not.toMatch(/\d+[,.]?\d*\s?(€|eur)/i);
    expect(tout).not.toMatch(/\b\d{9}\b|siren|siret|société|iban/i);
    expect(tout).not.toContain('inv-1');
  });
});

describe('registre des sous-traitants', () => {
  it('sous-traitants-reception-et-transcription-listes', () => {
    const lignes = readFileSync('docs/sous-traitants.csv', 'utf8').trim().split('\n').map((l) => l.split(','));
    const par = new Map(lignes.slice(1).map((c) => [c[0], c]));
    for (const ref of ['REC-1', 'TRA-1']) {
      const c = par.get(ref);
      expect(c, ref).toBeDefined();
      expect(c?.[2]).toBe('oui'); // traitement dans l'Union européenne
      expect(c?.[8]).toBe('non'); // inactif
      expect(c?.slice(5, 8)).toEqual(['', '', '']);
    }
    expect(par.get('REC-1')?.[1]).toContain('réception');
    expect(par.get('TRA-1')?.[1]).toContain('transcription');
  });
});
