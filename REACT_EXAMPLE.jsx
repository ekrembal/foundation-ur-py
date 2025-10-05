// React Example Component for Foundation UR JavaScript Library
// Copy this file to your React app and install the dependencies

import React, { useState } from 'react';
import { UR, UREncoder, URDecoder } from 'foundation-ur-js';

const PSBTEncoder = () => {
  const [psbtInput, setPsbtInput] = useState('cHNidP8BAgQCAAAAAQMEAAAAAAEEAQEBBQEBAfsEAgAAAAEGAQAAAQEfIE4AAAAAAAAWABRtTfPDGS0+/pTZAN6itD4d+v/DdyICAoHczplgGVV4+rXYBtC/VsKfZU8OhrrUST2++hq4Lzy9SDBFAiEAisjYLjV0afIPV8fNtfKDEep5qWE+Q4ykeLRVQFMVhJsCIE9Q+4CcW6Cwmnuox4kYpUocoFIWp8pa2OGcuf801ecvAQEOIBpm0EPKluAy05yTYGzOS3gm/qhPQLDCSWqQpVE2pyVMAQ8EAQAAAAEQBP////8AAQMImDoAAAAAAAABBBYAFIDggKAQ3MAaDMoENEOVWI5ZeRU4AA==');
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

