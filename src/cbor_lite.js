/**
 * cbor_lite.js
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

import { bitLength } from './crc32.js';

// From: https://bitbucket.org/isode/cbor-lite/raw/6c770624a97e3229e3f200be092c1b9c70a60ef1/include/cbor-lite/codec.h

// This file is part of CBOR-lite which is copyright Isode Limited
// and others and released under a MIT license. For details, see the
// COPYRIGHT.md file in the top-level folder of the CBOR-lite software
// distribution.

export const Flag_None = 0;
export const Flag_Require_Minimal_Encoding = 1;

export const Tag_Major_unsignedInteger = 0;
export const Tag_Major_negativeInteger = 1 << 5;
export const Tag_Major_byteString = 2 << 5;
export const Tag_Major_textString = 3 << 5;
export const Tag_Major_array = 4 << 5;
export const Tag_Major_map = 5 << 5;
export const Tag_Major_semantic = 6 << 5;
export const Tag_Major_floatingPoint = 7 << 5;
export const Tag_Major_simple = 7 << 5;
export const Tag_Major_mask = 0xe0;

export const Tag_Minor_length1 = 24;
export const Tag_Minor_length2 = 25;
export const Tag_Minor_length4 = 26;
export const Tag_Minor_length8 = 27;

export const Tag_Minor_false = 20;
export const Tag_Minor_true = 21;
export const Tag_Minor_null = 22;
export const Tag_Minor_undefined = 23;
export const Tag_Minor_half_float = 25;
export const Tag_Minor_singleFloat = 26;
export const Tag_Minor_doubleFloat = 27;

export const Tag_Minor_dateTime = 0;
export const Tag_Minor_epochDateTime = 1;
export const Tag_Minor_positiveBignum = 2;
export const Tag_Minor_negativeBignum = 3;
export const Tag_Minor_decimalFraction = 4;
export const Tag_Minor_bigFloat = 5;
export const Tag_Minor_convertBase64Url = 21;
export const Tag_Minor_convertBase64 = 22;
export const Tag_Minor_convertBase16 = 23;
export const Tag_Minor_cborEncodedData = 24;
export const Tag_Minor_uri = 32;
export const Tag_Minor_base64Url = 33;
export const Tag_Minor_base64 = 34;
export const Tag_Minor_regex = 35;
export const Tag_Minor_mimeMessage = 36;
export const Tag_Minor_selfDescribeCbor = 55799;
export const Tag_Minor_mask = 0x1f;
export const Tag_Undefined = Tag_Major_semantic + Tag_Minor_undefined;

function getByteLength(value) {
  if (value < 24) {
    return 0;
  }
  return Math.ceil(bitLength(value) / 8);
}

export class CBOREncoder {
  constructor() {
    this.buf = new Uint8Array(0);
  }

  getBytes() {
    return this.buf;
  }

  encodeTagAndAdditional(tag, additional) {
    const newBuf = new Uint8Array(this.buf.length + 1);
    newBuf.set(this.buf);
    newBuf[this.buf.length] = tag + additional;
    this.buf = newBuf;
    return 1;
  }

  encodeTagAndValue(tag, value) {
    const length = getByteLength(value);

    // 5-8 bytes required, use 8 bytes
    if (length >= 5 && length <= 8) {
      this.encodeTagAndAdditional(tag, Tag_Minor_length8);
      const newBuf = new Uint8Array(this.buf.length + 8);
      newBuf.set(this.buf);
      newBuf[this.buf.length] = (value >> 56) & 0xff;
      newBuf[this.buf.length + 1] = (value >> 48) & 0xff;
      newBuf[this.buf.length + 2] = (value >> 40) & 0xff;
      newBuf[this.buf.length + 3] = (value >> 32) & 0xff;
      newBuf[this.buf.length + 4] = (value >> 24) & 0xff;
      newBuf[this.buf.length + 5] = (value >> 16) & 0xff;
      newBuf[this.buf.length + 6] = (value >> 8) & 0xff;
      newBuf[this.buf.length + 7] = value & 0xff;
      this.buf = newBuf;
    }
    // 3-4 bytes required, use 4 bytes
    else if (length === 3 || length === 4) {
      this.encodeTagAndAdditional(tag, Tag_Minor_length4);
      const newBuf = new Uint8Array(this.buf.length + 4);
      newBuf.set(this.buf);
      newBuf[this.buf.length] = (value >> 24) & 0xff;
      newBuf[this.buf.length + 1] = (value >> 16) & 0xff;
      newBuf[this.buf.length + 2] = (value >> 8) & 0xff;
      newBuf[this.buf.length + 3] = value & 0xff;
      this.buf = newBuf;
    }
    else if (length === 2) {
      this.encodeTagAndAdditional(tag, Tag_Minor_length2);
      const newBuf = new Uint8Array(this.buf.length + 2);
      newBuf.set(this.buf);
      newBuf[this.buf.length] = (value >> 8) & 0xff;
      newBuf[this.buf.length + 1] = value & 0xff;
      this.buf = newBuf;
    }
    else if (length === 1) {
      this.encodeTagAndAdditional(tag, Tag_Minor_length1);
      const newBuf = new Uint8Array(this.buf.length + 1);
      newBuf.set(this.buf);
      newBuf[this.buf.length] = value & 0xff;
      this.buf = newBuf;
    }
    else if (length === 0) {
      this.encodeTagAndAdditional(tag, value);
    }
    else {
      throw new Error(`Unsupported byte length of ${length} for value in encodeTagAndValue()`);
    }

    const encodedSize = 1 + length;
    return encodedSize;
  }

  encodeUnsigned(value) {
    return this.encodeTagAndValue(Tag_Major_unsignedInteger, value);
  }

  encodeNegative(value) {
    return this.encodeTagAndValue(Tag_Major_negativeInteger, value);
  }

  encodeInteger(value) {
    if (value >= 0) {
      return this.encodeUnsigned(value);
    } else {
      return this.encodeNegative(value);
    }
  }

  encodeBool(value) {
    return this.encodeTagAndValue(Tag_Major_simple, value ? Tag_Minor_true : Tag_Minor_false);
  }

  encodeBytes(value) {
    const length = this.encodeTagAndValue(Tag_Major_byteString, value.length);
    const newBuf = new Uint8Array(this.buf.length + value.length);
    newBuf.set(this.buf);
    newBuf.set(value, this.buf.length);
    this.buf = newBuf;
    return length + value.length;
  }

  encodeEncodedBytesPrefix(value) {
    const length = this.encodeTagAndValue(Tag_Major_semantic, Tag_Minor_cborEncodedData);
    return length + this.encodeTagAndAdditional;
  }

  encodeEncodedBytes(value) {
    const length = this.encodeTagAndValue(Tag_Major_semantic, Tag_Minor_cborEncodedData);
    return length + this.encodeBytes(value);
  }

  encodeText(value) {
    const strBytes = new TextEncoder().encode(value);
    const length = this.encodeTagAndValue(Tag_Major_textString, strBytes.length);
    const newBuf = new Uint8Array(this.buf.length + strBytes.length);
    newBuf.set(this.buf);
    newBuf.set(strBytes, this.buf.length);
    this.buf = newBuf;
    return length + strBytes.length;
  }

  encodeArraySize(value) {
    return this.encodeTagAndValue(Tag_Major_array, value);
  }

  encodeMapSize(value) {
    return this.encodeTagAndValue(Tag_Major_map, value);
  }
}

export class CBORDecoder {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }

  decodeTagAndAdditional(flags = Flag_None) {
    if (this.pos === this.buf.length) {
      throw new Error("Not enough input");
    }
    const octet = this.buf[this.pos];
    this.pos += 1;
    const tag = octet & Tag_Major_mask;
    const additional = octet & Tag_Minor_mask;
    return [tag, additional, 1];
  }

  decodeTagAndValue(flags) {
    const end = this.buf.length;

    if (this.pos === end) {
      throw new Error("Not enough input");
    }

    const [tag, additional, length] = this.decodeTagAndAdditional(flags);
    if (additional < Tag_Minor_length1) {
      const value = additional;
      return [tag, value, length];
    }

    let value = 0;
    if (additional === Tag_Minor_length8) {
      if (end - this.pos < 8) {
        throw new Error("Not enough input");
      }
      for (const shift of [56, 48, 40, 32, 24, 16, 8, 0]) {
        value |= this.buf[this.pos] << shift;
        this.pos += 1;
      }
      if ((flags & Flag_Require_Minimal_Encoding) && value === 0) {
        throw new Error("Encoding not minimal");
      }
      return [tag, value, this.pos];
    } else if (additional === Tag_Minor_length4) {
      if (end - this.pos < 4) {
        throw new Error("Not enough input");
      }
      for (const shift of [24, 16, 8, 0]) {
        value |= this.buf[this.pos] << shift;
        this.pos += 1;
      }
      if ((flags & Flag_Require_Minimal_Encoding) && value === 0) {
        throw new Error("Encoding not minimal");
      }
      return [tag, value, this.pos];
    } else if (additional === Tag_Minor_length2) {
      if (end - this.pos < 2) {
        throw new Error("Not enough input");
      }
      for (const shift of [8, 0]) {
        value |= this.buf[this.pos] << shift;
        this.pos += 1;
      }
      if ((flags & Flag_Require_Minimal_Encoding) && value === 0) {
        throw new Error("Encoding not minimal");
      }
      return [tag, value, this.pos];
    } else if (additional === Tag_Minor_length1) {
      if (end - this.pos < 1) {
        throw new Error("Not enough input");
      }
      value |= this.buf[this.pos];
      this.pos += 1;
      if ((flags & Flag_Require_Minimal_Encoding) && value === 0) {
        throw new Error("Encoding not minimal");
      }
      return [tag, value, this.pos];
    }

    throw new Error("Bad additional value");
  }

  decodeUnsigned(flags = Flag_None) {
    const [tag, value, length] = this.decodeTagAndValue(flags);
    if (tag !== Tag_Major_unsignedInteger) {
      throw new Error(`Expected Tag_Major_unsignedInteger (${Tag_Major_unsignedInteger}), but found ${tag}`);
    }
    return [value, length];
  }

  decodeNegative(flags = Flag_None) {
    const [tag, value, length] = this.decodeTagAndValue(flags);
    if (tag !== Tag_Major_negativeInteger) {
      throw new Error(`Expected Tag_Major_negativeInteger, but found ${tag}`);
    }
    return [value, length];
  }

  decodeInteger(flags = Flag_None) {
    const [tag, value, length] = this.decodeTagAndValue(flags);
    if (tag === Tag_Major_unsignedInteger) {
      return [value, length];
    } else if (tag === Tag_Major_negativeInteger) {
      return [-1 - value, length];
    }
    throw new Error("Invalid integer tag");
  }

  decodeBool(flags = Flag_None) {
    const [tag, value, length] = this.decodeTagAndValue(flags);
    if (tag === Tag_Major_simple) {
      if (value === Tag_Minor_true) {
        return [true, length];
      } else if (value === Tag_Minor_false) {
        return [false, length];
      }
      throw new Error("Not a Boolean");
    }
    throw new Error("Not Simple/Boolean");
  }

  decodeBytes(flags = Flag_None) {
    // First value is the length of the bytes that follow
    const [tag, byteLength, sizeLength] = this.decodeTagAndValue(flags);
    if (tag !== Tag_Major_byteString) {
      throw new Error("Not a byteString");
    }

    const end = this.buf.length;
    if (end - this.pos < byteLength) {
      throw new Error("Not enough input");
    }

    const value = this.buf.slice(this.pos, this.pos + byteLength);
    this.pos += byteLength;
    return [value, sizeLength + byteLength];
  }

  decodeEncodedBytesPrefix(flags = Flag_None) {
    const [tag, value, length1] = this.decodeTagAndValue(flags);
    if (tag !== Tag_Major_semantic || value !== Tag_Minor_cborEncodedData) {
      throw new Error("Not CBOR Encoded Data");
    }

    const [tag2, value2, length2] = this.decodeTagAndValue(flags);
    if (tag2 !== Tag_Major_byteString) {
      throw new Error("Not byteString");
    }

    return [tag2, value2, length1 + length2];
  }

  decodeEncodedBytes(flags = Flag_None) {
    const [tag, minorTag, tagLength] = this.decodeTagAndValue(flags);
    if (tag !== Tag_Major_semantic || minorTag !== Tag_Minor_cborEncodedData) {
      throw new Error("Not CBOR Encoded Data");
    }

    const [value, length] = this.decodeBytes(flags);
    return [value, tagLength + length];
  }

  decodeText(flags = Flag_None) {
    // First value is the length of the bytes that follow
    const [tag, byteLength, sizeLength] = this.decodeTagAndValue(flags);
    if (tag !== Tag_Major_textString) {
      throw new Error("Not a textString");
    }

    const end = this.buf.length;
    if (end - this.pos < byteLength) {
      throw new Error("Not enough input");
    }

    const value = this.buf.slice(this.pos, this.pos + byteLength);
    this.pos += byteLength;
    return [value, sizeLength + byteLength];
  }

  decodeArraySize(flags = Flag_None) {
    const [tag, value, length] = this.decodeTagAndValue(flags);

    if (tag !== Tag_Major_array) {
      throw new Error(`Expected Tag_Major_array, but found ${tag}`);
    }
    return [value, length];
  }

  decodeMapSize(flags = Flag_None) {
    const [tag, value, length] = this.decodeTagAndValue(flags);
    if (tag !== Tag_Major_map) {
      throw new Error(`Expected Tag_Major_map, but found ${tag}`);
    }
    return [value, length];
  }
}
