/**
 * index.js
 * 
 * Main entry point for the Foundation UR JavaScript library
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

// Core UR classes
export { UR, InvalidType } from './ur.js';
export { UREncoder } from './ur_encoder.js';
export { URDecoder, InvalidScheme, InvalidType as URDecoderInvalidType, InvalidPathLength, InvalidSequenceComponent, InvalidFragment } from './ur_decoder.js';

// Fountain code classes
export { FountainEncoder, Part, InvalidHeader } from './fountain_encoder.js';
export { FountainDecoder, InvalidPart, InvalidChecksum } from './fountain_decoder.js';

// Utility classes
export { Bytewords, Bytewords_Style_standard, Bytewords_Style_uri, Bytewords_Style_minimal } from './bytewords.js';
export { CBOREncoder, CBORDecoder } from './cbor_lite.js';
export { Xoshiro256 } from './xoshiro256.js';
export { RandomSampler } from './random_sampler.js';

// Utility functions
export { 
  crc32Bytes, 
  crc32Int, 
  dataToHex, 
  intToBytes, 
  bytesToInt, 
  stringToBytes, 
  isUrType, 
  partition, 
  split, 
  joinLists, 
  joinBytes, 
  xorInto, 
  xorWith, 
  takeFirst, 
  dropFirst 
} from './utils.js';

// Fountain utilities
export { 
  shuffled, 
  chooseDegree, 
  chooseFragments, 
  contains, 
  isStrictSubset, 
  setDifference 
} from './fountain_utils.js';

// Constants
export { MAX_UINT32, MAX_UINT64 } from './constants.js';

// Test utilities
export { makeMessage, makeMessageUr } from './test_utils.js';

// PSBT types
export { PSBT, createPSBT, toHex, fromHex } from './psbt_types.js';
