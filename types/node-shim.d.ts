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
};

declare class Buffer {}
