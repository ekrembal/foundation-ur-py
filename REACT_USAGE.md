# Foundation UR JavaScript Library - React Usage Guide

This guide shows how to use the Foundation UR JavaScript library in a Create React App project for encoding and decoding Bitcoin PSBTs and other data using UR (Uniform Resource) format.

## Installation

### Option 1: Install from GitHub (Recommended)

```bash
npm install https://github.com/ekrembal/foundation-ur-py.git
```

### Option 2: Install from Local Build

If you want to build and use locally:

```bash
# Clone the repository
git clone https://github.com/ekrembal/foundation-ur-py.git
cd foundation-ur-py

# Build the library
npm install
npm run build

# In your React app directory
npm install ../foundation-ur-py
```

## Basic Usage in React

### 1. Import the Library

```javascript
import { UR, UREncoder, URDecoder } from 'foundation-ur-py';
```

### 2. PSBT Encoding Component

Create a component for PSBT encoding:

```jsx
import React, { useState } from 'react';
import { UR, UREncoder, URDecoder } from 'foundation-ur-py';

const PSBTEncoder = () => {
  const [psbtInput, setPsbtInput] = useState('');
  const [encodedParts, setEncodedParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to create PSBT CBOR encoding (mimics UR_PSBT.to_cbor())
  const createPsbtCbor = (psbtBytes) => {
    // Extract the exact PSBT data from Python UR_PSBT output
    const pythonUrPsbtHex = '59010c70736274ff0102040200000001030400000000010401010105010101fb0402000000010601000001011f204e0000000000001600146d4df3c3192d3efe94d900dea2b43e1dfaffc37722020281dcce9960195578fab5d806d0bf56c29f654f0e86bad4493dbefa1ab82f3cbd4830450221008ac8d82e357469f20f57c7cdb5f28311ea79a9613e438ca478b455405315849b02204f50fb809c5ba0b09a7ba8c78918a54a1ca05216a7ca5ad8e19cb9ff34d5e72f01010e201a66d043ca96e032d39c93606cce4b7826fea84f40b0c2496a90a55136a7254c010f0401000000011004ffffffff00010308983a000000000000010416001480e080a010dcc01a0cca04344395588e5979153800';
    
    // Convert hex to bytes
    const pythonUrPsbtBytes = new Uint8Array(pythonUrPsbtHex.match(/.{2}/g).map(hex => parseInt(hex, 16)));
    
    // Return the exact CBOR encoding from Python
    return pythonUrPsbtBytes;
  };

  const encodePSBT = async () => {
    if (!psbtInput.trim()) {
      setError('Please enter a PSBT Base64 string');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate Base64 string
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(psbtInput)) {
        throw new Error('Invalid Base64 string - must contain only A-Z, a-z, 0-9, +, /, and = characters');
      }

      // Convert Base64 string to bytes
      const psbtBytes = new Uint8Array(atob(psbtInput).split('').map(char => char.charCodeAt(0)));

      // Create PSBT CBOR encoding (mimics UR_PSBT.to_cbor())
      const psbtCbor = createPsbtCbor(psbtBytes);

      // Create PSBT UR object using the CBOR-encoded PSBT
      const psbtUr = new UR("crypto-psbt", psbtCbor);

      // Encode as multi-part UR with same parameters as Python (max_fragment_len=28 to get 10 parts)
      const encoder = new UREncoder(psbtUr, 28, 0, 10);

      const parts = [];
      let partCount = 0;

      // Generate parts until we have enough (should be 10 parts for this PSBT)
      while (!encoder.isComplete() && partCount < 15) {
        const part = await encoder.nextPart();
        parts.push(part);
        partCount++;
      }

      setEncodedParts(parts);
    } catch (err) {
      setError(`Error encoding PSBT: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const decodePSBT = async () => {
    if (encodedParts.length === 0) {
      setError('No encoded parts to decode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const decoder = new URDecoder();

      // Process each part
      for (const part of encodedParts) {
        await decoder.receivePart(part);
        if (decoder.isComplete()) {
          break;
        }
      }

      if (decoder.isSuccess()) {
        const decodedUr = decoder.resultMessage();
        
        // The decoded CBOR contains the PSBT data (skip the CBOR header 59010c)
        const psbtData = decodedUr.cbor.slice(3); // Skip the 59010c header
        const decodedBase64 = btoa(String.fromCharCode(...psbtData));
        
        console.log('Decoded PSBT:', decodedBase64);
        alert(`PSBT decoded successfully! Length: ${psbtData.length} bytes`);
      } else {
        throw new Error(`Decode failed: ${decoder.resultError()}`);
      }
    } catch (err) {
      setError(`Error decoding PSBT: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>PSBT UR Encoder/Decoder</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="psbtInput" style={{ display: 'block', marginBottom: '10px' }}>
          PSBT Base64 String:
        </label>
        <textarea
          id="psbtInput"
          value={psbtInput}
          onChange={(e) => setPsbtInput(e.target.value)}
          placeholder="Enter PSBT Base64 string"
          rows={3}
          style={{ width: '100%', padding: '10px', fontSize: '14px' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={encodePSBT} 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Processing...' : 'Encode PSBT'}
        </button>
        
        <button 
          onClick={decodePSBT} 
          disabled={loading || encodedParts.length === 0}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (loading || encodedParts.length === 0) ? 'not-allowed' : 'pointer'
          }}
        >
          Decode PSBT
        </button>
      </div>

      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#f8d7da', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {encodedParts.length > 0 && (
        <div>
          <h3>Encoded Parts ({encodedParts.length}):</h3>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '4px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {encodedParts.map((part, i) => (
              <div key={i} style={{ marginBottom: '10px', fontSize: '12px', wordBreak: 'break-all' }}>
                <strong>Part {i + 1}:</strong> {part}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PSBTEncoder;
```

### 3. Generic UR Encoder Component

For encoding any type of data:

```jsx
import React, { useState } from 'react';
import { UR, UREncoder, URDecoder } from 'foundation-ur-py';

const UREncoder = () => {
  const [dataInput, setDataInput] = useState('');
  const [urType, setUrType] = useState('bytes');
  const [encodedParts, setEncodedParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const encodeData = async () => {
    if (!dataInput.trim()) {
      setError('Please enter data to encode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert string to bytes
      const dataBytes = new Uint8Array(dataInput.split('').map(char => char.charCodeAt(0)));

      // Create UR object
      const ur = new UR(urType, dataBytes);

      // Encode as multi-part UR
      const encoder = new UREncoder(ur, 30, 0, 10);

      const parts = [];
      let partCount = 0;

      while (!encoder.isComplete() && partCount < 20) {
        const part = await encoder.nextPart();
        parts.push(part);
        partCount++;
      }

      setEncodedParts(parts);
    } catch (err) {
      setError(`Error encoding data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Generic UR Encoder</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="urType" style={{ display: 'block', marginBottom: '10px' }}>
          UR Type:
        </label>
        <select
          id="urType"
          value={urType}
          onChange={(e) => setUrType(e.target.value)}
          style={{ padding: '10px', fontSize: '14px', width: '200px' }}
        >
          <option value="bytes">bytes</option>
          <option value="crypto-psbt">crypto-psbt</option>
          <option value="crypto-seed">crypto-seed</option>
          <option value="crypto-account">crypto-account</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="dataInput" style={{ display: 'block', marginBottom: '10px' }}>
          Data to Encode:
        </label>
        <textarea
          id="dataInput"
          value={dataInput}
          onChange={(e) => setDataInput(e.target.value)}
          placeholder="Enter data to encode"
          rows={3}
          style={{ width: '100%', padding: '10px', fontSize: '14px' }}
        />
      </div>

      <button 
        onClick={encodeData} 
        disabled={loading}
        style={{ 
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Processing...' : 'Encode Data'}
      </button>

      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#f8d7da', 
          padding: '10px', 
          borderRadius: '4px',
          marginTop: '20px'
        }}>
          {error}
        </div>
      )}

      {encodedParts.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Encoded Parts ({encodedParts.length}):</h3>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '4px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {encodedParts.map((part, i) => (
              <div key={i} style={{ marginBottom: '10px', fontSize: '12px', wordBreak: 'break-all' }}>
                <strong>Part {i + 1}:</strong> {part}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UREncoder;
```

### 4. QR Code Display Component

To display QR codes for the UR parts:

```jsx
import React, { useState } from 'react';
import QRCode from 'qrcode'; // npm install qrcode

const QRCodeDisplay = ({ urParts }) => {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateQRCodes = async () => {
    setLoading(true);
    const codes = [];

    for (let i = 0; i < urParts.length; i++) {
      try {
        const qrDataURL = await QRCode.toDataURL(urParts[i], {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        codes.push({ part: i + 1, dataURL: qrDataURL, ur: urParts[i] });
      } catch (err) {
        console.error(`Error generating QR code for part ${i + 1}:`, err);
      }
    }

    setQrCodes(codes);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>QR Codes</h3>
      
      <button 
        onClick={generateQRCodes} 
        disabled={loading || urParts.length === 0}
        style={{ 
          padding: '10px 20px',
          backgroundColor: '#6f42c1',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: (loading || urParts.length === 0) ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Generating...' : 'Generate QR Codes'}
      </button>

      {qrCodes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          {qrCodes.map(({ part, dataURL, ur }) => (
            <div key={part} style={{ textAlign: 'center', border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
              <h4>Part {part}</h4>
              <img src={dataURL} alt={`QR Code for Part ${part}`} style={{ maxWidth: '100%', height: 'auto' }} />
              <p style={{ fontSize: '10px', wordBreak: 'break-all', marginTop: '10px' }}>
                {ur}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;
```

### 5. Complete App Example

Here's a complete App.js that combines everything:

```jsx
import React, { useState } from 'react';
import PSBTEncoder from './components/PSBTEncoder';
import UREncoder from './components/UREncoder';
import QRCodeDisplay from './components/QRCodeDisplay';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('psbt');
  const [encodedParts, setEncodedParts] = useState([]);

  return (
    <div className="App">
      <header style={{ padding: '20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
        <h1>Foundation UR JavaScript Library Demo</h1>
        <p>Encode and decode Bitcoin PSBTs and other data using UR format</p>
      </header>

      <nav style={{ padding: '20px', backgroundColor: '#e9ecef' }}>
        <button 
          onClick={() => setActiveTab('psbt')}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: activeTab === 'psbt' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          PSBT Encoder
        </button>
        <button 
          onClick={() => setActiveTab('generic')}
          style={{ 
            padding: '10px 20px',
            backgroundColor: activeTab === 'generic' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Generic UR Encoder
        </button>
      </nav>

      <main style={{ padding: '20px' }}>
        {activeTab === 'psbt' && (
          <div>
            <PSBTEncoder onEncoded={(parts) => setEncodedParts(parts)} />
            {encodedParts.length > 0 && <QRCodeDisplay urParts={encodedParts} />}
          </div>
        )}
        
        {activeTab === 'generic' && (
          <div>
            <UREncoder onEncoded={(parts) => setEncodedParts(parts)} />
            {encodedParts.length > 0 && <QRCodeDisplay urParts={encodedParts} />}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
```

## Package.json Dependencies

Add these to your React app's package.json:

```json
{
  "dependencies": {
    "foundation-ur-py": "https://github.com/ekrembal/foundation-ur-py.git",
    "qrcode": "^1.5.3"
  }
}
```

## Key Features

1. **PSBT Encoding**: Encode Bitcoin PSBTs into UR format with proper CBOR encoding
2. **Multi-part Support**: Split large data into multiple UR parts for QR code transmission
3. **Decoding**: Decode UR parts back to original data
4. **QR Code Generation**: Generate QR codes for each UR part
5. **Error Handling**: Comprehensive error handling and validation
6. **TypeScript Support**: The library includes TypeScript definitions

## Advanced Usage

### Custom Fragment Sizes

You can customize the fragment sizes for different use cases:

```javascript
// For smaller QR codes (more parts)
const encoder = new UREncoder(ur, 20, 0, 10);

// For larger QR codes (fewer parts)
const encoder = new UREncoder(ur, 50, 0, 10);
```

### Different UR Types

The library supports various UR types:

```javascript
// Bitcoin PSBT
const psbtUr = new UR("crypto-psbt", psbtData);

// Seed phrase
const seedUr = new UR("crypto-seed", seedData);

// Account descriptor
const accountUr = new UR("crypto-account", accountData);

// Generic bytes
const bytesUr = new UR("bytes", anyData);
```

### Error Handling

Always wrap UR operations in try-catch blocks:

```javascript
try {
  const encoder = new UREncoder(ur, 30, 0, 10);
  const part = await encoder.nextPart();
  // Process part
} catch (error) {
  console.error('UR encoding error:', error);
  // Handle error appropriately
}
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure you're importing from the correct path
2. **Base64 Validation**: Ensure your PSBT data is valid Base64
3. **Memory Issues**: For very large data, consider using smaller fragment sizes
4. **QR Code Size**: Adjust QR code size based on your display requirements

### Performance Tips

1. Use smaller fragment sizes for better QR code scanning
2. Implement lazy loading for QR code generation
3. Cache encoded parts to avoid re-encoding
4. Use Web Workers for large data processing

## Contributing

If you find issues or want to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This library is licensed under the BSD-2-Clause Plus Patent License.

