import { describe, expect, it } from 'vitest';
import { genererProfils } from '../../../donnees-fictives/src/profil.js';
import { LigneImposition, LigneRegimeTva, ReponseRegimesImposition, ReponseRegimesTva } from '../domaines/regimes.js';
import { creerServiceRegimes } from '../domaines/regimes-service.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

const societes = genererProfils().societes.map((s) => s.id);
const tvaAncienne: LigneRegimeTva = { regime: 'reel_normal', periodicite: 'mensuelle', exigibiliteServices: 'debits', optionDebits: true, effetDebut: '2020-01-01', effetFin: '2023-12-31', motif: 'option', statut: 'confirme' };
const tvaMilieu: LigneRegimeTva = { ...tvaAncienne, effetDebut: '2024-01-01', effetFin: '2025-12-31', motif: 'correction' };

describe('régimes historisés en mémoire', () => {
  it('regimes-tva-valides-contre-le-schema', () => {
    for (const id of societes) {
      const lignes = creerServiceRegimes(id).listerTva();
      expect(lignes.length).toBeGreaterThan(0);
      expect(ReponseRegimesTva.parse({ body: lignes }).body).toEqual(lignes);
    }
    expect(LigneRegimeTva.safeParse({ ...tvaAncienne, motif: 'inconnu' }).success).toBe(false);
    expect(LigneRegimeTva.safeParse({ ...tvaAncienne, effetDebut: '2026-02-30' }).success).toBe(false);
    expect(LigneRegimeTva.safeParse({ ...tvaAncienne, statut: 'a_confirmer' }).success).toBe(false);
  });

  it('imposition-valide-contre-le-schema', () => {
    for (const id of societes) {
      const lignes = creerServiceRegimes(id).listerImposition();
      expect(lignes.length).toBeGreaterThan(0);
      expect(ReponseRegimesImposition.parse({ body: lignes }).body).toEqual(lignes);
    }
    const base = creerServiceRegimes('soc-lemoine').listerImposition()[0]!;
    expect(LigneImposition.safeParse({ ...base, tauxReduit: 'peut_etre' }).success).toBe(false);
    for (const t of ['eligible', 'non_eligible', 'a_confirmer']) expect(LigneImposition.safeParse({ ...base, tauxReduit: t }).success).toBe(true);
    expect(creerServiceRegimes('soc-inconnue').listerImposition()).toEqual([]);
  });

  it('tri-par-effet-decroissant', () => {
    const s = creerServiceRegimes('soc-lemoine', { tvaSupplementaires: [tvaAncienne, tvaMilieu] });
    const debuts = s.listerTva().map((l) => l.effetDebut);
    expect(debuts).toEqual(['2026-07-01', '2024-01-01', '2020-01-01']);
    const imp = creerServiceRegimes('soc-lemoine', { impositionSupplementaires: [{ ...s.listerImposition()[0]!, effetDebut: '2019-01-01' }] }).listerImposition();
    expect(imp.map((l) => l.effetDebut)).toEqual(['2026-07-01', '2019-01-01']);
    expect(creerServiceRegimes('soc-lemoine', { tvaSupplementaires: [tvaMilieu, tvaAncienne] }).listerTva().map((l) => l.effetDebut)).toEqual(debuts);
  });

  it('ligne-proposee-visible', () => {
    const lemoine = creerServiceRegimes('soc-lemoine').listerTva();
    expect(lemoine[0]).toMatchObject({ regime: 'reel_simplifie', statut: 'propose' });
    expect(ReponseRegimesTva.parse({ body: lemoine }).body[0]!.statut).toBe('propose');
    expect(creerServiceRegimes('soc-rivoire').listerTva()[0]!.statut).toBe('confirme');
  });

  it('openapi-contient-les-regimes', () => {
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId?: string }>> };
    expect(doc.paths['/profil/regimes/tva']?.get?.operationId).toBe('listerRegimesTva');
    expect(doc.paths['/profil/regimes/imposition']?.get?.operationId).toBe('listerRegimesImposition');
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
