import "fake-indexeddb/auto";
import { webcrypto } from "node:crypto";
import { Blob } from "node:buffer";
Object.defineProperty(globalThis, "crypto", { value: webcrypto });
Object.defineProperty(globalThis, "Blob", { value: Blob });
