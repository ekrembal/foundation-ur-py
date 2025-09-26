/**
 * fountain_utils.js
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

import { RandomSampler } from './random_sampler.js';
import { intToBytes } from './utils.js';
import { Xoshiro256 } from './xoshiro256.js';

// Fisher-Yates shuffle
export function shuffled(items, rng) {
  const remaining = [...items];
  const result = [];
  while (remaining.length > 0) {
    const index = rng.nextInt(0, remaining.length - 1);
    const item = remaining.splice(index, 1)[0];
    result.push(item);
  }
  return result;
}

export function chooseDegree(seqLen, rng) {
  const degreeProbabilities = [];
  for (let i = 1; i <= seqLen; i++) {
    degreeProbabilities.push(1.0 / i);
  }

  const degreeChooser = new RandomSampler(degreeProbabilities);
  return degreeChooser.next(() => rng.nextDouble()) + 1;
}

export async function chooseFragments(seqNum, seqLen, checksum) {
  // The first `seqLen` parts are the "pure" fragments, not mixed with any
  // others. This means that if you only generate the first `seqLen` parts,
  // then you have all the parts you need to decode the message.
  if (seqNum <= seqLen) {
    return new Set([seqNum - 1]);
  } else {
    const seqNumBytes = intToBytes(seqNum);
    const checksumBytes = intToBytes(checksum);
    const seed = new Uint8Array(seqNumBytes.length + checksumBytes.length);
    seed.set(seqNumBytes);
    seed.set(checksumBytes, seqNumBytes.length);
    
    const rng = await Xoshiro256.fromBytes(seed);
    const degree = chooseDegree(seqLen, rng);
    const indexes = [];

    for (let i = 0; i < seqLen; i++) {
      indexes.push(i);
    }
    const shuffledIndexes = shuffled(indexes, rng);
    return new Set(shuffledIndexes.slice(0, degree));
  }
}

export function contains(setOrList, el) {
  return setOrList.has ? setOrList.has(el) : setOrList.includes(el);
}

export function isStrictSubset(a, b) {
  if (a instanceof Set && b instanceof Set) {
    return a.size < b.size && [...a].every(x => b.has(x));
  }
  return false;
}

export function setDifference(a, b) {
  if (a instanceof Set && b instanceof Set) {
    return new Set([...a].filter(x => !b.has(x)));
  }
  return new Set();
}
