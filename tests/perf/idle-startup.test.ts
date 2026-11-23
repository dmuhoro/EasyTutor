import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleIdleTask } from '../../lib/idleTask';

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCallback = (deadline: IdleDeadline) => void;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('scheduleIdleTask', () => {
  it('does not run inside the old 100 ms window and runs once at the fallback deadline', () => {
    vi.useFakeTimers();
    const task = vi.fn();
    const cancel = scheduleIdleTask(task);

    vi.advanceTimersByTime(100);
    expect(task).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1899);
    expect(task).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(task).toHaveBeenCalledTimes(1);

    cancel();
  });

  it('uses requestIdleCallback with a bounded timeout when the browser provides it', () => {
    let captured: IdleCallback | undefined;
    const requestIdleCallback = vi.fn((callback: IdleCallback, options: { timeout?: number }) => {
      captured = callback;
      expect(options).toEqual({ timeout: 1500 });
      return 42;
    });
    const cancelIdleCallback = vi.fn();
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);
    vi.stubGlobal('cancelIdleCallback', cancelIdleCallback);

    const task = vi.fn();
    const cancel = scheduleIdleTask(task, 1500);

    expect(requestIdleCallback).toHaveBeenCalledTimes(1);
    expect(task).not.toHaveBeenCalled();

    expect(captured).toBeTypeOf('function');
    captured?.({ didTimeout: false, timeRemaining: () => 12 });
    expect(task).toHaveBeenCalledTimes(1);

    cancel();
    expect(cancelIdleCallback).toHaveBeenCalledWith(42);
  });

  it('cancels a pending fallback task instead of dropping it silently', () => {
    vi.useFakeTimers();
    const task = vi.fn();
    const cancel = scheduleIdleTask(task);

    cancel();
    vi.advanceTimersByTime(2000);

    expect(task).not.toHaveBeenCalled();
  });
});

describe('root layout startup scheduling', () => {
  it('no longer runs the deferred startup block on a 100 ms timer', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/_layout.tsx'), 'utf8');

    expect(source).toContain("from '../lib/idleTask'");
    expect(source).toContain('scheduleIdleTask(() => {');
    expect(source).toContain("if (!session && segments[0] !== '(auth)')");
    expect(source).not.toMatch(/\},\s*100\s*\)/);
  });
});

describe('home screen startup scheduling', () => {
  it('defers non-visual sync work to an idle period', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'screens/tabs/index.tsx'),
      'utf8',
    );

    expect(source).toContain("from '../../lib/idleTask'");
    expect(source).toContain('return scheduleIdleTask(() => {');
    expect(source).not.toMatch(/^\s{4}run\('HOME_streak_failed'/m);
  });
});
