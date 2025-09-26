/**
 * utils.js
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

import { crc32, crc32n } from './crc32.js';

export function crc32Bytes(buf) {
  const checksum = crc32n(buf);
  return checksum;
}

export function crc32Int(buf) {
  return crc32(buf);
}

export function dataToHex(buf) {
  return Array.from(buf).map(x => x.toString(16).padStart(2, '0')).join('');
}

export function intToBytes(n) {
  const result = new Uint8Array(4);
  result[0] = (n >> 24) & 0xFF;
  result[1] = (n >> 16) & 0xFF;
  result[2] = (n >> 8) & 0xFF;
  result[3] = n & 0xFF;
  return result;
}

export function bytesToInt(buf) {
  return (buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3];
}

export function stringToBytes(s) {
  return new TextEncoder().encode(s);
}

export function isUrType(ch) {
  if (ch >= 'a' && ch <= 'z') {
    return true;
  }
  if (ch >= '0' && ch <= '9') {
    return true;
  }
  if (ch === '-') {
    return true;
  }
  return false;
}

export function partition(s, n) {
  const result = [];
  for (let i = 0; i < s.length; i += n) {
    result.push(s.slice(i, i + n));
  }
  return result;
}

// Split the given sequence into two parts returned in an array
// The first entry in the array has the first `count` values.
// The second entry in the array has the remaining values.
export function split(buf, count) {
  return [buf.slice(0, count), buf.slice(count)];
}

export function joinLists(lists) {
  return lists.flat();
}

export function joinBytes(listOfBa) {
  const totalLength = listOfBa.reduce((sum, ba) => sum + ba.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const ba of listOfBa) {
    result.set(ba, offset);
    offset += ba.length;
  }
  return result;
}

export function xorInto(target, source) {
  const count = target.length;
  if (count !== source.length) {
    throw new Error('Must be the same length');
  }
  for (let i = 0; i < count; i++) {
    target[i] ^= source[i];
  }
}

export function xorWith(a, b) {
  const target = new Uint8Array(a);
  xorInto(target, b);
  return target;
}

export function takeFirst(s, count) {
  return s.slice(0, count);
}

export function dropFirst(s, count) {
  return s.slice(count);
}
