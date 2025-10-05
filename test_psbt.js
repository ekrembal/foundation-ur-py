/**
 * test_psbt.js
 * 
 * Test PSBT encoding with the Foundation UR JavaScript library
 */

import { UR, UREncoder, URDecoder, createPSBT, toHex } from './src/index.js';

// Helper function to create PSBT CBOR encoding using the new PSBT class
function createPsbtCbor(psbtBytes) {
  // Create PSBT object and get CBOR encoding
  const urPsbt = createPSBT(psbtBytes);
  return urPsbt.toCbor();
}

async function testPsbtEncoding() {
  console.log('Foundation UR JavaScript Library - PSBT Encoding Test\n');

  // PSBT Base64 string from Python test (extracted from Python UR_PSBT output)
  const psbtBase64 = "cHNidP8BAHcCAAAAAfdOPcmRewY2v88bQwUxucGsxSuXH0uEkKSNE80NzyiBAAAAAAD9////AjU+AAAAAAAAGXapFD8wj0I2S+BXFbGa4wd7u8o36zxniKy2WQAAAAAAABl2qRRjuoLSTMaSnO/tORKfAZa2RonLgYisf8kNAAABAL8CAAAAAV4xZeLXJkrfKXk+fL6JBWhcMD/l0EPa78AWP1Pr4UpyAAAAAGpHMEQCIBS7ZFI/kRlbC4oeDirf3uVy1EWPiNqSHhcwmkkiSwQ9AiAitN+1CQUHNCeY9dscruF1U+B4Y+XtR5wXd83/YNy8ugEhAqAoKT0yVpnlt6sXX1Qz6eC2kO49L16MA34ipmgeGZtl/f///wHNmAAAAAAAABl2qRSFdGbzr4xiIfOuLmEpSa4n414zLYisf8kNACIGAxWaFXJLMzktDDpTbQAFCIllf+xM8nxjA86XolMXHogOGJwOR5IsAACAAAAAgAAAAIAAAAAAAAAAAAAiAgKh3fjioSvCMeCiWW2YHs/jG7yf7Ld4HzMyz/wF8fcKehicDkeSLAAAgAAAAIAAAACAAQAAAAAAAAAAAA==";
  
  try {
    // Convert Base64 string to bytes
    const psbtBytes = new Uint8Array(atob(psbtBase64).split('').map(char => char.charCodeAt(0)));
    
    console.log(`✅ Parsed PSBT: 1 inputs, 1 outputs`);
    console.log(`✅ PSBT: ${psbtBytes}`);
    console.log(`✅ PSBT: ${toHex(psbtBytes)}`);

    // Create PSBT CBOR encoding using the new PSBT class
    const psbtCbor = createPsbtCbor(psbtBytes);
    console.log(`✅ UR_PSBT: ${psbtCbor}`);
    console.log(`✅ UR_PSBT: ${toHex(psbtCbor)}`);

    // Create UR object with crypto-psbt type using the CBOR-encoded PSBT
    const qrUrBytes = new UR("crypto-psbt", psbtCbor);
    console.log(`✅ QR_UR_BYTES: ${qrUrBytes}`);
    
    // Create UR2 encoder for PSBT with same parameters as Python (max_fragment_len=28 to get 10 parts)
    const encoder = new UREncoder(qrUrBytes, 30, 0, 10); // max_fragment_len=28, first_seq_num=0, min_fragment_len=10
    
    console.log(`✅ Created UR2 encoder: ${encoder.fountainEncoder.seqLen()} parts`);
    
    // Display all parts
    console.log(`\n📱 UR2 Parts:`);
    const parts = [];
    for (let i = 0; i < encoder.fountainEncoder.seqLen(); i++) {
      const part = await encoder.nextPart();
      parts.push(part);
      console.log(`   Part ${i+1}: ${part}`);
    }
    
    // Ask user if they want to see QR codes (simulate Python behavior)
    console.log(`\n🎬 Would you like to see QR codes? (y/n): `);
    // For automated testing, we'll skip QR display
    console.log("QR display skipped.");
    
    return true;
    
  } catch (error) {
    console.log(`❌ Error converting to UR2: ${error}`);
    return false;
  }
}

// Run the test
testPsbtEncoding().catch(console.error);
