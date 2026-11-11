-- L10-T51 : schéma des ventes (V3-VEN-001, V3-VEN-015, V3-VEN-020). Ajout seul, rejouable. Montants en centimes (bigint).
-- Pas de contrainte ht + tva = ttc : l'anomalie A1 doit pouvoir être lue.
CREATE SCHEMA IF NOT EXISTS a_compta;

CREATE TABLE IF NOT EXISTS a_compta.tiers_client (
  societe_id text NOT NULL,
  id text NOT NULL,
  nom text NOT NULL,
  email text,
  cree_le timestamptz NOT NULL,
  PRIMARY KEY (societe_id, id)
);

CREATE TABLE IF NOT EXISTS a_compta.serie_numerotation (
  societe_id text NOT NULL,
  id text NOT NULL,
  prefixe text NOT NULL,
  dernier_numero bigint NOT NULL CHECK (dernier_numero >= 0),
  trous int[] NOT NULL DEFAULT '{}',
  doublons int[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (societe_id, id)
);

CREATE TABLE IF NOT EXISTS a_compta.piece_vente (
  societe_id text NOT NULL,
  id text NOT NULL,
  tiers_id text NOT NULL,
  serie_id text,
  numero bigint,
  cle_dedoublonnage text NOT NULL,
  date_piece date NOT NULL,
  ht_centimes bigint NOT NULL CHECK (ht_centimes >= 0),
  tva_centimes bigint NOT NULL CHECK (tva_centimes >= 0),
  ttc_centimes bigint NOT NULL CHECK (ttc_centimes >= 0),
  cree_le timestamptz NOT NULL,
  PRIMARY KEY (societe_id, id),
  UNIQUE (societe_id, cle_dedoublonnage),
  FOREIGN KEY (societe_id, tiers_id) REFERENCES a_compta.tiers_client (societe_id, id),
  FOREIGN KEY (societe_id, serie_id) REFERENCES a_compta.serie_numerotation (societe_id, id)
);

CREATE TABLE IF NOT EXISTS a_compta.ligne_vente (
  societe_id text NOT NULL,
  id text NOT NULL,
  piece_id text NOT NULL,
  libelle text NOT NULL,
  ht_centimes bigint NOT NULL CHECK (ht_centimes >= 0),
  tva_centimes bigint NOT NULL CHECK (tva_centimes >= 0),
  PRIMARY KEY (societe_id, id),
  FOREIGN KEY (societe_id, piece_id) REFERENCES a_compta.piece_vente (societe_id, id)
);

CREATE TABLE IF NOT EXISTS a_compta.encaissement_tva (
  societe_id text NOT NULL,
  id text NOT NULL,
  piece_id text NOT NULL,
  encaisse_le date NOT NULL,
  montant_ttc_centimes bigint NOT NULL CHECK (montant_ttc_centimes >= 0),
  tva_centimes bigint NOT NULL CHECK (tva_centimes >= 0),
  PRIMARY KEY (societe_id, id),
  FOREIGN KEY (societe_id, piece_id) REFERENCES a_compta.piece_vente (societe_id, id)
);

-- Isolation : chaque ligne n'est visible que pour la société portée par le réglage de session.
ALTER TABLE a_compta.tiers_client ENABLE ROW LEVEL SECURITY;
ALTER TABLE a_compta.serie_numerotation ENABLE ROW LEVEL SECURITY;
ALTER TABLE a_compta.piece_vente ENABLE ROW LEVEL SECURITY;
ALTER TABLE a_compta.ligne_vente ENABLE ROW LEVEL SECURITY;
ALTER TABLE a_compta.encaissement_tva ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tiers_client','serie_numerotation','piece_vente','ligne_vente','encaissement_tva'] LOOP
    IF NOT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'a_compta' AND tablename = t AND policyname = 'societe_courante') THEN
      EXECUTE format('CREATE POLICY societe_courante ON a_compta.%I USING (societe_id = current_setting(''a_compta.societe_id'', true)) WITH CHECK (societe_id = current_setting(''a_compta.societe_id'', true))', t);
    END IF;
  END LOOP;
END
$$;
