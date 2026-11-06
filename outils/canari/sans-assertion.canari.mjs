// Canari de garde:tests : FAUTIF À DESSEIN, jamais lancé (nom sans « .test. »). Le test de la garde exige qu'elle le déclare rouge.
import { test } from 'node:test';
test('canari : aucune assertion', () => {
  void (1 + 1);
});
