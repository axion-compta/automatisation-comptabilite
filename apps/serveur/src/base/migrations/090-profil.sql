-- Lot 09 : profil de la societe. Ecrite et NON executee ici ; additive et rejouable. Schema propre de la compta.
CREATE SCHEMA IF NOT EXISTS a_compta;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS a_compta.societe (societe_id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS a_compta.regime_tva_societe (societe_id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS a_compta.parametre_date (societe_id text PRIMARY KEY);

ALTER TABLE a_compta.societe
  ADD COLUMN IF NOT EXISTS forme text CHECK (forme IN ('EI','EURL','SARL','SASU','SAS','SCI')),
  ADD COLUMN IF NOT EXISTS tenue text CHECK (tenue IN ('partie_double','livre_recettes')),
  ADD COLUMN IF NOT EXISTS etat_profil text CHECK (etat_profil IN ('incomplet','a_confirmer','complet'));
ALTER TABLE a_compta.regime_tva_societe
  ADD COLUMN IF NOT EXISTS regime text CHECK (regime IN ('franchise','reel_simplifie','reel_normal','non_assujetti')),
  ADD COLUMN IF NOT EXISTS effet_debut date;
ALTER TABLE a_compta.parametre_date
  ADD COLUMN IF NOT EXISTS cle text,
  ADD COLUMN IF NOT EXISTS date_effet date;

CREATE TABLE IF NOT EXISTS a_compta.champ_profil (
  societe_id text NOT NULL, cle text NOT NULL, rang bigint NOT NULL, valeur jsonb,
  origine text NOT NULL CHECK (origine IN ('document','sirene','declaration','fec_reprise','saisie_personne','proposition_ia')),
  confiance text NOT NULL CHECK (confiance IN ('sur','a_verifier','douteux')),
  source_ref text, date_source date,
  statut text NOT NULL CHECK (statut IN ('confirme','a_confirmer','vide','je_ne_sais_pas')),
  effet_debut date NOT NULL, confirme_par text, confirme_le timestamptz,
  PRIMARY KEY (societe_id, cle, rang),
  CONSTRAINT champ_profil_confirme_par CHECK (statut <> 'confirme' OR confirme_par IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS a_compta.regime_imposition_societe (
  societe_id text NOT NULL, effet_debut date NOT NULL, effet_fin date,
  impot text NOT NULL CHECK (impot IN ('IS','IR')),
  categorie text NOT NULL CHECK (categorie IN ('BIC','BNC','revenus_fonciers')),
  regime text NOT NULL CHECK (regime IN ('micro','reel_simplifie','reel_normal','declaration_controlee')),
  motif text NOT NULL,
  statut text NOT NULL CHECK (statut IN ('propose','confirme')),
  confirme_par text,
  PRIMARY KEY (societe_id, effet_debut),
  CONSTRAINT regime_imposition_dates CHECK (effet_fin IS NULL OR effet_fin > effet_debut),
  CONSTRAINT regime_imposition_confirme_par CHECK (statut <> 'confirme' OR confirme_par IS NOT NULL),
  CONSTRAINT regime_imposition_sans_chevauchement EXCLUDE USING gist (
    societe_id WITH =, daterange(effet_debut, effet_fin, '[)') WITH &&
  )
);

CREATE TABLE IF NOT EXISTS a_compta.taille_comptable_exercice (
  societe_id text NOT NULL, exercice_id text NOT NULL,
  total_bilan_centimes bigint CHECK (total_bilan_centimes >= 0),
  ca_net_centimes bigint CHECK (ca_net_centimes >= 0),
  effectif_moyen integer CHECK (effectif_moyen >= 0),
  source text NOT NULL CHECK (source IN ('exercice_clos','estimation','je_ne_sais_pas')),
  PRIMARY KEY (societe_id, exercice_id)
);

CREATE TABLE IF NOT EXISTS a_compta.dirigeant_associe (
  societe_id text NOT NULL, personne_id text NOT NULL, nature text NOT NULL CHECK (nature IN ('physique','morale')),
  roles text NOT NULL, part_pdb integer NOT NULL CHECK (part_pdb >= 0),
  PRIMARY KEY (societe_id, personne_id)
);

CREATE TABLE IF NOT EXISTS a_compta.parametre_lecture (
  societe_id text NOT NULL,
  parametre_cle text NOT NULL,
  lecteur_id text NOT NULL, lu_le date NOT NULL, lecteur_modele text NOT NULL, lecteur_version text NOT NULL,
  source_url text NOT NULL, extrait text NOT NULL, valeur_lue text NOT NULL, complete boolean NOT NULL,
  conclusion text NOT NULL CHECK (conclusion IN ('concorde','differe','introuvable')),
  PRIMARY KEY (societe_id, parametre_cle, lecteur_id, lu_le)
);

CREATE INDEX IF NOT EXISTS champ_profil_effet ON a_compta.champ_profil (societe_id, cle, effet_debut);
CREATE INDEX IF NOT EXISTS parametre_lecture_cle ON a_compta.parametre_lecture (societe_id, parametre_cle);

CREATE OR REPLACE FUNCTION a_compta.refuser_modification() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ajout_seul';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS champ_profil_ajout_seul ON a_compta.champ_profil;
CREATE TRIGGER champ_profil_ajout_seul BEFORE UPDATE OR DELETE ON a_compta.champ_profil
  FOR EACH ROW EXECUTE FUNCTION a_compta.refuser_modification();
DROP TRIGGER IF EXISTS parametre_lecture_ajout_seul ON a_compta.parametre_lecture;
CREATE TRIGGER parametre_lecture_ajout_seul BEFORE UPDATE OR DELETE ON a_compta.parametre_lecture
  FOR EACH ROW EXECUTE FUNCTION a_compta.refuser_modification();
