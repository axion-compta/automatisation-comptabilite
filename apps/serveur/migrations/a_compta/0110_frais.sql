-- Lot 11 : frais, trajets, vehicules personnels, cumul km, remboursements. Ajout seul, rejouable.
CREATE SCHEMA IF NOT EXISTS a_compta;

CREATE TABLE IF NOT EXISTS a_compta.vehicule_personnel (
  id text PRIMARY KEY,
  personne_id text NOT NULL,
  puissance_cv integer NOT NULL CHECK (puissance_cv > 0),
  energie text NOT NULL CHECK (energie IN ('thermique','hybride','hydrogene','electrique')),
  proprietaire text NOT NULL CHECK (proprietaire IN ('personne','conjoint','societe','location')),
  categorie text NOT NULL CHECK (categorie IN ('voiture','deux_roues')),
  immatriculation_chiffree bytea NOT NULL,
  carte_grise_piece_id text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE IF NOT EXISTS a_compta.remboursement (
  id text PRIMARY KEY,
  personne_id text NOT NULL,
  montant_centimes bigint NOT NULL CHECK (montant_centimes >= 0),
  rembourse_le date NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE IF NOT EXISTS a_compta.frais (
  id text PRIMARY KEY,
  personne_id text NOT NULL,
  nature text NOT NULL CHECK (nature IN ('depense','trajet')),
  categorie_depense text,
  date_depense date NOT NULL,
  libelle text NOT NULL,
  montant_ttc_centimes bigint NOT NULL CHECK (montant_ttc_centimes >= 0),
  tva_centimes bigint NOT NULL CHECK (tva_centimes >= 0),
  part_perso_ttc_centimes bigint NOT NULL CHECK (part_perso_ttc_centimes >= 0),
  piece_id text,
  payeur text NOT NULL CHECK (payeur IN ('societe','personne','a_confirmer')),
  source_payeur text CHECK (source_payeur IN ('banque','declaration','ia')),
  ligne_banque_id text,
  statut text NOT NULL CHECK (statut IN ('brouillon','a_completer','propose','valide','rembourse','en_compte_courant','exclu_paye_societe','refuse','perso')),
  justificatif_perdu boolean NOT NULL DEFAULT false,
  motif_sans_justificatif text,
  destination text CHECK (destination IN ('remboursement','compte_courant')),
  ecriture_id text,
  remboursement_id text REFERENCES a_compta.remboursement (id),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CONSTRAINT inv1_paye_societe CHECK (
    payeur <> 'societe' OR (destination IS NULL AND remboursement_id IS NULL AND statut <> 'rembourse')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS frais_piece_unique_non_refuse
  ON a_compta.frais (piece_id) WHERE piece_id IS NOT NULL AND statut <> 'refuse';

CREATE TABLE IF NOT EXISTS a_compta.trajet (
  frais_id text PRIMARY KEY REFERENCES a_compta.frais (id),
  vehicule_id text NOT NULL REFERENCES a_compta.vehicule_personnel (id),
  depart text NOT NULL,
  arrivee text NOT NULL,
  motif text NOT NULL,
  km_saisis_dixiemes bigint NOT NULL CHECK (km_saisis_dixiemes >= 0),
  aller_retour boolean NOT NULL DEFAULT false,
  taux_applique text
);

CREATE TABLE IF NOT EXISTS a_compta.cumul_km (
  vehicule_id text NOT NULL REFERENCES a_compta.vehicule_personnel (id),
  annee integer NOT NULL,
  km_dixiemes bigint NOT NULL CHECK (km_dixiemes >= 0),
  PRIMARY KEY (vehicule_id, annee)
);
