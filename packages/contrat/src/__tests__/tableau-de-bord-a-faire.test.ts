import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerServiceAlertes } from '../domaines/alertes-service.js';
import { creerServiceTableauDeBord } from '../domaines/tableau-de-bord-service.js';
import { demarrerNoeud } from '../../../faux-serveur/src/noeud.js';

const EXERCICE = 'EX2026';
const pastilles = (): number => Object.values(creerServiceAlertes().compteurs().body.parEntree).reduce((s, c) => s + c.ouvertes, 0);
const blocAFaire = (service: ReturnType<typeof creerServiceTableauDeBord>) => {
  const b = service.lire(EXERCICE, { vue: 'mois' })?.blocs.find((x) => x.code === 'a_faire');
  return b === undefined ? undefined : { etat: b.etat, donnees: b.donnees as Record<string, unknown> | undefined };
};

describe('bloc À faire : même source que la pastille du menu', () => {
  it('bloc-a-faire-egal-compteurs-menu', () => {
    const attendu = pastilles();
    expect(attendu).toBeGreaterThan(0);
    const bloc = blocAFaire(creerServiceTableauDeBord());
    expect(bloc?.donnees?.['nombre']).toBe(attendu);
    // le nombre vient de la source, pas d'une constante ni du détail enAttente
    expect(blocAFaire(creerServiceTableauDeBord({ nombreAFaire: () => 7 }))?.donnees?.['nombre']).toBe(7);
    // zéro est une valeur, pas une absence
    const zero = blocAFaire(creerServiceTableauDeBord({ nombreAFaire: () => 0 }));
    expect(zero?.etat).toBe('ok');
    expect(zero?.donnees?.['nombre']).toBe(0);
    // le détail reste une donnée secondaire, distincte
    expect(bloc?.donnees?.['enAttente']).toMatchObject({ nombre: expect.any(Number) });
  });

  describe('faux-serveur-meme-compteur', () => {
    const base = 'http://faux.exemple.fr/api';
    let serveur: { fermer: () => void };
    beforeAll(() => void (serveur = demarrerNoeud({ base })));
    afterAll(() => serveur.fermer());

    it('faux-serveur-meme-compteur', async () => {
      const rep = await fetch(base + '/exercices/' + EXERCICE + '/tableau-de-bord?vue=mois');
      const corps = (await rep.json()) as { body: { blocs: { code: string; donnees?: Record<string, unknown> }[] } };
      expect(corps.body.blocs.find((b) => b.code === 'a_faire')?.donnees?.['nombre']).toBe(pastilles());
      // les autres blocs gardent exactement les données du service (aucun `nombre` ajouté)
      const ref = creerServiceTableauDeBord().lire(EXERCICE, { vue: 'mois' })!.blocs;
      const autres = corps.body.blocs.filter((b) => b.code !== 'a_faire');
      expect(autres.length).toBeGreaterThan(0);
      for (const bloc of autres) {
        expect(bloc.donnees).toEqual(ref.find((r) => r.code === bloc.code)?.donnees);
        if (bloc.donnees) expect(bloc.donnees).not.toHaveProperty('nombre');
      }
      const un = await fetch(base + '/exercices/' + EXERCICE + '/tableau-de-bord/a_faire?vue=mois');
      expect(((await un.json()) as { body: { donnees?: Record<string, unknown> } }).body.donnees?.['nombre']).toBe(pastilles());
    });

    it('faux-serveur-meme-compteur-apres-une-action', async () => {
      const lister = async () => ((await (await fetch(base + '/exercices/' + EXERCICE + '/alertes')).json()) as { body: { id: string; etat: string; gravite: string; version: number }[] }).body;
      const somme = async () => Object.values(((await (await fetch(base + '/exercices/' + EXERCICE + '/compteurs')).json()) as { body: { parEntree: Record<string, { ouvertes: number }> } }).body.parEntree).reduce((s, c) => s + c.ouvertes, 0);
      const avant = await somme();
      const cible = (await lister()).find((a) => a.etat === 'ouverte' && a.gravite === 'info')!;
      const rep = await fetch(base + '/exercices/' + EXERCICE + '/alertes/' + cible.id + '/ignorer', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': 'cle-essai-a-faire-1' },
        body: JSON.stringify({ motif: 'doublon fictif', version: cible.version }),
      });
      expect(rep.status).toBe(200);
      const apres = await somme();
      expect(apres).toBe(avant - 1);
      const t = (await (await fetch(base + '/exercices/' + EXERCICE + '/tableau-de-bord?vue=mois')).json()) as { body: { blocs: { code: string; donnees?: Record<string, unknown> }[] } };
      expect(t.body.blocs.find((b) => b.code === 'a_faire')?.donnees?.['nombre']).toBe(apres);
      const un = (await (await fetch(base + '/exercices/' + EXERCICE + '/tableau-de-bord/a_faire?vue=mois')).json()) as { body: { donnees?: Record<string, unknown> } };
      expect(un.body.donnees?.['nombre']).toBe(apres);
    });
  });
});
