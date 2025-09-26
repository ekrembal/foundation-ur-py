/**
 * ur_encoder.js
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

import { FountainEncoder } from './fountain_encoder.js';
import { Bytewords, Bytewords_Style_minimal } from './bytewords.js';

export class UREncoder {
  // Start encoding a (possibly) multi-part UR.
  constructor(ur, maxFragmentLen, firstSeqNum = 0, minFragmentLen = 10) {
    this.ur = ur;
    this.fountainEncoder = new FountainEncoder(ur.cbor, maxFragmentLen, firstSeqNum, minFragmentLen);
  }

  // Encode a single-part UR.
  static encode(ur) {
    const body = Bytewords.encode(Bytewords_Style_minimal, ur.cbor);
    return UREncoder.encodeUr([ur.type, body]);
  }

  lastPartIndexes() {
    return this.fountainEncoder.lastPartIndexes();
  }

  // `True` if the minimal number of parts to transmit the message have been
  // generated. Parts generated when this is `true` will be fountain codes
  // containing various mixes of the part data.
  isComplete() {
    return this.fountainEncoder.isComplete();
  }

  // `True` if this UR can be contained in a single part. If `True`, repeated
  // calls to `next_part()` will all return the same single-part UR.
  isSinglePart() {
    return this.fountainEncoder.isSinglePart();
  }

  async nextPart() {
    const part = await this.fountainEncoder.nextPart();
    if (this.isSinglePart()) {
      return UREncoder.encode(this.ur);
    } else {
      return UREncoder.encodePart(this.ur.type, part);
    }
  }

  static encodePart(type, part) {
    const seq = `${part.seqNum}-${part.seqLen}`;
    const body = Bytewords.encode(Bytewords_Style_minimal, part.cbor());
    const result = UREncoder.encodeUr([type, seq, body]);
    return result;
  }

  static encodeUri(scheme, pathComponents) {
    const path = pathComponents.join('/');
    return `${scheme}:${path}`;
  }

  static encodeUr(pathComponents) {
    return UREncoder.encodeUri('ur', pathComponents);
  }
}
