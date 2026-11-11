-- Lot 15 : index de recherche (spec 15, RE-R1 a RE-R5). Ecrite et NON executee ici ; additive et rejouable.
CREATE SCHEMA IF NOT EXISTS a_compta;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;
-- unaccent n'est pas IMMUTABLE : enveloppe pour la colonne generee et l'index.
CREATE OR REPLACE FUNCTION a_compta.sans_accent(texte text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, texte) $$;
CREATE TABLE IF NOT EXISTS a_compta.index_recherche (
  societe_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('piece','ecriture','tiers','commentaire')),
  objet_id text NOT NULL,
  titre text NOT NULL,
  texte text NOT NULL DEFAULT '',
  lien text NOT NULL,
  date_objet date NOT NULL,
  exercice_id text,
  montants_centimes bigint[] NOT NULL DEFAULT '{}',
  siren text,
  maj_le timestamptz NOT NULL DEFAULT now(),
  vecteur tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('french', a_compta.sans_accent(titre)), 'A') ||
    to_tsvector('french', a_compta.sans_accent(texte))
  ) STORED,
  PRIMARY KEY (societe_id, type, objet_id)
);
CREATE INDEX IF NOT EXISTS index_recherche_vecteur ON a_compta.index_recherche USING GIN (vecteur);
CREATE INDEX IF NOT EXISTS index_recherche_montants ON a_compta.index_recherche USING GIN (montants_centimes);
CREATE INDEX IF NOT EXISTS index_recherche_siren ON a_compta.index_recherche (societe_id, siren) WHERE siren IS NOT NULL;
