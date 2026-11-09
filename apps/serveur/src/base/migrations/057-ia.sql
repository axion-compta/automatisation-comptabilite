-- Lot 05 : appels et decisions de l'IA, reglage des modeles, propriete des constats. Ajout seul, rejouable, aucun texte d'entree ou de sortie.
CREATE SCHEMA IF NOT EXISTS a_compta;

CREATE TABLE IF NOT EXISTS a_compta.appel_ia (
  id text PRIMARY KEY,
  agent text NOT NULL,
  piece_id text,
  conversation_id text,
  alias text NOT NULL,
  modele text NOT NULL,
  version_modele text NOT NULL,
  fournisseur text NOT NULL,
  region text NOT NULL,
  jetons_entree bigint NOT NULL,
  jetons_sortie bigint NOT NULL,
  cout_micro_centimes bigint NOT NULL,
  duree_ms bigint NOT NULL,
  issue text NOT NULL CHECK (issue IN ('ok','secours','refus_gardien','hors_schema','arret')),
  CHECK (piece_id IS NOT NULL OR conversation_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS a_compta.decision_ia (
  id text PRIMARY KEY,
  quand timestamptz NOT NULL,
  agent text NOT NULL,
  etape text NOT NULL,
  demandeur_sorte text NOT NULL CHECK (demandeur_sorte IN ('personne','systeme')),
  demandeur_id text,
  piece_id text,
  conversation_id text,
  objet_type text NOT NULL,
  objet_id text NOT NULL,
  proposition text NOT NULL,
  source_proposition text NOT NULL CHECK (source_proposition IN ('regle_societe','historique','ia_exemples','ia_seule')),
  confiance text NOT NULL CHECK (confiance IN ('sur','a_verifier','douteux')),
  motif varchar(200) NOT NULL,
  sources_legales jsonb NOT NULL,
  appel_id text NOT NULL REFERENCES a_compta.appel_ia (id),
  cout_micro_centimes bigint NOT NULL,
  CHECK (piece_id IS NOT NULL OR conversation_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS a_compta.reglage_modele (
  prereglage text NOT NULL CHECK (prereglage IN ('rapide','precis')),
  version bigint NOT NULL,
  alias text NOT NULL,
  le timestamptz NOT NULL,
  PRIMARY KEY (prereglage, version)
);

CREATE TABLE IF NOT EXISTS a_compta.propriete_constat (
  type text PRIMARY KEY,
  pole text NOT NULL CHECK (pole IN ('comptabilite','fiscalite','juridique','rgpd_securite'))
);
