import type { Page } from 'playwright-core';

type SerializablePage = Pick<Page, 'evaluate'>;

function serializeEvaluationArg(arg: unknown): string {
  return typeof arg === 'undefined' ? 'undefined' : JSON.stringify(arg);
}

export async function evaluateSerializedScript<R>(
  page: SerializablePage,
  script: string,
): Promise<R>;
export async function evaluateSerializedScript<R, Arg>(
  page: SerializablePage,
  script: string,
  arg: Arg,
): Promise<R>;
export async function evaluateSerializedScript<R, Arg>(
  page: SerializablePage,
  script: string,
  arg?: Arg,
): Promise<R> {
  const expression = typeof arg === 'undefined'
    ? `(${script})()`
    : `(${script})(${serializeEvaluationArg(arg)})`;
  return page.evaluate(expression) as Promise<R>;
}
