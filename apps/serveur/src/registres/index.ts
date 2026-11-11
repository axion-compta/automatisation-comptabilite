import { implementerLot01 } from './lot-01.js';
import { implementerLot02 } from './lot-02.js';
import { implementerLot03 } from './lot-03.js';
import { implementerLot04 } from './lot-04.js';
import { implementerLot05 } from './lot-05.js';
import { implementerLot06 } from './lot-06.js';
import { implementerLot07 } from './lot-07.js';
import { implementerLot08 } from './lot-08.js';
import { implementerLot09 } from './lot-09.js';
import { implementerLot10 } from './lot-10.js';
import { implementerLot11 } from './lot-11.js';
import { implementerLot12 } from './lot-12.js';
import { implementerLot13 } from './lot-13.js';
import { implementerLot14 } from './lot-14.js';
import { implementerLot15 } from './lot-15.js';
import type { OptionsModules, OptionsRouteur, OsContrat } from './types.js';

export type { OptionsApp, OptionsModules, OptionsRouteur, OsContrat } from './types.js';

/** Réunit les implémentations des quinze lots ; `tsc` exige une implémentation par clé de module du contrat. */
export function implementerModules(os: OsContrat, options: OptionsRouteur & OptionsModules) {
  return {
    ...implementerLot01(os, options),
    ...implementerLot02(os, options),
    ...implementerLot03(os, options),
    ...implementerLot04(os, options),
    ...implementerLot05(os, options),
    ...implementerLot06(os, options),
    ...implementerLot07(os, options),
    ...implementerLot08(os, options),
    ...implementerLot09(os, options),
    ...implementerLot10(os, options),
    ...implementerLot11(os, options),
    ...implementerLot12(os, options),
    ...implementerLot13(os, options),
    ...implementerLot14(os, options),
    ...implementerLot15(os, options),
  };
}
