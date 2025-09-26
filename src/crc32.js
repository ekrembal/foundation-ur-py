/**
 * crc32.js
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

import { MAX_UINT32 } from './constants.js';

let TABLE = null;

function bitLength(n) {
  return n.toString(2).length;
}

function crc32(buf) {
  // Lazily instantiate CRC table
  if (TABLE === null) {
    TABLE = new Array(256);

    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c % 2 === 0) ? (c >>> 1) : (0xEDB88320 ^ (c >>> 1));
      }
      TABLE[i] = c >>> 0; // Convert to unsigned 32-bit
    }
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = ((crc >>> 8) ^ TABLE[(crc ^ buf[i]) & 0xFF]) >>> 0;
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function crc32n(buf) {
  const n = crc32(buf);
  const result = new Uint8Array(4);
  result[0] = (n >> 24) & 0xFF;
  result[1] = (n >> 16) & 0xFF;
  result[2] = (n >> 8) & 0xFF;
  result[3] = n & 0xFF;
  return result;
}

export { crc32, crc32n, bitLength };
