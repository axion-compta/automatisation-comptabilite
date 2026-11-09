import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const FICHIER = new URL('../0110_frais.sql', import.meta.url).pathname;
const BIN = ['/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/17/bin', '/usr/lib/postgresql/15/bin'].find((d) => existsSync(`${d}/initdb`));
const racine = process.getuid?.() === 0;
const dossier = mkdtempSync(join(tmpdir(), 'pgessai-'));
const donnees = join(dossier, 'd');
const avant = (cmd: string[]): string[] => (racine ? ['runuser', '-u', 'postgres', '--', ...cmd] : cmd);
const lancer = (cmd: string[], entree?: string) => {
  const [c, ...a] = avant(cmd);
  return spawnSync(c!, a, { encoding: 'utf8', input: entree });
};
const psql = (sql: string) => lancer(['env', 'PGOPTIONS=-c client_min_messages=warning', `${BIN}/psql`, '-h', dossier, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-t', '-A', '-f', '-'], sql);
const ok = (sql: string): string => {
  const r = psql(sql);
  expect(r.stderr).toBe('');
  return r.stdout.trim();
};
const erreur = (sql: string): string => {
  const r = psql(sql);
  expect(r.status).not.toBe(0);
  return r.stderr;
};
const migration = readFileSync(FICHIER, 'utf8');
const BASE: Record<string, string> = {
  personne_id: "'pers-1'", nature: "'depense'", date_depense: "'2026-03-01'", libelle: "'repas fictif'", montant_ttc_centimes: '1200',
  tva_centimes: '200', part_perso_ttc_centimes: '0', payeur: "'personne'", statut: "'propose'",
};
const frais = (id: string, sur: Record<string, string> = {}): string => {
  const c = { id: `'${id}'`, ...BASE, ...sur };
  return `INSERT INTO a_compta.frais (${Object.keys(c).join(', ')}) VALUES (${Object.values(c).join(', ')});`;
};

// L11-T37 : PostgreSQL absent de la machine, le groupe est sauté
describe.skipIf(BIN === undefined)('migration 0110 frais', () => {
  beforeAll(() => {
    if (racine) chmodSync(dossier, 0o777);
    expect(lancer([`${BIN}/initdb`, '-D', donnees, '-A', 'trust']).status).toBe(0);
    const d = lancer([`${BIN}/pg_ctl`, '-D', donnees, '-w', '-l', join(dossier, 'journal.log'), '-o', `-c listen_addresses= -c unix_socket_directories=${dossier}`, 'start']);
    expect(d.status).toBe(0);
    ok(migration);
  }, 60000);
  afterAll(() => {
    lancer([`${BIN}/pg_ctl`, '-D', donnees, '-m', 'immediate', 'stop']);
    rmSync(dossier, { recursive: true, force: true });
  });

  it('migration-idempotente', () => {
    const decrire = `SELECT string_agg(table_name || '.' || column_name || ':' || data_type, ',' ORDER BY table_name, column_name) FROM information_schema.columns WHERE table_schema = 'a_compta';
      SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'a_compta';
      SELECT count(*) FROM pg_indexes WHERE schemaname = 'a_compta';`;
    const avantRejeu = ok(decrire);
    ok(migration);
    expect(ok(decrire)).toBe(avantRejeu);
    expect(ok("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'a_compta'")).toBe('5');
  });

  it('inv1-check-refuse-rembourse-paye-societe', () => {
    ok("INSERT INTO a_compta.remboursement (id, personne_id, montant_centimes, rembourse_le) VALUES ('rb-1', 'pers-1', 100, '2026-03-02');");
    const soc = { payeur: "'societe'" };
    expect(erreur(frais('s1', { ...soc, destination: "'remboursement'" }))).toMatch(/inv1_paye_societe/);
    expect(erreur(frais('s2', { ...soc, remboursement_id: "'rb-1'" }))).toMatch(/inv1_paye_societe/);
    expect(erreur(frais('s3', { ...soc, statut: "'rembourse'" }))).toMatch(/inv1_paye_societe/);
    ok(frais('s4', { ...soc, statut: "'exclu_paye_societe'" }));
    ok(frais('p1', { statut: "'rembourse'", destination: "'remboursement'", remboursement_id: "'rb-1'" }));
  });

  it('inv3-index-doublon-piece', () => {
    ok(frais('d1', { piece_id: "'piece-1'" }));
    expect(erreur(frais('d2', { piece_id: "'piece-1'" }))).toMatch(/frais_piece_unique_non_refuse/);
    ok(frais('d3') + frais('d4'));
  });

  it('doublon-avec-refuse-accepte', () => {
    ok(frais('r1', { piece_id: "'piece-2'", statut: "'refuse'" }));
    ok(frais('r2', { piece_id: "'piece-2'" }));
    ok(frais('r3', { piece_id: "'piece-2'", statut: "'refuse'" }));
    expect(erreur(frais('r4', { piece_id: "'piece-2'" }))).toMatch(/frais_piece_unique_non_refuse/);
  });

  it('montants-entiers-seulement', () => {
    expect(ok("SELECT string_agg(data_type, ',') FROM information_schema.columns WHERE table_schema = 'a_compta' AND column_name LIKE '%centimes' GROUP BY table_name HAVING table_name = 'frais'")).toBe('bigint,bigint,bigint');
    expect(ok("SELECT count(*) FROM information_schema.columns WHERE table_schema = 'a_compta' AND data_type IN ('numeric','real','double precision','money')")).toBe('0');
    expect(erreur(frais('m1', { montant_ttc_centimes: '-1' }))).toMatch(/montant_ttc_centimes/);
    expect(erreur(frais('m2', { montant_ttc_centimes: "'12.5'" }))).toMatch(/bigint/);
  });

  it('union-de-statut-fermee', () => {
    expect(erreur(frais('u1', { statut: "'inconnu'" }))).toMatch(/check/);
    expect(erreur(frais('u2', { payeur: "'tiers'" }))).toMatch(/check/);
    expect(erreur(frais('u3', { nature: "'autre'" }))).toMatch(/check/);
    expect(erreur("INSERT INTO a_compta.vehicule_personnel (id, personne_id, puissance_cv, energie, proprietaire, categorie, immatriculation_chiffree) VALUES ('v0', 'pers-1', 5, 'vapeur', 'personne', 'voiture', '\\x00');")).toMatch(/check/);
  });

  it('km-negatifs-refuses', () => {
    ok("INSERT INTO a_compta.vehicule_personnel (id, personne_id, puissance_cv, energie, proprietaire, categorie, immatriculation_chiffree) VALUES ('v1', 'pers-1', 5, 'thermique', 'personne', 'voiture', '\\xabcd');");
    ok(frais('t1'));
    const trajet = (km: string) => `INSERT INTO a_compta.trajet (frais_id, vehicule_id, depart, arrivee, motif, km_saisis_dixiemes) VALUES ('t1', 'v1', 'A', 'B', 'visite', ${km});`;
    expect(erreur(trajet('-1'))).toMatch(/km_saisis_dixiemes/);
    expect(erreur(trajet("'12.5'"))).toMatch(/bigint|km_saisis/);
    ok(trajet('125'));
    expect(erreur("INSERT INTO a_compta.cumul_km (vehicule_id, annee, km_dixiemes) VALUES ('v1', 2026, -5);")).toMatch(/km_dixiemes/);
  });

  it('immatriculation-jamais-en-clair', () => {
    expect(ok("SELECT data_type FROM information_schema.columns WHERE table_schema = 'a_compta' AND column_name ILIKE '%immatricul%'")).toBe('bytea');
    expect(ok("SELECT count(*) FROM information_schema.columns WHERE table_schema = 'a_compta' AND column_name ILIKE '%immatricul%' AND column_name NOT LIKE '%chiffree'")).toBe('0');
    expect(erreur("INSERT INTO a_compta.vehicule_personnel (id, personne_id, puissance_cv, energie, proprietaire, categorie) VALUES ('v2', 'pers-1', 5, 'thermique', 'personne', 'voiture');")).toMatch(/immatriculation_chiffree/);
  });
});

describe('migration 0110 : texte', () => {
  it('rejouable et sans secret', () => {
    for (const m of migration.matchAll(/CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX|SCHEMA)\b[^\n]*/g)) expect(m[0]).toMatch(/IF NOT EXISTS/);
    expect(migration).not.toMatch(/DROP|DELETE|TRUNCATE|RENAME/i);
  });
});
