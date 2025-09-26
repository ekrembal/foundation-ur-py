/**
 * test.js
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

import { 
  Bytewords, Bytewords_Style_standard, Bytewords_Style_uri, Bytewords_Style_minimal,
  crc32Int, crc32Bytes, dataToHex, bytesToInt, stringToBytes, xorInto,
  Xoshiro256, RandomSampler, shuffled, chooseDegree, chooseFragments,
  FountainEncoder, FountainDecoder, UREncoder, URDecoder,
  makeMessage, makeMessageUr
} from './src/index.js';

function checkCrc32(input, expectedHex) {
  const checksum = crc32Int(stringToBytes(input));
  const hex = checksum.toString(16);
  console.log(`CRC32 of "${input}": expected ${expectedHex}, got ${hex}`);
  return hex === expectedHex;
}

class TestUR {
  assertRaises(excType, func) {
    let raisedExc = null;
    try {
      func();
    } catch (e) {
      if (e instanceof excType) {
        raisedExc = e;
      }
    }
    if (!raisedExc) {
      throw new Error(`${excType.name} was not raised`);
    }
  }

  async testCrc32() {
    const result1 = checkCrc32("Hello, world!", "ebe6c6e6");
    const result2 = checkCrc32("Wolf", "598c84dc");
    console.log('CRC32 Hello, world! result:', result1);
    console.log('CRC32 Wolf result:', result2);
    console.assert(result1);
    console.assert(result2);
  }

  testBytewords1() {
    const input = new Uint8Array([0, 1, 2, 128, 255]);
    const encoded_standard = Bytewords.encode(Bytewords_Style_standard, input);
    const encoded_uri = Bytewords.encode(Bytewords_Style_uri, input);
    const encoded_minimal = Bytewords.encode(Bytewords_Style_minimal, input);
    
    console.log('Encoded standard:', encoded_standard);
    console.log('Encoded URI:', encoded_uri);
    console.log('Encoded minimal:', encoded_minimal);
    
    console.assert(encoded_standard === "able acid also lava zoom jade need echo taxi");
    console.assert(encoded_uri === "able-acid-also-lava-zoom-jade-need-echo-taxi");
    console.assert(encoded_minimal === "aeadaolazmjendeoti");

    const decoded_standard = Bytewords.decode(Bytewords_Style_standard, "able acid also lava zoom jade need echo taxi");
    const decoded_uri = Bytewords.decode(Bytewords_Style_uri, "able-acid-also-lava-zoom-jade-need-echo-taxi");
    const decoded_minimal = Bytewords.decode(Bytewords_Style_minimal, "aeadaolazmjendeoti");
    
    console.log('Decoded standard:', Array.from(decoded_standard));
    console.log('Decoded URI:', Array.from(decoded_uri));
    console.log('Decoded minimal:', Array.from(decoded_minimal));
    
    console.assert(decoded_standard.every((val, i) => val === input[i]));
    console.assert(decoded_uri.every((val, i) => val === input[i]));
    console.assert(decoded_minimal.every((val, i) => val === input[i]));

    // bad checksum
    this.assertRaises(Error, () => Bytewords.decode(Bytewords_Style_standard, "able acid also lava zoom jade need echo wolf"));
    this.assertRaises(Error, () => Bytewords.decode(Bytewords_Style_uri, "able-acid-also-lava-zoom-jade-need-echo-wolf"));
    this.assertRaises(Error, () => Bytewords.decode(Bytewords_Style_minimal, "aeadaolazmjendeowf"));

    // too short
    this.assertRaises(Error, () => Bytewords.decode(Bytewords_Style_standard, "wolf"));
    this.assertRaises(Error, () => Bytewords.decode(Bytewords_Style_standard, ""));
  }

  async testRng1() {
    const rng = await Xoshiro256.fromString("Wolf");
    const numbers = [];
    for (let i = 0; i < 100; i++) {
      numbers.push(rng.next() % 100);
    }

    const expectedNumbers = [42, 81, 85, 8, 82, 84, 76, 73, 70, 88, 2, 74, 40, 48, 77, 54, 88, 7, 5, 88, 37, 25, 82, 13, 69, 59, 30, 39, 11, 82, 19, 99, 45, 87, 30, 15, 32, 22, 89, 44, 92, 77, 29, 78, 4, 92, 44, 68, 92, 69, 1, 42, 89, 50, 37, 84, 63, 34, 32, 3, 17, 62, 40, 98, 82, 89, 24, 43, 85, 39, 15, 3, 99, 29, 20, 42, 27, 10, 85, 66, 50, 35, 69, 70, 70, 74, 30, 13, 72, 54, 11, 5, 70, 55, 91, 52, 10, 43, 43, 52];
    console.assert(JSON.stringify(numbers) === JSON.stringify(expectedNumbers));
  }

  async testRng2() {
    const checksum = bytesToInt(crc32Bytes(stringToBytes("Wolf")));
    const rng = await Xoshiro256.fromCrc32(checksum);
    const numbers = [];
    for (let i = 0; i < 100; i++) {
      numbers.push(rng.next() % 100);
    }

    const expectedNumbers = [88, 44, 94, 74, 0, 99, 7, 77, 68, 35, 47, 78, 19, 21, 50, 15, 42, 36, 91, 11, 85, 39, 64, 22, 57, 11, 25, 12, 1, 91, 17, 75, 29, 47, 88, 11, 68, 58, 27, 65, 21, 54, 47, 54, 73, 83, 23, 58, 75, 27, 26, 15, 60, 36, 30, 21, 55, 57, 77, 76, 75, 47, 53, 76, 9, 91, 14, 69, 3, 95, 11, 73, 20, 99, 68, 61, 3, 98, 36, 98, 56, 65, 14, 80, 74, 57, 63, 68, 51, 56, 24, 39, 53, 80, 57, 51, 81, 3, 1, 30];
    console.assert(JSON.stringify(numbers) === JSON.stringify(expectedNumbers));
  }

  async testRng3() {
    const rng = await Xoshiro256.fromString("Wolf");
    const numbers = [];
    for (let i = 0; i < 100; i++) {
      numbers.push(rng.nextInt(1, 10));
    }

    const expectedNumbers = [6, 5, 8, 4, 10, 5, 7, 10, 4, 9, 10, 9, 7, 7, 1, 1, 2, 9, 9, 2, 6, 4, 5, 7, 8, 5, 4, 2, 3, 8, 7, 4, 5, 1, 10, 9, 3, 10, 2, 6, 8, 5, 7, 9, 3, 1, 5, 2, 7, 1, 4, 4, 4, 4, 9, 4, 5, 5, 6, 9, 5, 1, 2, 8, 3, 3, 2, 8, 4, 3, 2, 1, 10, 8, 9, 3, 10, 8, 5, 5, 6, 7, 10, 5, 8, 9, 4, 6, 4, 2, 10, 2, 1, 7, 9, 6, 7, 4, 2, 5];
    console.assert(JSON.stringify(numbers) === JSON.stringify(expectedNumbers));
  }

  testFindFragmentLength() {
    console.assert(FountainEncoder.findNominalFragmentLength(12345, 1005, 1955) === 1764);
    console.assert(FountainEncoder.findNominalFragmentLength(12345, 1005, 30000) === 12345);
  }

  async testRandomSampler() {
    const probs = [1, 2, 4, 8];
    const sampler = new RandomSampler(probs);
    const rng = await Xoshiro256.fromString("Wolf");
    const samples = [];
    const f = () => rng.nextDouble();
    for (let i = 0; i < 500; i++) {
      samples.push(sampler.next(f));
    }

    const expectedSamples = [3, 3, 3, 3, 3, 3, 3, 0, 2, 3, 3, 3, 3, 1, 2, 2, 1, 3, 3, 2, 3, 3, 1, 1, 2, 1, 1, 3, 1, 3, 1, 2, 0, 2, 1, 0, 3, 3, 3, 1, 3, 3, 3, 3, 1, 3, 2, 3, 2, 2, 3, 3, 3, 3, 2, 3, 3, 0, 3, 3, 3, 3, 1, 2, 3, 3, 2, 2, 2, 1, 2, 2, 1, 2, 3, 1, 3, 0, 3, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 3, 1, 3, 3, 2, 0, 2, 2, 3, 1, 1, 2, 3, 2, 3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 2, 3, 1, 2, 1, 1, 3, 1, 3, 2, 2, 3, 3, 3, 1, 3, 3, 3, 3, 3, 3, 3, 3, 2, 3, 2, 3, 3, 1, 2, 3, 3, 1, 3, 2, 3, 3, 3, 2, 3, 1, 3, 0, 3, 2, 1, 1, 3, 1, 3, 2, 3, 3, 3, 3, 2, 0, 3, 3, 1, 3, 0, 2, 1, 3, 3, 1, 1, 3, 1, 2, 3, 3, 3, 0, 2, 3, 2, 0, 1, 3, 3, 3, 2, 2, 2, 3, 3, 3, 3, 3, 2, 3, 3, 3, 3, 2, 3, 3, 2, 0, 2, 3, 3, 3, 3, 2, 1, 1, 1, 2, 1, 3, 3, 3, 2, 2, 3, 3, 1, 2, 3, 0, 3, 2, 3, 3, 3, 3, 0, 2, 2, 3, 2, 2, 3, 3, 3, 3, 1, 3, 2, 3, 3, 3, 3, 3, 2, 2, 3, 1, 3, 0, 2, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 3, 3, 3, 3, 2, 2, 2, 3, 1, 1, 3, 2, 2, 0, 3, 2, 1, 2, 1, 0, 3, 3, 3, 2, 2, 3, 2, 1, 2, 0, 0, 3, 3, 2, 3, 3, 2, 3, 3, 3, 3, 3, 2, 2, 2, 3, 3, 3, 3, 3, 1, 1, 3, 2, 2, 3, 1, 1, 0, 1, 3, 2, 3, 3, 2, 3, 3, 2, 3, 3, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 1, 2, 3, 3, 2, 2, 2, 2, 3, 3, 2, 0, 2, 1, 3, 3, 3, 3, 0, 3, 3, 3, 3, 2, 2, 3, 1, 3, 3, 3, 2, 3, 3, 3, 2, 3, 3, 3, 3, 2, 3, 2, 1, 3, 3, 3, 3, 2, 2, 0, 1, 2, 3, 2, 0, 3, 3, 3, 3, 3, 3, 1, 3, 3, 2, 3, 2, 2, 3, 3, 3, 3, 3, 2, 2, 3, 3, 2, 2, 2, 1, 3, 3, 3, 3, 1, 2, 3, 2, 3, 3, 2, 3, 2, 3, 3, 3, 2, 3, 1, 2, 3, 2, 1, 1, 3, 3, 2, 3, 3, 2, 3, 3, 0, 0, 1, 3, 3, 2, 3, 3, 3, 3, 1, 3, 3, 0, 3, 2, 3, 3, 1, 3, 3, 3, 3, 3, 3, 3, 0, 3, 3, 2];
    console.assert(JSON.stringify(samples) === JSON.stringify(expectedSamples));
  }

  async testShuffle() {
    const rng = await Xoshiro256.fromString("Wolf");
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = [];
    for (let i = 0; i < 10; i++) {
      result.push(shuffled([...values], rng));
    }

    const expectedResult = [
      [6, 4, 9, 3, 10, 5, 7, 8, 1, 2],
      [10, 8, 6, 5, 1, 2, 3, 9, 7, 4],
      [6, 4, 5, 8, 9, 3, 2, 1, 7, 10],
      [7, 3, 5, 1, 10, 9, 4, 8, 2, 6],
      [8, 5, 7, 10, 2, 1, 4, 3, 9, 6],
      [4, 3, 5, 6, 10, 2, 7, 8, 9, 1],
      [5, 1, 3, 9, 4, 6, 2, 10, 7, 8],
      [2, 1, 10, 8, 9, 4, 7, 6, 3, 5],
      [6, 7, 10, 4, 8, 9, 2, 3, 1, 5],
      [10, 2, 1, 7, 9, 5, 6, 3, 4, 8]
    ];
    console.assert(JSON.stringify(result) === JSON.stringify(expectedResult));
  }

  async testPartitionAndJoin() {
    const message = await makeMessage(1024);
    const fragmentLen = FountainEncoder.findNominalFragmentLength(message.length, 10, 100);
    const fragments = FountainEncoder.partitionMessage(message, fragmentLen);
    const fragmentsHex = fragments.map(f => dataToHex(f));

    const expectedFragments = [
      "916ec65cf77cadf55cd7f9cda1a1030026ddd42e905b77adc36e4f2d3ccba44f7f04f2de44f42d84c374a0e149136f25b01852545961d55f7f7a8cde6d0e2ec43f3b2dcb644a2209e8c9e34af5c4747984a5e873c9cf5f965e25ee29039f",
      "df8ca74f1c769fc07eb7ebaec46e0695aea6cbd60b3ec4bbff1b9ffe8a9e7240129377b9d3711ed38d412fbb4442256f1e6f595e0fc57fed451fb0a0101fb76b1fb1e1b88cfdfdaa946294a47de8fff173f021c0e6f65b05c0a494e50791",
      "270a0050a73ae69b6725505a2ec8a5791457c9876dd34aadd192a53aa0dc66b556c0c215c7ceb8248b717c22951e65305b56a3706e3e86eb01c803bbf915d80edcd64d4d41977fa6f78dc07eecd072aae5bc8a852397e06034dba6a0b570",
      "797c3a89b16673c94838d884923b8186ee2db5c98407cab15e13678d072b43e406ad49477c2e45e85e52ca82a94f6df7bbbe7afbed3a3a830029f29090f25217e48d1f42993a640a67916aa7480177354cc7440215ae41e4d02eae9a1912",
      "33a6d4922a792c1b7244aa879fefdb4628dc8b0923568869a983b8c661ffab9b2ed2c149e38d41fba090b94155adbed32f8b18142ff0d7de4eeef2b04adf26f2456b46775c6c20b37602df7da179e2332feba8329bbb8d727a138b4ba7a5",
      "03215eda2ef1e953d89383a382c11d3f2cad37a4ee59a91236a3e56dcf89f6ac81dd4159989c317bd649d9cbc617f73fe10033bd288c60977481a09b343d3f676070e67da757b86de27bfca74392bac2996f7822a7d8f71a489ec6180390",
      "089ea80a8fcd6526413ec6c9a339115f111d78ef21d456660aa85f790910ffa2dc58d6a5b93705caef1091474938bd312427021ad1eeafbd19e0d916ddb111fabd8dcab5ad6a6ec3a9c6973809580cb2c164e26686b5b98cfb017a337968",
      "c7daaa14ae5152a067277b1b3902677d979f8e39cc2aafb3bc06fcf69160a853e6869dcc09a11b5009f91e6b89e5b927ab1527a735660faa6012b420dd926d940d742be6a64fb01cdc0cff9faa323f02ba41436871a0eab851e7f5782d10",
      "fbefde2a7e9ae9dc1e5c2c48f74f6c824ce9ef3c89f68800d44587bedc4ab417cfb3e7447d90e1e417e6e05d30e87239d3a5d1d45993d4461e60a0192831640aa32dedde185a371ded2ae15f8a93dba8809482ce49225daadfbb0fec629e",
      "23880789bdf9ed73be57fa84d555134630e8d0f7df48349f29869a477c13ccca9cd555ac42ad7f568416c3d61959d0ed568b2b81c7771e9088ad7fd55fd4386bafbf5a528c30f107139249357368ffa980de2c76ddd9ce4191376be0e6b5",
      "170010067e2e75ebe2d2904aeb1f89d5dc98cd4a6f2faaa8be6d03354c990fd895a97feb54668473e9d942bb99e196d897e8f1b01625cf48a7b78d249bb4985c065aa8cd1402ed2ba1b6f908f63dcd84b66425df00000000000000000000"
    ];
    console.assert(JSON.stringify(fragmentsHex) === JSON.stringify(expectedFragments));
    const rejoinedMessage = FountainDecoder.joinFragments(fragments, message.length);
    console.assert(rejoinedMessage.every((val, i) => val === message[i]));
  }

  async testXor() {
    const rng = await Xoshiro256.fromString("Wolf");
    const data1 = rng.nextData(10);
    console.assert(dataToHex(data1) === "916ec65cf77cadf55cd7");
    const data2 = rng.nextData(10);
    console.assert(dataToHex(data2) === "f9cda1a1030026ddd42e");
    const data3 = new Uint8Array(data1);
    xorInto(data3, data2);
    console.assert(dataToHex(data3) === "68a367fdf47c8b2888f9");
    xorInto(data3, data1);
    console.assert(data3.every((val, i) => val === data2[i]));
  }

  async testSinglePartUr() {
    const ur = await makeMessageUr(50);
    const encoded = UREncoder.encode(ur);
    const expected = "ur:bytes/hdeymejtswhhylkepmykhhtsytsnoyoyaxaedsuttydmmhhpktpmsrjtgwdpfnsboxgwlbaawzuefywkdplrsrjynbvygabwjldapfcsdwkbrkch";
    console.assert(encoded === expected);
    const decoded = URDecoder.decode(encoded);
    console.assert(ur.equals(decoded));
  }

  async runTests() {
    try {
      console.log('test_crc32()');
      await this.testCrc32();
      console.log('test_bytewords_1()');
      this.testBytewords1();
      console.log('test_rng_1()');
      await this.testRng1();
      console.log('test_rng_2()');
      await this.testRng2();
      console.log('test_rng_3()');
      await this.testRng3();
      console.log('test_find_fragment_length()');
      this.testFindFragmentLength();
      console.log('test_random_sampler()');
      await this.testRandomSampler();
      console.log('test_shuffle()');
      await this.testShuffle();
      console.log('test_partition_and_join()');
      await this.testPartitionAndJoin();
      console.log('test_xor()');
      await this.testXor();
      console.log('test_single_part_ur()');
      await this.testSinglePartUr();
    } catch (err) {
      console.error("Exception:", err);
      throw err;
    }
    console.log("Testing Complete.");
  }
}

// Run tests
const test = new TestUR();
test.runTests().catch(console.error);
