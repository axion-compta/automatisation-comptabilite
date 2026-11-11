-- Lot 06 : tables de securite de la compta. Ecrite et NON executee ici ; additive et rejouable. Schema propre a_compta.
-- Journal des actions : table decrite au lot 01, non redefinie ici. Aucun secret stocke : seulement des references.
CREATE SCHEMA IF NOT EXISTS a_compta;

CREATE TABLE IF NOT EXISTS a_compta.personne (
  societe_id text NOT NULL, personne_id text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('reelle','demonstration')),
  role text NOT NULL, actif boolean NOT NULL DEFAULT true, cree_le timestamptz NOT NULL,
  PRIMARY KEY (societe_id, personne_id)
);

CREATE TABLE IF NOT EXISTS a_compta.acces_expert (
  societe_id text NOT NULL, acces_id text NOT NULL, personne_id text NOT NULL,
  portee text NOT NULL CHECK (portee IN ('lecture','proposition')),
  debut timestamptz NOT NULL, fin timestamptz,
  PRIMARY KEY (societe_id, acces_id),
  CONSTRAINT acces_expert_dates CHECK (fin IS NULL OR fin > debut),
  FOREIGN KEY (societe_id, personne_id) REFERENCES a_compta.personne (societe_id, personne_id)
);

CREATE TABLE IF NOT EXISTS a_compta.regle_permission (
  societe_id text NOT NULL, role text NOT NULL, action text NOT NULL, ressource text NOT NULL,
  autorise boolean NOT NULL,
  PRIMARY KEY (societe_id, role, action, ressource)
);

CREATE TABLE IF NOT EXISTS a_compta.horloge_vue (
  societe_id text NOT NULL, personne_id text NOT NULL, vue text NOT NULL, vu_le timestamptz NOT NULL,
  PRIMARY KEY (societe_id, personne_id, vue),
  FOREIGN KEY (societe_id, personne_id) REFERENCES a_compta.personne (societe_id, personne_id)
);

CREATE TABLE IF NOT EXISTS a_compta.tete_journal (
  societe_id text NOT NULL, rang bigint NOT NULL, empreinte text NOT NULL, empreinte_precedente text,
  ecrit_le timestamptz NOT NULL,
  PRIMARY KEY (societe_id, rang)
);

CREATE TABLE IF NOT EXISTS a_compta.signalement (
  societe_id text NOT NULL, signalement_id text NOT NULL, personne_id text NOT NULL,
  nature text NOT NULL, etat text NOT NULL CHECK (etat IN ('ouvert','traite')), cree_le timestamptz NOT NULL,
  PRIMARY KEY (societe_id, signalement_id),
  FOREIGN KEY (societe_id, personne_id) REFERENCES a_compta.personne (societe_id, personne_id)
);

CREATE TABLE IF NOT EXISTS a_compta.jeton_integration (
  societe_id text NOT NULL, jeton_id text NOT NULL, personne_id text NOT NULL,
  nom text NOT NULL, portee text NOT NULL, reference_coffre text NOT NULL,
  actif boolean NOT NULL DEFAULT false, cree_le timestamptz NOT NULL,
  PRIMARY KEY (societe_id, jeton_id),
  FOREIGN KEY (societe_id, personne_id) REFERENCES a_compta.personne (societe_id, personne_id)
);

CREATE INDEX IF NOT EXISTS acces_expert_personne ON a_compta.acces_expert (societe_id, personne_id);
CREATE INDEX IF NOT EXISTS signalement_etat ON a_compta.signalement (societe_id, etat);

-- Pas de declencheur ici (filtre de la console) : l'ajout seul de tete_journal revient au service d'audit (L06-T40).
