/**
 * psbt_types.js
 * 
 * JavaScript implementation of UR Types for PSBT
 * Based on the Python urtypes library
 * 
 * This provides equivalent functionality to:
 * from urtypes.crypto import PSBT as UR_PSBT
 * UR_PSBT(serialized_psbt).to_cbor().hex()
 * 
 * Copyright © 2020 Foundation Devices, Inc.
 * Licensed under the "BSD-2-Clause Plus Patent License"
 */

import { CBOREncoder } from './cbor_lite.js';

// Registry system
class RegistryType {
    constructor(type, tag) {
        this.type = type;
        this.tag = tag;
    }
}

class RegistryItem {
    static registryType() {
        throw new Error('registryType must be implemented by subclass');
    }

    static mapping(item) {
        if (item && item.tag !== undefined) {
            const registryType = this.registryType();
            if ((registryType === null && item.tag === null) ||
                (registryType !== null && registryType.tag === item.tag)) {
                return item.map;
            }
        }
        return item;
    }

    static fromDataItem(item) {
        throw new Error('fromDataItem must be implemented by subclass');
    }

    toDataItem() {
        throw new Error('toDataItem must be implemented by subclass');
    }

    toCbor() {
        const encoder = new CBOREncoder();
        const dataItem = this.toDataItem();
        
        // Handle different data types
        if (dataItem instanceof Uint8Array) {
            encoder.encodeBytes(dataItem);
        } else if (typeof dataItem === 'string') {
            encoder.encodeText(dataItem);
        } else if (typeof dataItem === 'number') {
            encoder.encodeInteger(dataItem);
        } else if (typeof dataItem === 'boolean') {
            encoder.encodeBool(dataItem);
        } else if (Array.isArray(dataItem)) {
            encoder.encodeArraySize(dataItem.length);
            for (const item of dataItem) {
                // Recursively encode array items
                const itemEncoder = new CBOREncoder();
                if (item instanceof Uint8Array) {
                    itemEncoder.encodeBytes(item);
                } else if (typeof item === 'string') {
                    itemEncoder.encodeText(item);
                } else if (typeof item === 'number') {
                    itemEncoder.encodeInteger(item);
                } else if (typeof item === 'boolean') {
                    itemEncoder.encodeBool(item);
                }
                // Append the encoded item to the main encoder
                const itemBytes = itemEncoder.getBytes();
                const newBuf = new Uint8Array(encoder.buf.length + itemBytes.length);
                newBuf.set(encoder.buf);
                newBuf.set(itemBytes, encoder.buf.length);
                encoder.buf = newBuf;
            }
        } else if (dataItem && typeof dataItem === 'object') {
            const entries = Object.entries(dataItem);
            encoder.encodeMapSize(entries.length);
            for (const [key, value] of entries) {
                // Encode key
                const keyEncoder = new CBOREncoder();
                if (typeof key === 'string') {
                    keyEncoder.encodeText(key);
                } else if (typeof key === 'number') {
                    keyEncoder.encodeInteger(key);
                }
                // Encode value
                const valueEncoder = new CBOREncoder();
                if (value instanceof Uint8Array) {
                    valueEncoder.encodeBytes(value);
                } else if (typeof value === 'string') {
                    valueEncoder.encodeText(value);
                } else if (typeof value === 'number') {
                    valueEncoder.encodeInteger(value);
                } else if (typeof value === 'boolean') {
                    valueEncoder.encodeBool(value);
                }
                // Append both key and value
                const keyBytes = keyEncoder.getBytes();
                const valueBytes = valueEncoder.getBytes();
                const newBuf = new Uint8Array(encoder.buf.length + keyBytes.length + valueBytes.length);
                newBuf.set(encoder.buf);
                newBuf.set(keyBytes, encoder.buf.length);
                newBuf.set(valueBytes, encoder.buf.length + keyBytes.length);
                encoder.buf = newBuf;
            }
        }
        
        return encoder.getBytes();
    }
}

// Bytes class
const BYTES = new RegistryType("bytes", null);

class Bytes extends RegistryItem {
    constructor(data) {
        super();
        this.data = data;
    }

    equals(other) {
        return this.data.length === other.data.length &&
               this.data.every((byte, index) => byte === other.data[index]);
    }

    static registryType() {
        return BYTES;
    }

    toDataItem() {
        return this.data;
    }

    static fromDataItem(item) {
        return new this(this.mapping(item));
    }
}

// PSBT class
const CRYPTO_PSBT = new RegistryType("crypto-psbt", 310);

class PSBT extends Bytes {
    constructor(data) {
        super(data);
    }

    static registryType() {
        return CRYPTO_PSBT;
    }

    toDataItem() {
        // PSBT inherits from Bytes, so it just returns the raw data
        return this.data;
    }
}

// Utility function to convert Uint8Array to hex string
function toHex(bytes) {
    return Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

// Utility function to convert hex string to Uint8Array
function fromHex(hexString) {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return bytes;
}

// Main export - equivalent to the Python functionality
function createPSBT(serializedPsbt) {
    // Convert hex string to Uint8Array if needed
    const data = typeof serializedPsbt === 'string' ? fromHex(serializedPsbt) : serializedPsbt;
    return new PSBT(data);
}

// Export the main functionality
export {
    PSBT,
    createPSBT,
    toHex,
    fromHex,
    RegistryType,
    RegistryItem,
    Bytes
};
