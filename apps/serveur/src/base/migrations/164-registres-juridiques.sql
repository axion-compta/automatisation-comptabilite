-- Lot 16 : registre des decisions et des mouvements de titres, en ajout seul. Ecrite et NON executee ici ; additive et rejouable.
CREATE SCHEMA IF NOT EXISTS a_compta;

CREATE TABLE IF NOT EXISTS a_compta.registre_decision (
  id text PRIMARY KEY,
  societe_id text NOT NULL,
  sequence bigint NOT NULL,
  objet text NOT NULL,
  date_decision date NOT NULL,
  piece_id text NOT NULL,
  horodatage timestamptz NOT NULL,
  empreinte_precedente text,
  empreinte text NOT NULL,
  UNIQUE (societe_id, sequence)
);

CREATE TABLE IF NOT EXISTS a_compta.mouvement_titres (
  id text PRIMARY KEY,
  societe_id text NOT NULL,
  sequence bigint NOT NULL,
  date_mouvement date NOT NULL,
  cedant_id text,
  cessionnaire_id text NOT NULL,
  nombre bigint NOT NULL CHECK (nombre > 0),
  valeur_nominale_centimes bigint NOT NULL CHECK (valeur_nominale_centimes >= 0),
  piece_id text NOT NULL,
  horodatage timestamptz NOT NULL,
  empreinte_precedente text,
  empreinte text NOT NULL,
  UNIQUE (societe_id, sequence)
);

CREATE OR REPLACE FUNCTION a_compta.refuser_modification() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ajout_seul';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER registre_decision_ajout_seul BEFORE UPDATE OR DELETE ON a_compta.registre_decision
  FOR EACH ROW EXECUTE FUNCTION a_compta.refuser_modification();
CREATE OR REPLACE TRIGGER mouvement_titres_ajout_seul BEFORE UPDATE OR DELETE ON a_compta.mouvement_titres
  FOR EACH ROW EXECUTE FUNCTION a_compta.refuser_modification();
