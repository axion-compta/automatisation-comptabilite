-- Lot 05 : persistance du chat (conversations, messages, etapes, preferences, propositions). Ajout seul, rejouable.
CREATE SCHEMA IF NOT EXISTS a_compta;

CREATE TABLE IF NOT EXISTS a_compta.conversation (
  id text NOT NULL,
  societe_id text NOT NULL,
  cree_le timestamptz NOT NULL,
  PRIMARY KEY (societe_id, id)
);

CREATE TABLE IF NOT EXISTS a_compta.message (
  id text NOT NULL,
  societe_id text NOT NULL,
  conversation_id text NOT NULL,
  parent_id text,
  role text NOT NULL CHECK (role IN ('personne','assistant')),
  texte text NOT NULL,
  le timestamptz NOT NULL,
  PRIMARY KEY (societe_id, id),
  FOREIGN KEY (societe_id, conversation_id) REFERENCES a_compta.conversation (societe_id, id),
  FOREIGN KEY (societe_id, parent_id) REFERENCES a_compta.message (societe_id, id)
);

CREATE TABLE IF NOT EXISTS a_compta.etape (
  id text NOT NULL,
  societe_id text NOT NULL,
  message_id text NOT NULL,
  code text NOT NULL,
  le timestamptz NOT NULL,
  PRIMARY KEY (societe_id, id),
  FOREIGN KEY (societe_id, message_id) REFERENCES a_compta.message (societe_id, id)
);

CREATE TABLE IF NOT EXISTS a_compta.preference (
  societe_id text NOT NULL,
  cle text NOT NULL,
  valeur text NOT NULL,
  oubliee_le timestamptz,
  PRIMARY KEY (societe_id, cle)
);

CREATE TABLE IF NOT EXISTS a_compta.proposition_chat (
  id text NOT NULL,
  societe_id text NOT NULL,
  conversation_id text NOT NULL,
  etat text NOT NULL CHECK (etat IN ('proposee','appliquee','annulee','expiree')),
  avant jsonb NOT NULL,
  apres jsonb NOT NULL,
  cibles jsonb NOT NULL,
  expire_le timestamptz NOT NULL,
  applique_le timestamptz,
  PRIMARY KEY (societe_id, id),
  FOREIGN KEY (societe_id, conversation_id) REFERENCES a_compta.conversation (societe_id, id)
);

CREATE INDEX IF NOT EXISTS message_parent ON a_compta.message (societe_id, conversation_id, parent_id);
CREATE INDEX IF NOT EXISTS proposition_chat_expiration ON a_compta.proposition_chat (societe_id, expire_le);
