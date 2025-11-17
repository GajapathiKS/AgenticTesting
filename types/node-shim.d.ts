declare module 'fs' {
  export const promises: {
    readFile(path: string, encoding: string): Promise<string>;
    writeFile(path: string, data: string, encoding: string): Promise<void>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    readdir(path: string): Promise<string[]>;
  };
}

declare module 'path' {
  export function join(...parts: string[]): string;
}

declare const process: {
  stdin: {
    once(event: 'data', listener: (chunk: Buffer) => void): void;
  };
  env: Record<string, string | undefined>;
};

declare class Buffer {
  static from(data: string, encoding?: string): Buffer;
}

declare module 'crypto' {
  interface Hash {
    update(data: string | Uint8Array, inputEncoding?: string): Hash;
    digest(encoding: 'hex'): string;
    digest(): Buffer;
  }

  interface Hmac {
    update(data: string | Uint8Array, inputEncoding?: string): Hmac;
    digest(encoding: 'hex'): string;
    digest(): Buffer;
  }

  export function createHash(algorithm: string): Hash;
  export function createHmac(algorithm: string, key: string | Buffer): Hmac;
}
