import { describe, expect, it } from 'vitest';
import { acceptationsManquantes } from '../../../noyau/src/abonnement/documents.js';
import { etatDuModule } from '../../../noyau/src/abonnement/etats.js';
import { enregistrerAccuse, verifierParametres } from '../../../noyau/src/abonnement/fin-contrat.js';
import { validerPaliers } from '../../../noyau/src/abonnement/paliers.js';
import { etatQuota } from '../../../noyau/src/abonnement/quota.js';
import { seuilAtteint } from '../../../noyau/src/abonnement/seuils.js';
import {
  PALIERS_FICTIFS, PARAMETRES_ABONNEMENT_FICTIFS, SCENARIO_PAR_DEFAUT, SOCIETES_FICTIVES_ABONNEMENT,
  donneesDuScenario, lireScenario, type ScenarioAbonnement,
} from '../abonnement.js';

const AUJOURDHUI = '2030-03-15';
const COMPRIS = 100;
const donnees = (texte: string) => donneesDuScenario(lireScenario(texte), AUJOURDHUI);
const somme = (m: ReadonlyMap<string, number>): number => [...m.values()].reduce((s, n) => s + n, 0);
const cles = (x: unknown, acc: string[] = []): string[] => {
  if (x instanceof Map) return cles(Object.fromEntries(x), acc);
  if (typeof x === 'object' && x !== null) {
    for (const [k, v] of Object.entries(x)) {
      acc.push(k);
      cles(v, acc);
    }
  }
  return acc;
};

