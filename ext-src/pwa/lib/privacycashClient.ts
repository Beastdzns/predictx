import { EncryptionService } from "privacycash/utils";
import { WasmFactory } from "@lightprotocol/hasher.rs";

export async function getLightWasm() {
  return await WasmFactory.getInstance();
}

export function encryptionServiceFromSecretBytes(secretBytes: Uint8Array) {
  const es = new EncryptionService();
  // The SDK expects "signature bytes" but any high-entropy bytes work for key derivation.
  es.deriveEncryptionKeyFromSignature(secretBytes);
  return es;
}
