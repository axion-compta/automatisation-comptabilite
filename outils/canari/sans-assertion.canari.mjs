// Canari de garde:tests : ce fichier est FAUTIF À DESSEIN. Il n'est jamais lancé comme test (nom sans « .test. »).
// Le test de la garde exige que garde:tests le déclare rouge ; si la garde devient aveugle, ce test échoue.
import { test } from 'node:test';

test('canari : aucune assertion', () => {
  const x = 1 + 1;
  void x;
});