describe('données fictives de l’abonnement', () => {
  it('paliers-fictifs-valides', () => {
    const paliers = validerPaliers(PALIERS_FICTIFS);
    expect(paliers.map((p) => p.code)).toEqual(['compta-1', 'compta-2', 'compta-3']);
    expect(paliers[0]?.piecesParMois).toBe(COMPRIS);
    for (const p of paliers) expect(p.nomAffiche).toContain(String(p.piecesParMois) + ' pièces par mois');
    expect(() => verifierParametres(PARAMETRES_ABONNEMENT_FICTIFS.finContrat)).not.toThrow();
    expect(PARAMETRES_ABONNEMENT_FICTIFS.comportementQuota).toBe('continuer');
  });

  it('scenario-par-defaut-si-entete-absente-ou-invalide', () => {
    expect(SCENARIO_PAR_DEFAUT).toEqual({ acces: 'actif', volume: 'normal', finContrat: 'aucune', cgv: 'acceptees', reprise: 'non' });
    for (const t of [null, '', 'acces=pirate', ';;;', 'acces', 'acces=', '=actif', 'inconnue=oui', 'acces=actif;', 'acces=actif;acces=essai', '__proto__=actif']) {
      expect(lireScenario(t)).toEqual(SCENARIO_PAR_DEFAUT);
    }
    expect(lireScenario('acces=actif;volume=pirate')).toEqual(SCENARIO_PAR_DEFAUT);
  });

  it('scenario-combine', () => {
    const s = lireScenario('acces=lecture_seule;volume=depasse;reprise=oui');
    expect(s).toEqual({ ...SCENARIO_PAR_DEFAUT, acces: 'lecture_seule', volume: 'depasse', reprise: 'oui' });
    const d = donneesDuScenario(s, AUJOURDHUI);
    expect(d.fileReprise).toHaveLength(20);
    expect(donnees('').fileReprise).toEqual([]);
    expect(etatQuota({ dejaTraitees: d.utilise, compris: COMPRIS }).depasse).toBe(true);
    expect(d.utilise).toBeGreaterThan(COMPRIS);
    const seuil = donnees('volume=seuil').utilise;
    const [premier] = PARAMETRES_ABONNEMENT_FICTIFS.seuilsBps;
    expect(seuilAtteint(seuil, COMPRIS, premier as number)).toBe(true);
    expect(seuil).toBeLessThan(COMPRIS);
    const normal = donnees('').utilise;
    expect(seuilAtteint(normal, COMPRIS, premier as number)).toBe(false);
    expect(donnees('').palierActuel).toBe('compta-1');
  });

  it('meme-graine-memes-donnees', () => {
    expect(donnees('volume=seuil;reprise=oui')).toEqual(donnees('volume=seuil;reprise=oui'));
    for (const v of ['normal', 'seuil', 'depasse']) {
      const d = donnees('volume=' + v);
      expect(somme(d.piecesParJour)).toBe(d.utilise);
      for (const jour of d.piecesParJour.keys()) expect(jour.startsWith('2030-03-')).toBe(true);
      expect(jusquAujourdhui(d.piecesParJour)).toBe(true);
    }
    expect(donneesDuScenario(SCENARIO_PAR_DEFAUT, '2030-04-20').piecesParJour).not.toEqual(donnees('').piecesParJour);
  });

  it('six-etats-d-acces-atteignables', () => {
    const attendu: Record<ScenarioAbonnement['acces'], string> = {
      actif: 'ACTIF', essai: 'ESSAI', delai_de_grace: 'DELAI_DE_GRACE', lecture_seule: 'LECTURE_SEULE', suspendu: 'SUSPENDU', resilie: 'RESILIE',
    };
    for (const [acces, etat] of Object.entries(attendu)) {
      expect(etatDuModule(donnees('acces=' + acces).etatVoulu, AUJOURDHUI)).toBe(etat);
    }
  });

  it('fin-de-contrat-coherente', () => {
    expect(donnees('').finContrat.dateFin).toBeNull();
    expect(donnees('finContrat=preavis').finContrat.dateFin).not.toBeNull();
    const remis = donnees('finContrat=remis').finContrat;
    expect(remis.remisLe).not.toBeNull();
    expect(remis.accuseLe).toBeNull();
    const acquit = enregistrerAccuse(remis, { empreinteRecue: remis.manifesteEmpreinte as string, auteur: 'Alice Fictive', horodatage: AUJOURDHUI + 'T12:00:00Z' });
    expect(acquit.fin.accuseLe).not.toBeNull();
    const accuse = donnees('finContrat=accuse').finContrat;
    expect((accuse.accuseLe as string) >= (accuse.remisLe as string)).toBe(true);
    expect(accuse.accusePar).not.toBeNull();
    expect(accuse.gelModule.actif).toBe(false);
    const gele = donnees('finContrat=gele').finContrat;
    expect(gele.gelModule.actif).toBe(true);
    expect(gele.accuseLe).not.toBeNull();
    for (const f of [remis, accuse, gele]) expect(f.manifesteEmpreinte).toMatch(/^[0-9a-f]{64}$/);
    const manque = (t: string) => {
      const d = donnees(t);
      return acceptationsManquantes({ documents: d.documents, acceptations: d.acceptations, personne: 'Alice Fictive', organisation: 'Client X fictif', typesRequis: ['cgv'], date: AUJOURDHUI });
    };
    expect(manque('cgv=acceptees')).toEqual([]);
    expect(manque('cgv=a_accepter')).toEqual([{ type: 'cgv', version: 2 }]);
    expect(donnees('cgv=a_accepter').acceptations.map((a) => a.version)).toEqual([1]);
    expect(donnees('cgv=a_accepter').documents.map((d) => d.version)).toContain(2);
  });

  it('aucun-nom-reel-ni-prix', () => {
    const tout = [PALIERS_FICTIFS, PARAMETRES_ABONNEMENT_FICTIFS, donnees('reprise=oui;finContrat=gele;cgv=a_accepter;acces=essai')];
    for (const k of cles(tout)) expect(k).not.toMatch(/prix|montant|tarif/i);
    expect(JSON.stringify(tout)).not.toMatch(/€|eur\b|euros?\b|@(?!exemple\.fr)/i);
    expect(SOCIETES_FICTIVES_ABONNEMENT).toEqual(['Société A fictive', 'Société B fictive']);
    const societes = new Set(donnees('reprise=oui').fileReprise.map((p) => p.societe));
    expect([...societes].sort()).toEqual(['Société A fictive', 'Société B fictive']);
  });
});

function jusquAujourdhui(m: ReadonlyMap<string, number>): boolean {
  return [...m.keys()].every((j) => j <= AUJOURDHUI) && m.has('2030-03-01');
}
