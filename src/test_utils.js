/**
 * test_utils.js
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

import { Xoshiro256 } from './xoshiro256.js';
import { CBOREncoder } from './cbor_lite.js';
import { UR } from './ur.js';

export async function makeMessage(length, seed = "Wolf") {
  const rng = await Xoshiro256.fromString(seed);
  return rng.nextData(length);
}

export async function makeMessageUr(length, seed = "Wolf") {
  const message = await makeMessage(length, seed);
  const encoder = new CBOREncoder();
  encoder.encodeBytes(message);
  
  return new UR("bytes", encoder.getBytes());
}
