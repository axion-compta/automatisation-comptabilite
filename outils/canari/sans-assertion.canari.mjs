// Canaris de garde:tests : FAUTIFS À DESSEIN, jamais lancés ; le test de la garde exige qu'elle les déclare rouges.
import { test } from 'node:test';
test('canari : aucune assertion', () => {
  void (1 + 1);
});
