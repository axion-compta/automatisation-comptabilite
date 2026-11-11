import { contratLot01, lecturesParPostLot01 } from './lot-01.js';
import { contratLot02, lecturesParPostLot02 } from './lot-02.js';
import { contratLot03, lecturesParPostLot03 } from './lot-03.js';
import { contratLot04, lecturesParPostLot04 } from './lot-04.js';
import { contratLot05, lecturesParPostLot05 } from './lot-05.js';
import { contratLot06, lecturesParPostLot06 } from './lot-06.js';
import { contratLot07, lecturesParPostLot07 } from './lot-07.js';
import { contratLot08, lecturesParPostLot08 } from './lot-08.js';
import { contratLot09, lecturesParPostLot09 } from './lot-09.js';
import { contratLot10, lecturesParPostLot10 } from './lot-10.js';
import { contratLot11, lecturesParPostLot11 } from './lot-11.js';
import { contratLot12, lecturesParPostLot12 } from './lot-12.js';
import { contratLot13, lecturesParPostLot13 } from './lot-13.js';
import { contratLot14, lecturesParPostLot14 } from './lot-14.js';
import { contratLot15, lecturesParPostLot15 } from './lot-15.js';

/** Un registre par lot : chaque lot ajoute ses routes dans son fichier, sans toucher routes.ts. */
export const REGISTRES: Record<string, Record<string, unknown>> = {
  '01': contratLot01,
  '02': contratLot02,
  '03': contratLot03,
  '04': contratLot04,
  '05': contratLot05,
  '06': contratLot06,
  '07': contratLot07,
  '08': contratLot08,
  '09': contratLot09,
  '10': contratLot10,
  '11': contratLot11,
  '12': contratLot12,
  '13': contratLot13,
  '14': contratLot14,
  '15': contratLot15,
};

export const contratModules = {
  ...contratLot01,
  ...contratLot02,
  ...contratLot03,
  ...contratLot04,
  ...contratLot05,
  ...contratLot06,
  ...contratLot07,
  ...contratLot08,
  ...contratLot09,
  ...contratLot10,
  ...contratLot11,
  ...contratLot12,
  ...contratLot13,
  ...contratLot14,
  ...contratLot15,
};

/** operationId des lectures par POST déclarées par les lots. */
export const LECTURES_PAR_POST_MODULES: string[] = [
  ...lecturesParPostLot01,
  ...lecturesParPostLot02,
  ...lecturesParPostLot03,
  ...lecturesParPostLot04,
  ...lecturesParPostLot05,
  ...lecturesParPostLot06,
  ...lecturesParPostLot07,
  ...lecturesParPostLot08,
  ...lecturesParPostLot09,
  ...lecturesParPostLot10,
  ...lecturesParPostLot11,
  ...lecturesParPostLot12,
  ...lecturesParPostLot13,
  ...lecturesParPostLot14,
  ...lecturesParPostLot15,
];
