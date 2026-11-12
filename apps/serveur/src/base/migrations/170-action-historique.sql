-- Lot 25 : historique commun des actions (canal, auteur, objet, avant, apres), en ajout seul. Ecrite et NON executee ici ; additive et rejouable.
CREATE SCHEMA IF NOT EXISTS a_compta;

CREATE TABLE IF NOT EXISTS a_compta.action_historique (
  id text PRIMARY KEY,
  societe_id text NOT NULL,
  le timestamptz NOT NULL,
  canal text NOT NULL CHECK (canal IN ('clic', 'chat', 'voix', 'import', 'assistant', 'expert', 'api')),
  auteur_id text NOT NULL,
  objet_type text NOT NULL,
  objet_id text NOT NULL,
  avant jsonb NOT NULL,
  apres jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS action_historique_societe_le ON a_compta.action_historique (societe_id, le);
CREATE INDEX IF NOT EXISTS action_historique_societe_canal_le ON a_compta.action_historique (societe_id, canal, le);

CREATE OR REPLACE FUNCTION a_compta.refuser_modification() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ajout_seul';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER action_historique_ajout_seul BEFORE UPDATE OR DELETE ON a_compta.action_historique
  FOR EACH ROW EXECUTE FUNCTION a_compta.refuser_modification();
