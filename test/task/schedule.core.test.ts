import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateNextExecutionTime,
  PreemptiveRunController,
  ScheduleRevision,
} from '../../src/task/schedule.core';

function createDeferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

test('a new scheduled run cancels and waits for the previous run before starting', async () => {
  const controller = new PreemptiveRunController();
  const previous = createDeferred();
  const next = createDeferred();
  const events: string[] = [];

  const previousExecution = controller.replace(
    () => ({
      completed: previous.promise,
      cancel: async () => {
        events.push('stop-previous');
      },
    }),
    () => true,
    'initial run'
  );

  await new Promise(resolve => setImmediate(resolve));
  const nextExecution = controller.replace(
    () => {
      events.push('start-next');
      return {
        completed: next.promise,
        cancel: async () => undefined,
      };
    },
    () => true,
    'new scheduled time reached'
  );

  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, ['stop-previous']);

  previous.resolve();
  await previousExecution;
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, ['stop-previous', 'start-next']);

  next.resolve();
  await nextExecution;
});

test('a stale schedule does not start after the previous run stops', async () => {
  const controller = new PreemptiveRunController();
  const previous = createDeferred();
  let current = true;
  let started = false;

  const previousExecution = controller.replace(
    () => ({
      completed: previous.promise,
      cancel: async () => {
        current = false;
      },
    }),
    () => true,
    'initial run'
  );

  await new Promise(resolve => setImmediate(resolve));
  const staleExecution = controller.replace(
    () => {
      started = true;
      return { completed: Promise.resolve(), cancel: async () => undefined };
    },
    () => current,
    'stale scheduled run'
  );

  previous.resolve();
  await previousExecution;
  await staleExecution;
  assert.equal(started, false);
});

test('only the latest schedule revision remains current', () => {
  const revision = new ScheduleRevision();
  const oldVersion = revision.advance();
  const latestVersion = revision.advance();

  assert.equal(revision.isCurrent(oldVersion), false);
  assert.equal(revision.isCurrent(latestVersion), true);
});

test('daily scheduling keeps the configured wall-clock time', () => {
  const reference = new Date(2026, 7, 7, 2, 0, 1, 0);
  const next = calculateNextExecutionTime(
    { type: 'daily', hour: 2, minute: 0 },
    reference
  );

  assert.equal(next, new Date(2026, 7, 8, 2, 0, 0, 0).getTime());
});
