import { _ClarinetParser as ClarinetParser } from "@loaders.gl/json";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";

type JsonObject = Record<string, unknown>;
type JsonContainer = JsonObject | unknown[];

interface Frame {
  container: JsonContainer;
  key: string | null;
  /** Elements of this array are handed out instead of being stored */
  streaming: boolean;
}

/** Root member whose elements are streamed: memory stays bounded by one feature */
const STREAMED_MEMBER = "features";
const PROTO_KEY = "__proto__";

type ClarinetOptions = NonNullable<ConstructorParameters<typeof ClarinetParser>[0]>;

function setMember(object: JsonObject, key: string, value: unknown): void {
  // Same semantics as JSON.parse: "__proto__" is a plain own property, never the prototype
  if (key === PROTO_KEY) Object.defineProperty(object, key, { value, enumerable: true, writable: true });
  else object[key] = value;
}

/**
 * Builds a JSON document from clarinet events, except the elements of the root
 * "features" array, which are returned by write() as soon as they are complete.
 * Unlike loaders.gl parseInBatches, end() fails on a truncated document.
 */
export class StreamingJsonTree {
  root: unknown = undefined;
  private readonly stack: Frame[] = [];
  private completed: unknown[] = [];
  private readonly parser: ClarinetParser;

  constructor() {
    // clarinet calls handlers as (data, parser): its type declarations have the arguments swapped
    const handlers = {
      onopenobject: (key: string | undefined) => this.open({}, key ?? null, false),
      onkey: (key: string) => this.setKey(key),
      oncloseobject: () => this.close(),
      onopenarray: () => this.openArray(),
      onclosearray: () => this.close(),
      onvalue: (value: unknown) => this.attach(value),
      onerror: (error: Error) => {
        throw error;
      },
    };
    this.parser = new ClarinetParser(handlers as unknown as ClarinetOptions);
  }

  /** Parses a text chunk and returns the features completed by it */
  write(text: string): unknown[] {
    this.parser.write(text);
    return this.drain();
  }

  /** Signals the end of the document; throws if it is incomplete */
  end(): unknown[] {
    this.parser.close();
    return this.drain();
  }

  private drain(): unknown[] {
    const features = this.completed;
    this.completed = [];
    return features;
  }

  private top(): Frame | undefined {
    return this.stack.at(-1);
  }

  private setKey(key: string): void {
    const frame = this.top();
    if (frame) frame.key = key;
  }

  private open(container: JsonContainer, key: string | null, streaming: boolean): void {
    this.stack.push({ container, key, streaming });
  }

  private openArray(): void {
    const parent = this.top();
    // A root array would be held entirely in memory, and is not GeoJSON anyway
    if (!parent) throw new GeoParseError(GeoParseErrorCode.UNSUPPORTED_FORMAT);
    const streaming = this.stack.length === 1 && !Array.isArray(parent.container) && parent.key === STREAMED_MEMBER;
    this.open([], null, streaming);
  }

  private close(): void {
    const frame = this.stack.pop();
    if (frame) this.attach(frame.streaming ? [] : frame.container);
  }

  private attach(value: unknown): void {
    const frame = this.top();
    if (!frame) this.root = value;
    else if (frame.streaming) this.completed.push(value);
    else if (Array.isArray(frame.container)) frame.container.push(value);
    else if (frame.key !== null) setMember(frame.container, frame.key, value);
  }
}
