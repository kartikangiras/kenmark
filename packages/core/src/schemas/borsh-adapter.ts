import { deserializeAttestationData, serializeAttestationData, type Schema } from "sas-lib";

/**
 * sas-lib's serializeAttestationData/deserializeAttestationData expect an
 * on-chain Schema struct whose `fieldNames` is a joined Vec<String> blob
 * (4-byte LE length prefix + UTF-8 bytes per field). These helpers convert
 * between that blob and the plain `string[]` used elsewhere in this package.
 */

export function joinVecsOfStrings(strings: readonly string[]): Uint8Array {
  const parts: Uint8Array[] = [];
  for (const s of strings) {
    const utf8 = new TextEncoder().encode(s);
    const lenPrefix = new Uint8Array(4);
    new DataView(lenPrefix.buffer).setUint32(0, utf8.length, true);
    parts.push(lenPrefix, utf8);
  }
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export function splitVecsOfStrings(bytes: Uint8Array): string[] {
  const textDecoder = new TextDecoder();
  const result: string[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const len = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
    offset += 4;
    result.push(textDecoder.decode(bytes.slice(offset, offset + len)));
    offset += len;
  }
  return result;
}

function buildMinimalSchema(layout: readonly number[], fieldNames: readonly string[]): Schema {
  return {
    layout: Uint8Array.from(layout),
    fieldNames: joinVecsOfStrings(fieldNames),
  } as unknown as Schema; // only .layout and .fieldNames are read by sas-lib's convertSasSchemaToBorshSchema
}

export function encodeAttestationData(
  layout: readonly number[],
  fieldNames: readonly string[],
  data: Record<string, unknown>,
): Uint8Array {
  return serializeAttestationData(buildMinimalSchema(layout, fieldNames), data);
}

export function decodeAttestationData<T>(
  layout: readonly number[],
  fieldNames: readonly string[],
  raw: Uint8Array,
): T {
  return deserializeAttestationData<T>(buildMinimalSchema(layout, fieldNames), raw);
}
