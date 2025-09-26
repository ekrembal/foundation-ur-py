/**
 * example.js
 * 
 * Simple example demonstrating the Foundation UR JavaScript library
 */

import { UR, UREncoder, URDecoder, Bytewords, Bytewords_Style_minimal, makeMessageUr } from './src/index.js';

async function main() {
  console.log('Foundation UR JavaScript Library Example\n');

  // Example 1: Simple single-part UR
  console.log('=== Single Part UR Example ===');
  const simpleData = new TextEncoder().encode('Hello, UR World!');
  const simpleUr = new UR('bytes', simpleData);
  
  const encoded = UREncoder.encode(simpleUr);
  console.log('Encoded:', encoded);
  
  const decoded = URDecoder.decode(encoded);
  const decodedText = new TextDecoder().decode(decoded.cbor);
  console.log('Decoded:', decodedText);
  console.log('Success:', simpleUr.equals(decoded));
  console.log();

  // Example 2: Multi-part UR with fountain codes
  console.log('=== Multi-Part UR Example ===');
  const largeUr = await makeMessageUr(1000); // Create a 1000-byte UR
  const encoder = new UREncoder(largeUr, 100); // 100-byte fragments
  const decoder = new URDecoder();
  
  console.log('Generating fountain code parts...');
  let partCount = 0;
  while (!encoder.isComplete() && partCount < 15) {
    const part = await encoder.nextPart();
    await decoder.receivePart(part);
    partCount++;
    console.log(`Part ${partCount}: ${part.substring(0, 50)}...`);
  }
  
  if (decoder.isSuccess()) {
    console.log('✅ Successfully decoded multi-part UR!');
    console.log('Original length:', largeUr.cbor.length);
    console.log('Decoded length:', decoder.resultMessage().cbor.length);
  } else {
    console.log('❌ Failed to decode:', decoder.resultError());
  }
  console.log();

  // Example 3: Bytewords encoding
  console.log('=== Bytewords Example ===');
  const testData = new Uint8Array([0, 1, 2, 128, 255]);
  const bytewordsEncoded = Bytewords.encode(Bytewords_Style_minimal, testData);
  console.log('Original data:', Array.from(testData));
  console.log('Bytewords encoded:', bytewordsEncoded);
  
  const bytewordsDecoded = Bytewords.decode(Bytewords_Style_minimal, bytewordsEncoded);
  console.log('Bytewords decoded:', Array.from(bytewordsDecoded));
  console.log('Success:', testData.every((val, i) => val === bytewordsDecoded[i]));
  console.log();

  console.log('Example completed successfully! 🎉');
}

main().catch(console.error);
