import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { isValidSchemaDataType } from "../../src/schemas/types.js";
import { LAYOUT, FIELD_NAMES, PREDICATE_TYPE } from "../../src/schemas/verified-build.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_JSON_PATH = join(__dirname, "../../../spec/predicates/v1/verified-build.schema.json");

/**
 * Mirrors the on-chain Schema::validate check: layout and field_names have
 * the same length and every layout byte is a defined ordinal.
 */
describe("schema validation", () => {
  const schemaJson = JSON.parse(readFileSync(SCHEMA_JSON_PATH, "utf-8"));

  it("the published verified-build.schema.json is internally consistent", () => {
    expect(schemaJson.layout.length).toBe(schemaJson.field_names.length);
    for (const byte of schemaJson.layout) {
      expect(isValidSchemaDataType(byte)).toBe(true);
    }
  });

  it("the published schema matches the verified-build.ts constants", () => {
    expect(schemaJson.predicateType).toBe(PREDICATE_TYPE);
    expect(schemaJson.layout).toEqual([...LAYOUT]);
    expect(schemaJson.field_names).toEqual([...FIELD_NAMES]);
  });

  it("LAYOUT and FIELD_NAMES satisfy Schema::validate", () => {
    expect(LAYOUT.length).toBe(FIELD_NAMES.length);
    for (const byte of LAYOUT) {
      expect(isValidSchemaDataType(byte)).toBe(true);
    }
  });
});
