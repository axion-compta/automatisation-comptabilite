import { describe, expect, it, vi } from 'vitest';
import { MOTIFS_SENSIBLES } from '../../../../../packages/noyau/src/pieces/sensibles/motifs.js';
import { validerListeRoutes } from '../../../../../packages/noyau/src/securite/routes-ia.js';
import { etapePreparation } from '../../pieces/etape-preparation.js';
import { StockageMemoire } from '../../pieces/ports-memoire.js';
import type { Extracteur, PieceEnregistree } from '../../pieces/ports.js';
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

const reglage = { seuilNettete: 100, texteCache: { ecartCouleurMax: 30, taillePoliceMin: 4 } };

function monter() {
  const appel = vi.fn(async () => 'reponse');
  const p = creerPasserelle({ liste, appel, journaliser: () => {} });
  const stockage = new StockageMemoire();
  const extracteur: Extracteur = {
    async extraire(octets) {
      const el = { texte: new TextDecoder().decode(octets), page: 1, x: 10, y: 10, largeur: 100, hauteur: 12, taillePolice: 12, couleur: [0, 0, 0], couleurFond: [255, 255, 255], calqueVisible: true, annotationCachee: false };
      return { elements: [el], pages: [{ numero: 1, largeur: 600, hauteur: 800 }], nbPages: 1 };
    },
  };
  let n = 0;
  // Chemin réel : la préparation décide du texte transmissible, la passerelle n'est appelée que pour ce texte.
  const envoyer = async (texte: string) => {
    const cle = `cle-${String(++n)}`;
    await stockage.deposerSiAbsent(cle, new TextEncoder().encode(texte));
    const piece: PieceEnregistree = { id: `p-${String(n)}`, societeId: 'soc-fictive', sha256: cle, etat: 'recue', typeReel: 'pdf', cle };
    const prep = await etapePreparation(piece, { stockage, extracteur, reglage });
    if (prep.texteTransmissible === null) return { prep, issue: 'non_envoyee' as const };
    return { prep, issue: (await p.demander({ client: 'client-a', route, question: prep.texteTransmissible })).issue };
  };
  return { appel, envoyer };
}

describe('banc des pièces sensibles', () => {
  it('banc-zero-donnee-sensible-envoyee', async () => {
    expect(BANC.length).toBeGreaterThanOrEqual(30);
    const { appel, envoyer } = monter();
    for (const texte of BANC) {
      const r = await envoyer(texte);
      expect(r.prep).toMatchObject({ sensible: true, texteTransmissible: null });
      expect(r.issue).toBe('non_envoyee');
    }
    expect(appel).toHaveBeenCalledTimes(0);
    // témoin : une pièce ordinaire passe bien par la passerelle simulée
    expect((await envoyer('Facture F-2026-002\nTotal TTC : 112,34')).issue).toBe('ok');
    expect(appel).toHaveBeenCalledTimes(1);
  });
});
