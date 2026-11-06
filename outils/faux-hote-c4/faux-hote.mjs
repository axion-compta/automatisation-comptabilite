// Faux hote : charge un module C4, migre une base simulee, rejoue le jeu d'essai.
const INTERDITS = ['execute', 'grant', 'security definer'];

export function creerBase() {
  return { appliquees: [] };
}

export function instructionRefusee(instruction) {
  const bas = String(instruction).toLowerCase();
  return INTERDITS.find((mot) => bas.includes(mot)) ?? null;
}

// Idempotent par registre des instructions deja appliquees.
export function migrer(module, base) {
  const instructions = module.migrer();
  for (const ins of instructions) {
    const mot = instructionRefusee(ins);
    if (mot !== null) throw new Error(`Instruction refusee (${mot}) : ${ins}`);
  }
  let appliquees = 0;
  for (const ins of instructions) {
    if (!base.appliquees.includes(ins)) {
      base.appliquees.push(ins);
      appliquees += 1;
    }
  }
  return { appliquees };
}

export function rejouer(module, executer = () => 'ok') {
  if (module.actif !== true) return { actions: 0, resultats: [], raison: 'interrupteur ferme' };
  const resultats = module.jeuEssai.map((c) => ({ id: c.id, sortie: executer(c) }));
  return { actions: resultats.length, resultats };
}

// Verifie que chaque cas du jeu est bien forme, sans agir (interrupteur ferme).
export function verifierJeu(module) {
  return module.jeuEssai.every((c) => typeof c.id === 'string' && typeof c.type === 'string');
}
