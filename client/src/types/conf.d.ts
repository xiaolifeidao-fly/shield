declare module 'conf' {
  import { type OnDidChangeCallback, type Options, type Unsubscribe, type OnDidAnyChangeCallback } from 'conf/dist/source/types';
  
  export default class Conf<T extends Record<string, any> = Record<string, unknown>> {
    readonly path: string;
    readonly events: EventTarget;
    readonly store: T;
    
    constructor(partialOptions?: Readonly<Partial<Options<T>>>);
    
    get<Key extends keyof T>(key: Key): T[Key];
    get<Key extends keyof T>(key: Key, defaultValue: Required<T>[Key]): Required<T>[Key];
    get<Key extends string, Value = unknown>(key: Key, defaultValue?: Value): Value;
    
    set<Key extends keyof T>(key: Key, value: T[Key]): void;
    set(object: Partial<T>): void;
    
    has(key: keyof T): boolean;
    has(key: string): boolean;
    
    delete(key: keyof T): void;
    delete(key: string): void;
    
    clear(): void;
    
    onDidChange<Key extends keyof T>(
      key: Key,
      callback: OnDidChangeCallback<T[Key]>
    ): Unsubscribe;
    
    onDidAnyChange(callback: OnDidAnyChangeCallback<T>): Unsubscribe;
    
    [Symbol.iterator](): IterableIterator<[keyof T, T[keyof T]]>;
  }
  
  export type { Options, OnDidChangeCallback, Unsubscribe, OnDidAnyChangeCallback };
}

