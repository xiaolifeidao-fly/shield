import { SyncTimeConfig } from '@model/system.types';

export interface PreemptibleRun {
  completed: Promise<void>;
  cancel: (reason: string) => Promise<void>;
}

export class ScheduleRevision {
  private value = 0;

  advance(): number {
    this.value += 1;
    return this.value;
  }

  isCurrent(version: number): boolean {
    return this.value === version;
  }
}

export class PreemptiveRunController {
  private activeRun?: PreemptibleRun;

  async replace(
    createRun: () => PreemptibleRun,
    isCurrent: () => boolean,
    cancelReason: string
  ): Promise<void> {
    const previousRun = this.activeRun;
    if (previousRun) {
      await previousRun.cancel(cancelReason);
      await previousRun.completed.catch(() => undefined);
    }

    if (!isCurrent()) {
      return;
    }

    const nextRun = createRun();
    this.activeRun = nextRun;
    try {
      await nextRun.completed;
    } finally {
      if (this.activeRun === nextRun) {
        this.activeRun = undefined;
      }
    }
  }

  async stop(reason: string): Promise<void> {
    const activeRun = this.activeRun;
    if (!activeRun) {
      return;
    }

    await activeRun.cancel(reason);
    await activeRun.completed.catch(() => undefined);
  }
}

export function calculateNextExecutionTime(config: SyncTimeConfig, referenceTime: Date): number | null {
  const targetDate = new Date(referenceTime);

  if (config.type === 'daily') {
    targetDate.setHours(config.hour, config.minute, 0, 0);
    if (targetDate <= referenceTime) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
  } else if (config.type === 'monthly') {
    if (!config.day) {
      return null;
    }

    targetDate.setDate(1);
    const daysInCurrentMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    targetDate.setDate(Math.min(config.day, daysInCurrentMonth));
    targetDate.setHours(config.hour, config.minute, 0, 0);

    if (targetDate <= referenceTime) {
      targetDate.setDate(1);
      targetDate.setMonth(targetDate.getMonth() + 1);
      const daysInNextMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
      targetDate.setDate(Math.min(config.day, daysInNextMonth));
      targetDate.setHours(config.hour, config.minute, 0, 0);
    }
  } else {
    return null;
  }

  return targetDate.getTime();
}
