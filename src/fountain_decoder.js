/**
 * fountain_decoder.js
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

import { chooseFragments, contains, isStrictSubset, setDifference } from './fountain_utils.js';
import { joinLists, joinBytes, crc32Int, xorWith, takeFirst } from './utils.js';

export class InvalidPart extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidPart';
  }
}

export class InvalidChecksum extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidChecksum';
  }
}

export class FountainDecoder {
  // Helper function to convert a Set to a string key for use in Maps
  static setToKey(set) {
    return [...set].sort((a, b) => a - b).join(',');
  }

  static Part = class {
    constructor(indexes, data) {
      this.indexes = new Set(indexes);
      this.data = data;
    }

    static async fromEncoderPart(p) {
      const indexes = await chooseFragments(p.seqNum, p.seqLen, p.checksum);
      return new this(indexes, new Uint8Array(p.data));
    }

    indexes() {
      return this.indexes;
    }

    data() {
      return this.data;
    }

    isSimple() {
      return this.indexes.size === 1;
    }

    index() {
      // TODO: Not efficient
      return [...this.indexes][0];
    }
    
    // Get a string key for this part's indexes
    indexKey() {
      return FountainDecoder.setToKey(this.indexes);
    }
  };

  constructor() {
    this.receivedPartIndexes = new Set();
    this.lastPartIndexes = null;
    this.processedPartsCount = 0;
    this.result = null;
    this.expectedPartIndexes = null;
    this.expectedFragmentLen = null;
    this.expectedMessageLen = null;
    this.expectedChecksum = null;
    this.simpleParts = new Map();
    this.mixedParts = new Map();
    this.queuedParts = [];
  }

  expectedPartCount() {
    return this.expectedPartIndexes ? this.expectedPartIndexes.size : 0;
  }

  isSuccess() {
    const result = this.result;
    return result && !(result instanceof Error);
  }

  isFailure() {
    const result = this.result;
    return result instanceof Error;
  }

  isComplete() {
    return this.result !== null;
  }

  resultMessage() {
    return this.result;
  }

  resultError() {
    return this.result;
  }

  estimatedPercentComplete() {
    if (this.isComplete()) {
      return 1;
    }
    if (this.expectedPartIndexes === null) {
      return 0;
    }
    const estimatedInputParts = this.expectedPartCount() * 1.75;
    return Math.min(0.99, this.processedPartsCount / estimatedInputParts);
  }

  async receivePart(encoderPart) {
    // Don't process the part if we're already done
    if (this.isComplete()) {
      return false;
    }

    // Don't continue if this part doesn't validate
    if (!this.validatePart(encoderPart)) {
      return false;
    }

    // Add this part to the queue
    const p = await FountainDecoder.Part.fromEncoderPart(encoderPart);
    this.lastPartIndexes = p.indexes;
    this.enqueue(p);

    // Process the queue until we're done or the queue is empty
    while (!this.isComplete() && this.queuedParts.length !== 0) {
      this.processQueueItem();
    }

    // Keep track of how many parts we've processed
    this.processedPartsCount += 1;

    return true;
  }

  // Join all the fragments of a message together, throwing away any padding
  static joinFragments(fragments, messageLen) {
    const message = joinBytes(fragments);
    return takeFirst(message, messageLen);
  }

  enqueue(p) {
    this.queuedParts.push(p);
  }

  processQueueItem() {
    const part = this.queuedParts.shift();

    if (part.isSimple()) {
      this.processSimplePart(part);
    } else {
      this.processMixedPart(part);
    }
  }

  reduceMixedBy(p) {
    // Reduce all the current mixed parts by the given part
    const reducedParts = [];
    for (const value of this.mixedParts.values()) {
      reducedParts.push(this.reducePartByPart(value, p));
    }

    // Collect all the remaining mixed parts
    const newMixed = new Map();
    for (const reducedPart of reducedParts) {
      // If this reduced part is now simple
      if (reducedPart.isSimple()) {
        // Add it to the queue
        this.enqueue(reducedPart);
      } else {
        // Otherwise, add it to the dict of current mixed parts
        newMixed.set(reducedPart.indexKey(), reducedPart);
      }
    }

    this.mixedParts = newMixed;
  }

  reducePartByPart(a, b) {
    // If the fragments mixed into `b` are a strict (proper) subset of those in `a`...
    if (isStrictSubset(b.indexes, a.indexes)) {
      // The new fragments in the revised part are `a` - `b`.
      const newIndexes = setDifference(a.indexes, b.indexes);
      // The new data in the revised part are `a` XOR `b`
      const newData = xorWith(new Uint8Array(a.data), b.data);
      return new FountainDecoder.Part(newIndexes, newData);
    } else {
      // `a` is not reducable by `b`, so return a
      return a;
    }
  }

  processSimplePart(p) {
    // Don't process duplicate parts
    const fragmentIndex = p.index();
    if (contains(this.receivedPartIndexes, fragmentIndex)) {
      return;
    }

    // Record this part
    this.simpleParts.set(p.indexKey(), p);
    this.receivedPartIndexes.add(fragmentIndex);

    // If we've received all the parts
    if (this.receivedPartIndexes.size === this.expectedPartIndexes.size &&
        [...this.receivedPartIndexes].every(x => this.expectedPartIndexes.has(x))) {
      // Reassemble the message from its fragments
      const sortedParts = Array.from(this.simpleParts.values());
      sortedParts.sort((a, b) => a.index() - b.index());

      const fragments = [];
      for (const part of sortedParts) {
        fragments.push(part.data);
      }

      const message = FountainDecoder.joinFragments(fragments, this.expectedMessageLen);

      // Verify the message checksum and note success or failure
      const checksum = crc32Int(message);
      // Compare as unsigned 32-bit integers to handle signed/unsigned mismatch
      if ((checksum >>> 0) === (this.expectedChecksum >>> 0)) {
        this.result = new Uint8Array(message);
      } else {
        this.result = new InvalidChecksum('Checksum mismatch');
      }
    } else {
      // Reduce all the mixed parts by this part
      this.reduceMixedBy(p);
    }
  }

  processMixedPart(p) {
    // Don't process duplicate parts
    const pKey = p.indexKey();
    if (this.mixedParts.has(pKey)) {
      return;
    }

    // Reduce this part by all the others
    let p2 = p; // TODO: Does this need to make a copy of p?
    for (const r of this.simpleParts.values()) {
      p2 = this.reducePartByPart(p2, r);
    }

    for (const r of this.mixedParts.values()) {
      p2 = this.reducePartByPart(p2, r);
    }

    // If the part is now simple
    if (p2.isSimple()) {
      // Add it to the queue
      this.enqueue(p2);
    } else {
      // Reduce all the mixed parts by this one
      this.reduceMixedBy(p2);
      // Record this new mixed part
      this.mixedParts.set(p2.indexKey(), p2);
    }
  }

  validatePart(p) {
    // If this is the first part we've seen
    if (this.expectedPartIndexes === null) {
      // Record the things that all the other parts we see will have to match to be valid.
      this.expectedPartIndexes = new Set();
      for (let i = 0; i < p.seqLen; i++) {
        this.expectedPartIndexes.add(i);
      }

      this.expectedMessageLen = p.messageLen;
      this.expectedChecksum = p.checksum;
      this.expectedFragmentLen = p.data.length;
    } else {
      // If this part's values don't match the first part's values, throw away the part
      if (this.expectedPartCount() !== p.seqLen) {
        return false;
      }
      if (this.expectedMessageLen !== p.messageLen) {
        return false;
      }
      if (this.expectedChecksum !== p.checksum) {
        return false;
      }
      if (this.expectedFragmentLen !== p.data.length) {
        return false;
      }
    }

    // This part should be processed
    return true;
  }

  // debugging
  indexesToString(indexes) {
    const i = [...indexes].sort((a, b) => a - b);
    return `[${i.join(', ')}]`;
  }

  resultDescription() {
    if (this.result === null) {
      return 'None';
    }

    if (this.isSuccess()) {
      return `${this.result.length} bytes`;
    } else if (this.isFailure()) {
      return `Exception: ${this.result}`;
    } else {
      throw new Error('Invalid result state');
    }
  }

  printPart(p) {
    console.log(`part indexes: ${this.indexesToString(p.indexes)}`);
  }

  printPartEnd() {
    const expected = this.expectedPartIndexes ? this.expectedPartCount() : 'None';
    const percent = Math.round(this.estimatedPercentComplete() * 100);
    console.log(`processed: ${this.processedPartsCount}, expected: ${expected}, received: ${this.receivedPartIndexes.size}, percent: ${percent}%`);
  }

  printState() {
    const parts = this.expectedPartIndexes ? this.expectedPartCount() : 'None';
    const received = this.indexesToString(this.receivedPartIndexes);
    const mixed = [];
    for (const [indexes, p] of this.mixedParts) {
      mixed.push(this.indexesToString(indexes));
    }

    const mixedS = `[${mixed.join(', ')}]`;
    const queued = this.queuedParts.length;
    const res = this.resultDescription();
    console.log(`parts: ${parts}, received: ${received}, mixed: ${mixedS}, queued: ${queued}, result: ${res}`);
  }
}
