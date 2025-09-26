/**
 * ur.js
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

import { isUrType } from './utils.js';

export class InvalidType extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidType';
  }
}

export class UR {
  constructor(type, cbor) {
    if (!isUrType(type)) {
      throw new InvalidType('Invalid UR type');
    }

    this.type = type;
    this.cbor = cbor;
  }

  equals(obj) {
    if (obj === null || obj === undefined) {
      return false;
    }
    return this.type === obj.type && 
           this.cbor.length === obj.cbor.length &&
           this.cbor.every((val, i) => val === obj.cbor[i]);
  }
}
