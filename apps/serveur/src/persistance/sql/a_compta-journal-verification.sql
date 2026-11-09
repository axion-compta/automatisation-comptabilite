-- Journal de vérification en ajout seul (V3-CTL-070). Texte seulement : jamais exécuté ici.
-- Le numéro réel de migration sera pris quand le schéma de la console sera livré.

CREATE TABLE IF NOT EXISTS a_compta.journal_verification (
  id text PRIMARY KEY,
  societe text NOT NULL,
  horodatage text NOT NULL,
  declencheur text NOT NULL,
  regle_id text NOT NULL,
  version_regle integer NOT NULL,
  objet_type text NOT NULL,
  objet_id text NOT NULL,
  resultat text NOT NULL,
  valeur text,
  ecart_centimes bigint,
  version_parametres text NOT NULL
);

CREATE INDEX IF NOT EXISTS journal_verification_objet_idx
  ON a_compta.journal_verification (societe, objet_type, objet_id, horodatage);

CREATE OR REPLACE FUNCTION a_compta.journal_verification_ajout_seul() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ajout_seul';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER journal_verification_ajout_seul
  BEFORE UPDATE OR DELETE ON a_compta.journal_verification
  FOR EACH ROW EXECUTE FUNCTION a_compta.journal_verification_ajout_seul();

ALTER TABLE a_compta.regle_controle ADD COLUMN IF NOT EXISTS exigence text;
ALTER TABLE a_compta.regle_controle ADD COLUMN IF NOT EXISTS regle_code text;
ALTER TABLE a_compta.regle_controle ADD COLUMN IF NOT EXISTS bloque boolean;
ALTER TABLE a_compta.regle_controle ADD COLUMN IF NOT EXISTS declencheurs text;
ALTER TABLE a_compta.regle_controle ADD COLUMN IF NOT EXISTS phase text;
ALTER TABLE a_compta.regle_controle ADD COLUMN IF NOT EXISTS test_id text;
ALTER TABLE a_compta.regle_controle ADD COLUMN IF NOT EXISTS parametres text;
ALTER TABLE a_compta.regle_controle ADD COLUMN IF NOT EXISTS actif boolean;
