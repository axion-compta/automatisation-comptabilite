-- Lot 15 : alertes, instantanes, compteurs, echeances, preferences, notifications, usage, exports. Rejouable, non executee ici.
CREATE SCHEMA IF NOT EXISTS a_compta;
CREATE TABLE IF NOT EXISTS a_compta.regle_alerte (id text PRIMARY KEY, libelle text NOT NULL, gravite text NOT NULL CHECK (gravite IN ('info','attention','bloquante')));
CREATE TABLE IF NOT EXISTS a_compta.alerte (societe_id text NOT NULL, id text NOT NULL, regle_id text NOT NULL REFERENCES a_compta.regle_alerte (id), cle_dedoublonnage text NOT NULL, etat text NOT NULL CHECK (etat IN ('ouverte','reportee','fermee')), ouverte_le timestamptz NOT NULL, reportee_jusquau timestamptz, PRIMARY KEY (societe_id, id));
CREATE UNIQUE INDEX IF NOT EXISTS alerte_active_unique ON a_compta.alerte (societe_id, cle_dedoublonnage) WHERE etat IN ('ouverte','reportee');
CREATE TABLE IF NOT EXISTS a_compta.alerte_journal (societe_id text NOT NULL, id text NOT NULL, alerte_id text NOT NULL, le timestamptz NOT NULL, evenement text NOT NULL CHECK (evenement IN ('ouverte','reportee','fermee','rouverte')), par text NOT NULL, PRIMARY KEY (societe_id, id), FOREIGN KEY (societe_id, alerte_id) REFERENCES a_compta.alerte (societe_id, id));
-- Ajout seul : toute modification ou suppression de alerte_journal est refusee par le declencheur.
CREATE OR REPLACE FUNCTION a_compta.refuser_modification_journal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'alerte_journal est en ajout seul';
END;
$$;
CREATE OR REPLACE TRIGGER alerte_journal_ajout_seul BEFORE UPDATE OR DELETE ON a_compta.alerte_journal
  FOR EACH ROW EXECUTE FUNCTION a_compta.refuser_modification_journal();
CREATE TABLE IF NOT EXISTS a_compta.instantane_tdb (
  societe_id text NOT NULL,
  id text NOT NULL,
  le timestamptz NOT NULL,
  indicateur text NOT NULL,
  montant_centimes bigint NOT NULL,
  PRIMARY KEY (societe_id, id)
);
CREATE TABLE IF NOT EXISTS a_compta.compteur_ecritures (societe_id text PRIMARY KEY, nombre bigint NOT NULL);
CREATE TABLE IF NOT EXISTS a_compta.compteur_menu (societe_id text NOT NULL, entree text NOT NULL, nombre bigint NOT NULL, PRIMARY KEY (societe_id, entree));
CREATE TABLE IF NOT EXISTS a_compta.echeance (
  societe_id text NOT NULL,
  id text NOT NULL,
  libelle text NOT NULL,
  le date NOT NULL,
  montant_centimes bigint,
  PRIMARY KEY (societe_id, id)
);
CREATE TABLE IF NOT EXISTS a_compta.preference_personne (personne_id text NOT NULL, cle text NOT NULL, valeur text NOT NULL, PRIMARY KEY (personne_id, cle));
CREATE TABLE IF NOT EXISTS a_compta.resume_email_envoi (personne_id text NOT NULL, jour date NOT NULL, PRIMARY KEY (personne_id, jour));
CREATE TABLE IF NOT EXISTS a_compta.notification (
  societe_id text NOT NULL,
  id text NOT NULL,
  destinataire_id text NOT NULL,
  texte text NOT NULL,
  le timestamptz NOT NULL,
  lue boolean NOT NULL,
  PRIMARY KEY (societe_id, id)
);
CREATE TABLE IF NOT EXISTS a_compta.terme (code text PRIMARY KEY, libelle text NOT NULL);
CREATE TABLE IF NOT EXISTS a_compta.evenement_usage (
  societe_id text NOT NULL,
  id text NOT NULL,
  evenement text NOT NULL,
  le timestamptz NOT NULL,
  PRIMARY KEY (societe_id, id)
);
CREATE TABLE IF NOT EXISTS a_compta.export_fichier (
  societe_id text NOT NULL,
  id text NOT NULL,
  nom text NOT NULL,
  empreinte text NOT NULL,
  le timestamptz NOT NULL,
  PRIMARY KEY (societe_id, id)
);
