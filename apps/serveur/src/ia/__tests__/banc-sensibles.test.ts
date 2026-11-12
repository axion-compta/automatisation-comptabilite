import { describe, expect, it, vi } from 'vitest';
import { detecterChiffres } from '../../../../../packages/noyau/src/pieces/sensibles/chiffres.js';
import { deciderSensibilite } from '../../../../../packages/noyau/src/pieces/sensibles/identite.js';
import { MOTIFS_SENSIBLES } from '../../../../../packages/noyau/src/pieces/sensibles/motifs.js';
import { validerListeRoutes } from '../../../../../packages/noyau/src/securite/routes-ia.js';
import { creerPasserelle } from '../passerelle.js';

const route = { fournisseur: 'IA-1', region: 'ue-test', mode: 'sans-conservation' };
const liste = validerListeRoutes({ routes: [{ ...route, decision: 'D43', ajouteeLe: '2026-01-01' }] });
const MOTS = [...MOTIFS_SENSIBLES.pieceIdentite, ...MOTIFS_SENSIBLES.santePaie];
const MODELES = [
  (m: string) => `${m}\nAlice Fictive, société Exemple`,
  (m: string) => `Pièce jointe : ${m.toUpperCase()} de Bruno Inventé`,
  (m: string) => `Facture F-2026-001\nTotal TTC : 112,34\nAnnexe : ${m}`,
];
const BANC = MOTS.flatMap((m) => MODELES.map((f) => f(m)));

function monter() {
  const appel = vi.fn(async () => 'reponse');
  const p = creerPasserelle({ liste, appel, journaliser: () => {} });
  // même règle que la chaîne de pièces : une pièce sensible ne devient jamais une question
  const envoyer = (texte: string) => {
    const d = deciderSensibilite({ texte, detectionsChiffrees: detecterChiffres(texte) });
    return d.appelIaPermis ? p.demander({ client: 'client-a', route, question: texte }) : Promise.resolve({ issue: 'refusee' as const });
  };
  return { appel, envoyer };
}

describe('banc des pièces sensibles', () => {
  it('banc-zero-donnee-sensible-envoyee', async () => {
    expect(BANC.length).toBeGreaterThanOrEqual(30);
    const { appel, envoyer } = monter();
    for (const texte of BANC) {
      expect(deciderSensibilite({ texte, detectionsChiffrees: detecterChiffres(texte) }).sensible).toBe(true);
      expect(await envoyer(texte)).toEqual({ issue: 'refusee' });
    }
    expect(appel).toHaveBeenCalledTimes(0);
    // témoin : une pièce ordinaire passe bien par la passerelle simulée
    expect(await envoyer('Facture F-2026-002\nTotal TTC : 112,34')).toMatchObject({ issue: 'ok' });
    expect(appel).toHaveBeenCalledTimes(1);
  });
});
