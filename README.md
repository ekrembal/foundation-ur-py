# Foundation UR JavaScript Library

**JavaScript implementation of UR (Uniform Resources) -- ported from the [Python implementation by Foundation Devices](https://github.com/Foundation-Devices/foundation-ur-py)**

## Introduction

URs ("Uniform Resources") are a method for encoding structured binary data for transport in URIs and QR Codes. They are described in [BCR-2020-005](https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-005-ur.md).

This is a JavaScript port of the Foundation Devices Python UR library, designed to work in both Node.js and browser environments.

## Installation

```bash
npm install
```

## Building

```bash
npm run build
```

This will create:
- `dist/ur.js` - UMD build for browsers
- `dist/ur.esm.js` - ES module build

## Usage

### Browser

```html
<script src="dist/ur.js"></script>
<script>
  // Use the UR library
  const { UREncoder, URDecoder } = UR;
</script>
```

### ES Modules

```javascript
import { UREncoder, URDecoder, UR } from './dist/ur.esm.js';

// Create a UR
const ur = new UR("bytes", new Uint8Array([1, 2, 3, 4]));

// Encode as single part
const encoded = UREncoder.encode(ur);
console.log(encoded); // "ur:bytes/..."

// Decode
const decoded = URDecoder.decode(encoded);
console.log(decoded.equals(ur)); // true
```

### Node.js Example

```javascript
import { UR, UREncoder, URDecoder, makeMessageUr } from './src/index.js';

// Simple single-part UR
const data = new TextEncoder().encode('Hello, UR World!');
const ur = new UR('bytes', data);
const encoded = UREncoder.encode(ur);
const decoded = URDecoder.decode(encoded);
console.log('Decoded:', new TextDecoder().decode(decoded.cbor));

// Multi-part UR with fountain codes
const largeUr = await makeMessageUr(1000);
const encoder = new UREncoder(largeUr, 100);
const decoder = new URDecoder();

while (!encoder.isComplete()) {
  const part = await encoder.nextPart();
  await decoder.receivePart(part);
  if (decoder.isComplete()) break;
}

if (decoder.isSuccess()) {
  console.log('Successfully decoded!');
}
```

### Multi-part UR Example

```javascript
import { UREncoder, URDecoder, makeMessageUr } from './src/index.js';

// Create a large UR that will need multiple parts
const ur = await makeMessageUr(32767);
const maxFragmentLen = 1000;
const firstSeqNum = 100;

const encoder = new UREncoder(ur, maxFragmentLen, firstSeqNum);
const decoder = new URDecoder();

// Generate and process parts until complete
while (true) {
  const part = await encoder.nextPart();
  await decoder.receivePart(part);
  if (decoder.isComplete()) {
    break;
  }
}

if (decoder.isSuccess()) {
  console.log('Successfully decoded:', decoder.resultMessage());
} else {
  console.error('Decode failed:', decoder.resultError());
}
```

## Testing

```bash
npm test
```

This will run the comprehensive test suite that matches the Python implementation.

## API Reference

### Core Classes

- **UR**: Represents a Uniform Resource with type and CBOR data
- **UREncoder**: Encodes URs into single or multi-part UR strings
- **URDecoder**: Decodes UR strings back into UR objects

### Fountain Code Classes

- **FountainEncoder**: Implements fountain coding for multi-part URs
- **FountainDecoder**: Decodes fountain-coded multi-part URs

### Utility Classes

- **Bytewords**: Encodes/decodes data using the Bytewords format
- **CBOREncoder/CBORDecoder**: CBOR encoding/decoding
- **Xoshiro256**: High-quality random number generator

## Browser Compatibility

This library uses modern JavaScript features and requires:
- ES2020+ support
- Web Crypto API (for SHA-256)
- Uint8Array support

For older browsers, you may need polyfills for:
- BigInt operations
- Web Crypto API

## License

Copyright © 2020 Foundation Devices, Inc. Licensed under the "BSD-2-Clause Plus Patent License"

This code is a JavaScript port of the original Python implementation by Foundation Devices, which was itself a port of the C++ reference implementation by Blockchain Commons.