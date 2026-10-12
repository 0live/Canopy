import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";

const QUOTE = 0x22;
const BACKSLASH = 0x5c;
const OPEN_BRACE = 0x7b;
const CLOSE_BRACE = 0x7d;
const OPEN_BRACKET = 0x5b;
const CLOSE_BRACKET = 0x5d;
const COMMA = 0x2c;
/** Depth of the elements of the root "features" array */
const FEATURE_DEPTH = 2;
/** Root text so far ends with the "features" key: the array being opened is the one to split */
const FEATURES_KEY_PATTERN = /"features"\s*:\s*$/;

const corrupted = () => new GeoParseError(GeoParseErrorCode.CORRUPTED);

/**
 * Splits a GeoJSON text stream into the raw text of each element of the root
 * "features" array, plus the rest of the document (the "skeleton").
 * Only brackets and strings are tracked; JSON.parse then validates each piece,
 * which is several times faster than a character-level JSON parser.
 */
export class FeatureSplitter {
  private depth = 0;
  private inString = false;
  private escaped = false;
  private inFeatures = false;
  /** A comma was read in the features array: an element must follow */
  private elementExpected = false;
  private skeleton = "";
  private element = "";
  private segmentStart = 0;
  private completed: string[] = [];

  /** Scans a text chunk and returns the raw text of the features it completes */
  write(text: string): string[] {
    this.segmentStart = 0;
    for (let index = 0; index < text.length; index++) {
      const code = text.charCodeAt(index);
      if (this.inString) this.scanStringChar(code);
      else if (code === QUOTE) this.inString = true;
      else if (code === OPEN_BRACE || code === OPEN_BRACKET) this.open(code, text, index);
      else if (code === CLOSE_BRACE || code === CLOSE_BRACKET) this.close(text, index);
      else if (code === COMMA && this.inFeatures && this.depth === FEATURE_DEPTH) this.endElement(text, index, true);
    }
    this.flushSegment(text, text.length);
    const features = this.completed;
    this.completed = [];
    return features;
  }

  /** Returns the parsed root without its features; throws if the document is incomplete */
  end(): unknown {
    if (this.depth !== 0 || this.inString) throw corrupted();
    try {
      return JSON.parse(this.skeleton);
    } catch (error) {
      throw new GeoParseError(GeoParseErrorCode.CORRUPTED, {}, { cause: error });
    }
  }

  private scanStringChar(code: number): void {
    if (this.escaped) this.escaped = false;
    else if (code === BACKSLASH) this.escaped = true;
    else if (code === QUOTE) this.inString = false;
  }

  private open(code: number, text: string, index: number): void {
    // A root array would have to be held entirely in memory, and is not GeoJSON anyway
    if (this.depth === 0 && code === OPEN_BRACKET) throw new GeoParseError(GeoParseErrorCode.UNSUPPORTED_FORMAT);
    this.depth++;
    if (this.depth !== FEATURE_DEPTH || code !== OPEN_BRACKET || this.inFeatures) return;
    if (!FEATURES_KEY_PATTERN.test(this.skeleton + text.slice(this.segmentStart, index))) return;
    this.flushSegment(text, index + 1);
    this.inFeatures = true;
  }

  private close(text: string, index: number): void {
    if (this.depth === 0) throw corrupted();
    if (this.inFeatures && this.depth === FEATURE_DEPTH) {
      this.endElement(text, index, false);
      this.inFeatures = false;
      this.segmentStart = index;
    }
    this.depth--;
  }

  /** Appends the pending text, up to `end`, to the skeleton or to the current element */
  private flushSegment(text: string, end: number): void {
    const segment = text.slice(this.segmentStart, end);
    if (this.inFeatures) this.element += segment;
    else this.skeleton += segment;
    this.segmentStart = end;
  }

  private endElement(text: string, index: number, byComma: boolean): void {
    this.flushSegment(text, index);
    this.segmentStart = index + 1;
    const element = this.element.trim();
    this.element = "";
    // "[,{}]" and "[{},]": a separator without an element on one side
    if (!element && (byComma || this.elementExpected)) throw corrupted();
    if (element) this.completed.push(element);
    this.elementExpected = byComma;
  }
}
