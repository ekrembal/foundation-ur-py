/**
 * random_sampler.js
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

export class RandomSampler {
  constructor(probs) {
    for (const p of probs) {
      if (p <= 0) {
        throw new Error('Probability must be positive');
      }
    }

    // Normalize given probabilities
    const total = probs.reduce((sum, p) => sum + p, 0);
    if (total <= 0) {
      throw new Error('Total probability must be positive');
    }

    const n = probs.length;

    const P = [];
    for (const p of probs) {
      P.push((p * n) / total);
    }

    const S = [];
    const L = [];

    // Set separate index lists for small and large probabilities:
    for (let i = n - 1; i >= 0; i--) {
      // at variance from Schwarz, we reverse the index order
      if (P[i] < 1) {
        S.push(i);
      } else {
        L.push(i);
      }
    }

    // Work through index lists
    const _probs = new Array(n).fill(0);
    const _aliases = new Array(n).fill(0);

    while (S.length > 0 && L.length > 0) {
      const a = S.pop(); // Schwarz's l
      const g = L.pop(); // Schwarz's g
      _probs[a] = P[a];
      _aliases[a] = g;
      P[g] += P[a] - 1;
      if (P[g] < 1) {
        S.push(g);
      } else {
        L.push(g);
      }
    }

    while (L.length > 0) {
      _probs[L.pop()] = 1;
    }

    while (S.length > 0) {
      // can only happen through numeric instability
      _probs[S.pop()] = 1;
    }

    this.probs = _probs;
    this.aliases = _aliases;
  }

  next(rngFunc) {
    const r1 = rngFunc();
    const r2 = rngFunc();
    const n = this.probs.length;
    const i = Math.floor(n * r1);
    return (r2 < this.probs[i]) ? i : this.aliases[i];
  }
}
