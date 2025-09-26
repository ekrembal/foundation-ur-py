/**
 * xoshiro256.js
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

import { stringToBytes, intToBytes } from './utils.js';
import { MAX_UINT64 } from './constants.js';

// Original Info:
// Written in 2018 by David Blackman and Sebastiano Vigna (vigna@acm.org)

// To the extent possible under law, the author has dedicated all copyright
// and related and neighboring rights to this software to the public domain
// worldwide. This software is distributed without any warranty.

// See <http://creativecommons.org/publicdomain/zero/1.0/>.

// This is xoshiro256** 1.0, one of our all-purpose, rock-solid
// generators. It has excellent (sub-ns) speed, a state (256 bits) that is
// large enough for any parallel application, and it passes all tests we
// are aware of.

// For generating just floating-point numbers, xoshiro256+ is even faster.

// The state must be seeded so that it is not everywhere zero. If you have
// a 64-bit seed, we suggest to seed a splitmix64 generator and use its
// output to fill s.

function rotl(x, k) {
  return ((x << k) | (x >>> (64 - k))) & MAX_UINT64;
}

const JUMP = [0x180ec6d33cfd0aba, 0xd5a61266f0c9392c, 0xa9582618e03fc9aa, 0x39abdc4529b1661c];
const LONG_JUMP = [0x76e15d3efefdcbbf, 0xc5004e441c522fb3, 0x77710069854ee241, 0x39109bb02acbe635];

export class Xoshiro256 {
  constructor(arr = null) {
    this.s = [0, 0, 0, 0];
    if (arr !== null) {
      this.s[0] = arr[0];
      this.s[1] = arr[1];
      this.s[2] = arr[2];
      this.s[3] = arr[3];
    }
  }

  _setS(arr) {
    for (let i = 0; i < 4; i++) {
      const o = i * 8;
      let v = 0;
      for (let n = 0; n < 8; n++) {
        v = (v << 8) | arr[o + n];
      }
      this.s[i] = v;
    }
  }

  async _hashThenSetS(buf) {
    const digest = await crypto.subtle.digest('SHA-256', buf);
    this._setS(new Uint8Array(digest));
  }

  static fromInt8Array(arr) {
    const x = new Xoshiro256();
    x._setS(arr);
    return x;
  }

  static async fromBytes(buf) {
    const x = new Xoshiro256();
    await x._hashThenSetS(buf);
    return x;
  }

  static async fromCrc32(crc32) {
    const x = new Xoshiro256();
    const buf = intToBytes(crc32);
    await x._hashThenSetS(buf);
    return x;
  }

  static async fromString(s) {
    const x = new Xoshiro256();
    const buf = stringToBytes(s);
    await x._hashThenSetS(buf);
    return x;
  }

  next() {
    const result = (rotl((this.s[1] * 5) & MAX_UINT64, 7) * 9) & MAX_UINT64;
    const t = (this.s[1] << 17) & MAX_UINT64;

    this.s[2] ^= this.s[0];
    this.s[3] ^= this.s[1];
    this.s[1] ^= this.s[2];
    this.s[0] ^= this.s[3];

    this.s[2] ^= t;

    this.s[3] = rotl(this.s[3], 45) & MAX_UINT64;

    return result;
  }

  nextDouble() {
    const m = MAX_UINT64 + 1;
    const nxt = this.next();
    return nxt / m;
  }

  nextInt(low, high) {
    return Math.floor(this.nextDouble() * (high - low + 1) + low) & MAX_UINT64;
  }

  nextByte() {
    return this.nextInt(0, 255);
  }

  nextData(count) {
    const result = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      result[i] = this.nextByte();
    }
    return result;
  }

  jump() {
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    
    for (let i = 0; i < JUMP.length; i++) {
      for (let b = 0; b < 64; b++) {
        if (JUMP[i] & (1 << b)) {
          s0 ^= this.s[0];
          s1 ^= this.s[1];
          s2 ^= this.s[2];
          s3 ^= this.s[3];
        }
        this.next();
      }
    }

    this.s[0] = s0;
    this.s[1] = s1;
    this.s[2] = s2;
    this.s[3] = s3;
  }

  longJump() {
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    
    for (let i = 0; i < LONG_JUMP.length; i++) {
      for (let b = 0; b < 64; b++) {
        if (LONG_JUMP[i] & (1 << b)) {
          s0 ^= this.s[0];
          s1 ^= this.s[1];
          s2 ^= this.s[2];
          s3 ^= this.s[3];
        }
        this.next();
      }
    }

    this.s[0] = s0;
    this.s[1] = s1;
    this.s[2] = s2;
    this.s[3] = s3;
  }
}
