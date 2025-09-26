/**
 * ur_decoder.js
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

import { UR } from './ur.js';
import { Part as FountainEncoderPart } from './fountain_encoder.js';
import { FountainDecoder } from './fountain_decoder.js';
import { Bytewords, Bytewords_Style_minimal } from './bytewords.js';
import { dropFirst, isUrType } from './utils.js';

export class InvalidScheme extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidScheme';
  }
}

export class InvalidType extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidType';
  }
}

export class InvalidPathLength extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidPathLength';
  }
}

export class InvalidSequenceComponent extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidSequenceComponent';
  }
}

export class InvalidFragment extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidFragment';
  }
}

export class URDecoder {
  constructor() {
    this.fountainDecoder = new FountainDecoder();
    this.expectedType = null;
    this.result = null;
  }

  static decode(str) {
    const [type, components] = URDecoder.parse(str);
    if (components.length === 0) {
      throw new InvalidPathLength('No components found');
    }

    const body = components[0];
    return URDecoder.decodeByType(type, body);
  }

  static decodeByType(type, body) {
    const cbor = Bytewords.decode(Bytewords_Style_minimal, body);
    return new UR(type, cbor);
  }

  static parse(str) {
    // Don't consider case
    const lowered = str.toLowerCase();

    // Validate URI scheme
    if (!lowered.startsWith('ur:')) {
      throw new InvalidScheme('Invalid scheme');
    }

    const path = dropFirst(lowered, 3);

    // Split the remainder into path components
    const components = path.split('/');

    // Make sure there are at least two path components
    if (components.length < 2) {
      throw new InvalidPathLength('Not enough path components');
    }

    // Validate the type
    const type = components[0];
    if (!isUrType(type)) {
      throw new InvalidType('Invalid UR type');
    }

    const comps = components.slice(1); // Don't include the ur type
    return [type, comps];
  }

  static parseSequenceComponent(str) {
    try {
      const comps = str.split('-');
      if (comps.length !== 2) {
        throw new InvalidSequenceComponent('Invalid sequence format');
      }
      const seqNum = parseInt(comps[0], 10);
      const seqLen = parseInt(comps[1], 10);
      if (seqNum < 1 || seqLen < 1) {
        throw new InvalidSequenceComponent('Invalid sequence numbers');
      }
      return [seqNum, seqLen];
    } catch (err) {
      throw new InvalidSequenceComponent('Failed to parse sequence component');
    }
  }

  validatePart(type) {
    if (this.expectedType === null) {
      if (!isUrType(type)) {
        return false;
      }
      this.expectedType = type;
      return true;
    } else {
      return type === this.expectedType;
    }
  }

  async receivePart(str) {
    try {
      // Don't process the part if we're already done
      if (this.result !== null) {
        return false;
      }

      // Don't continue if this part doesn't validate
      const [type, components] = URDecoder.parse(str);
      if (!this.validatePart(type)) {
        return false;
      }

      // If this is a single-part UR then we're done
      if (components.length === 1) {
        const body = components[0];
        this.result = URDecoder.decodeByType(type, body);
        return true;
      }

      // Multi-part URs must have two path components: seq/fragment
      if (components.length !== 2) {
        throw new InvalidPathLength('Invalid multi-part UR format');
      }
      const seq = components[0];
      const fragment = components[1];

      // Parse the sequence component and the fragment, and make sure they agree.
      const [seqNum, seqLen] = URDecoder.parseSequenceComponent(seq);
      const cbor = Bytewords.decode(Bytewords_Style_minimal, fragment);
      const part = FountainEncoderPart.fromCbor(cbor);
      if (seqNum !== part.seqNum || seqLen !== part.seqLen) {
        return false;
      }

      // Process the part
      if (!(await this.fountainDecoder.receivePart(part))) {
        return false;
      }

      if (this.fountainDecoder.isSuccess()) {
        this.result = new UR(type, this.fountainDecoder.resultMessage());
      } else if (this.fountainDecoder.isFailure()) {
        this.result = this.fountainDecoder.resultError();
      }

      return true;
    } catch (err) {
      return false;
    }
  }

  expectedType() {
    return this.expectedType;
  }

  expectedPartCount() {
    return this.fountainDecoder.expectedPartCount();
  }

  receivedPartIndexes() {
    return this.fountainDecoder.receivedPartIndexes;
  }

  lastPartIndexes() {
    return this.fountainDecoder.lastPartIndexes;
  }

  processedPartsCount() {
    return this.fountainDecoder.processedPartsCount;
  }

  estimatedPercentComplete() {
    return this.fountainDecoder.estimatedPercentComplete();
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
}
