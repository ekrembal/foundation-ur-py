/**
 * fountain_encoder.js
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

import { CBORDecoder, CBOREncoder } from './cbor_lite.js';
import { chooseFragments } from './fountain_utils.js';
import { split, crc32Int, xorInto, dataToHex } from './utils.js';
import { MAX_UINT32, MAX_UINT64 } from './constants.js';

export class InvalidHeader extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidHeader';
  }
}

export class Part {
  constructor(seqNum, seqLen, messageLen, checksum, data) {
    this.seqNum = seqNum;
    this.seqLen = seqLen;
    this.messageLen = messageLen;
    this.checksum = checksum;
    this.data = data;
  }

  static fromCbor(cborBuf) {
    try {
      const decoder = new CBORDecoder(cborBuf);
      const [arraySize, _] = decoder.decodeArraySize();
      if (arraySize !== 5) {
        throw new InvalidHeader('Invalid array size');
      }

      const [seqNum, _1] = decoder.decodeUnsigned();
      if (seqNum > MAX_UINT64) {
        throw new InvalidHeader('seqNum too large');
      }

      const [seqLen, _2] = decoder.decodeUnsigned();
      if (seqLen > MAX_UINT64) {
        throw new InvalidHeader('seqLen too large');
      }

      const [messageLen, _3] = decoder.decodeUnsigned();
      if (messageLen > MAX_UINT64) {
        throw new InvalidHeader('messageLen too large');
      }

      const [checksum, _4] = decoder.decodeUnsigned();
      if (checksum > MAX_UINT64) {
        throw new InvalidHeader('checksum too large');
      }

      const [data, _5] = decoder.decodeBytes();

      return new Part(seqNum, seqLen, messageLen, checksum, data);
    } catch (err) {
      throw new InvalidHeader('Failed to decode part');
    }
  }

  cbor() {
    const encoder = new CBOREncoder();
    encoder.encodeArraySize(5);
    encoder.encodeInteger(this.seqNum);
    encoder.encodeInteger(this.seqLen);
    encoder.encodeInteger(this.messageLen);
    encoder.encodeInteger(this.checksum);
    encoder.encodeBytes(this.data);
    return encoder.getBytes();
  }

  seqNum() {
    return this.seqNum;
  }

  seqLen() {
    return this.seqLen;
  }

  messageLen() {
    return this.messageLen;
  }

  checksum() {
    return this.checksum;
  }

  data() {
    return this.data;
  }

  description() {
    return `seqNum:${this.seqNum}, seqLen:${this.seqLen}, messageLen:${this.messageLen}, checksum:${this.checksum}, data:${dataToHex(this.data)}`;
  }
}

export class FountainEncoder {
  constructor(message, maxFragmentLen, firstSeqNum = 0, minFragmentLen = 10) {
    if (message.length > MAX_UINT32) {
      throw new Error('Message too large');
    }
    this.messageLen = message.length;
    this.checksum = crc32Int(message);
    this.fragmentLen = FountainEncoder.findNominalFragmentLength(this.messageLen, minFragmentLen, maxFragmentLen);
    this.fragments = FountainEncoder.partitionMessage(message, this.fragmentLen);
    this.seqNum = firstSeqNum;
  }

  static findNominalFragmentLength(messageLen, minFragmentLen, maxFragmentLen) {
    if (messageLen <= 0) {
      throw new Error('Message length must be positive');
    }
    if (minFragmentLen <= 0) {
      throw new Error('Min fragment length must be positive');
    }
    if (maxFragmentLen < minFragmentLen) {
      throw new Error('Max fragment length must be >= min fragment length');
    }

    const maxFragmentCount = Math.floor(messageLen / minFragmentLen);
    let fragmentLen = null;

    for (let fragmentCount = 1; fragmentCount <= maxFragmentCount; fragmentCount++) {
      fragmentLen = Math.ceil(messageLen / fragmentCount);
      if (fragmentLen <= maxFragmentLen) {
        break;
      }
    }

    if (fragmentLen === null) {
      throw new Error('Could not find suitable fragment length');
    }
    return fragmentLen;
  }

  static partitionMessage(message, fragmentLen) {
    let remaining = new Uint8Array(message);
    const fragments = [];
    while (remaining.length !== 0) {
      const [fragment, newRemaining] = split(remaining, fragmentLen);
      const paddedFragment = new Uint8Array(fragmentLen);
      paddedFragment.set(fragment);
      // Padding is already zeros from new Uint8Array
      fragments.push(paddedFragment);
      remaining = newRemaining;
    }
    return fragments;
  }

  lastPartIndexes() {
    return this.lastPartIndexes;
  }

  seqLen() {
    return this.fragments.length;
  }

  // This becomes `true` when the minimum number of parts
  // to relay the complete message have been generated
  isComplete() {
    return this.seqNum >= this.seqLen();
  }

  // True if only a single part will be generated.
  isSinglePart() {
    return this.seqLen() === 1;
  }

  async nextPart() {
    this.seqNum += 1;
    this.seqNum = this.seqNum % MAX_UINT32; // wrap at period 2^32
    const indexes = await chooseFragments(this.seqNum, this.seqLen(), this.checksum);
    const mixed = this.mix(indexes);
    const data = new Uint8Array(mixed);
    return new Part(this.seqNum, this.seqLen(), this.messageLen, this.checksum, data);
  }

  mix(indexes) {
    const result = new Uint8Array(this.fragmentLen);
    for (const index of indexes) {
      xorInto(result, this.fragments[index]);
    }
    return result;
  }
}
