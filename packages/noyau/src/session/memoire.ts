import { verifierSession, type PortSession, type Session } from './port.js';

export function creerFauxSessions(sessions: Readonly<Record<string, Session>>): PortSession {
  const table = new Map<string, Session>(
    Object.entries(sessions).map(([reference, brut]) => [reference, verifierSession(brut)]),
  );
  return {
    async lire(reference) {
      const trouvee = reference === null ? undefined : table.get(reference);
      return trouvee === undefined ? null : verifierSession(trouvee);
    },
  };
}
