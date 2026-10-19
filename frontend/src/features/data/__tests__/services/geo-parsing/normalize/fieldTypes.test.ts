import { GeoFieldType } from "@/features/data/services/geo-parsing/core/enums";
import {
  fromDbfFieldType,
  fromJsonValue,
  mergeFieldTypes,
} from "@/features/data/services/geo-parsing/normalize/fieldTypes";

const { STRING, NUMBER, BOOLEAN, DATE, BINARY, UNKNOWN } = GeoFieldType;

describe("fromDbfFieldType", () => {
  it.each([
    ["C", STRING],
    ["M", STRING],
    ["N", NUMBER],
    ["F", NUMBER],
    ["I", NUMBER],
    ["D", DATE],
    ["T", DATE],
    ["L", BOOLEAN],
    ["G", BINARY],
    ["X", UNKNOWN],
    ["", UNKNOWN],
  ])("%s → %s", (code, expected) => {
    expect(fromDbfFieldType(code)).toBe(expected);
  });
});

describe("fromJsonValue", () => {
  it.each([
    ["null", null, UNKNOWN],
    ["undefined", undefined, UNKNOWN],
    ["empty string", "", UNKNOWN],
    ["boolean", false, BOOLEAN],
    ["integer", 0, NUMBER],
    ["float", 3.14, NUMBER],
    ["text", "Paris", STRING],
    ["ISO date", "2024-02-29", DATE],
    ["ISO date-time UTC", "2024-02-29T10:15:30Z", DATE],
    ["ISO date-time with offset and ms", "2024-02-29T10:15:30.123+01:00", DATE],
    ["space separated date-time", "2024-02-29 10:15", DATE],
    ["free text date", "May 3", STRING],
    ["number as text", "42", STRING],
    ["French date", "29/02/2024", STRING],
    ["impossible date", "2024-13-45", STRING],
    ["object", { a: 1 }, STRING],
    ["array", [1, 2], STRING],
  ])("%s → %s", (_label, value, expected) => {
    expect(fromJsonValue(value)).toBe(expected);
  });
});

describe("mergeFieldTypes", () => {
  it.each([
    ["same type", NUMBER, NUMBER, NUMBER, false],
    ["unknown then known", UNKNOWN, NUMBER, NUMBER, false],
    ["known then unknown", DATE, UNKNOWN, DATE, false],
    ["unknown twice", UNKNOWN, UNKNOWN, UNKNOWN, false],
    ["number and text", NUMBER, STRING, STRING, true],
    ["date and text", DATE, STRING, STRING, true],
    ["boolean and number", BOOLEAN, NUMBER, STRING, true],
  ])("%s", (_label, a, b, type, conflict) => {
    expect(mergeFieldTypes(a, b)).toEqual({ type, conflict });
  });
});
