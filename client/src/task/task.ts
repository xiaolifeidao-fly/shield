import { BusinessType } from "@eleapi/user/user.api";
import { SyncTimeConfig } from "@eleapi/config/system.api";
import { SystemImpl } from "@src/impl/config/system.impl";
import { UserImpl } from "@src/impl/user/user.impl";
import { clearBusinessTypeCache } from "@src/business/common/base.sync";
import log from 'electron-log';

/**
 * 定时任务管理器
 * 根据业务类型的定时配置，定时执行该业务类型下所有用户的 run 操作
 */
class ScheduledTaskManager {
    private timers: Map<BusinessType, NodeJS.Timeout> = new Map();
    private systemImpl: SystemImpl;
    private userImpl: UserImpl;
    private readonly businessTypes: BusinessType[] = ['adapundi', 'SINGA'];

    constructor() {
        this.systemImpl = new SystemImpl();
        this.userImpl = new UserImpl();
    }

    /**
     * 初始化所有业务类型的定时任务
     */
    async initialize(): Promise<void> {
        log.info('[ScheduledTaskManager] Initializing scheduled tasks for all business types');
        
        for (const businessType of this.businessTypes) {
            await this.scheduleTaskForBusiness(businessType);
        }
    }

    /**
     * 为指定业务类型调度定时任务
     */
    async scheduleTaskForBusiness(businessType: BusinessType): Promise<void> {
        // 清除现有的定时器（如果存在）
        this.clearTaskForBusiness(businessType);

        try {
            // 获取业务类型的定时配置
            const config = await this.systemImpl.getSyncTimeConfigByBusiness(businessType);
            
            // 计算下次执行时间
            const nextExecutionTime = this.calculateNextExecutionTime(config);
            
            if (!nextExecutionTime) {
                log.warn(`[ScheduledTaskManager] No valid execution time calculated for business type: ${businessType}`);
                return;
            }

            const now = Date.now();
            const delay = nextExecutionTime - now;

            if (delay < 0) {
                // 如果计算出的时间已过期，立即执行一次，然后重新计算下一次
                log.info(`[ScheduledTaskManager] Execution time for ${businessType} has passed, executing immediately`);
                await this.executeTaskForBusiness(businessType);
                // 重新计算下一次执行时间
                const nextTime = this.calculateNextExecutionTime(config, true);
                if (nextTime) {
                    const newDelay = nextTime - Date.now();
                    const timer = setTimeout(() => {
                        this.scheduleRecurringTask(businessType, config);
                    }, newDelay);
                    this.timers.set(businessType, timer);
                    log.info(`[ScheduledTaskManager] Scheduled ${businessType} task for ${new Date(nextTime).toLocaleString()}`);
                }
            } else {
                const timer = setTimeout(() => {
                    this.scheduleRecurringTask(businessType, config);
                }, delay);
                this.timers.set(businessType, timer);
                log.info(`[ScheduledTaskManager] Scheduled ${businessType} task for ${new Date(nextExecutionTime).toLocaleString()}`);
            }
        } catch (error) {
            log.error(`[ScheduledTaskManager] Failed to schedule task for ${businessType}:`, error);
        }
    }

    /**
     * 设置循环定时任务
     */
    private async scheduleRecurringTask(businessType: BusinessType, config: SyncTimeConfig): Promise<void> {
        // 执行任务
        await this.executeTaskForBusiness(businessType);
        
        // 根据配置类型设置下一次执行（递归方式，每次都重新计算）
        const nextTime = this.calculateNextExecutionTime(config, true);
        if (nextTime) {
            const delay = nextTime - Date.now();
            const timer = setTimeout(() => {
                this.scheduleRecurringTask(businessType, config);
            }, delay);
            this.timers.set(businessType, timer);
            const timeStr = config.type === 'daily' 
                ? `${config.hour}:${config.minute.toString().padStart(2, '0')}`
                : `day ${config.day} at ${config.hour}:${config.minute.toString().padStart(2, '0')}`;
            log.info(`[ScheduledTaskManager] Scheduled next ${config.type} task for ${businessType} (${timeStr}) at ${new Date(nextTime).toLocaleString()}`);
        }
    }

    /**
     * 计算下次执行时间
     * @param config 定时配置
     * @param fromNow 是否从当前时间开始计算（用于循环任务）
     */
    private calculateNextExecutionTime(config: SyncTimeConfig, fromNow: boolean = false): number | null {
        const now = new Date();
        let targetDate = new Date(now);
        
        if (config.type === 'daily') {
            // 每日任务：设置为今天的指定时间
            targetDate.setHours(config.hour, config.minute, 0, 0);
            
            // 如果时间已过，设置为明天
            if (fromNow || targetDate <= now) {
                targetDate.setDate(targetDate.getDate() + 1);
            }
        } else if (config.type === 'monthly') {
            // 月度任务：设置为本月指定日期和时间的下一个月
            if (config.day) {
                const currentDay = now.getDate();
                const targetDay = config.day;
                
                // 如果配置的日期小于等于今天的日期，设置为下个月
                // 否则设置为本月
                if (fromNow || currentDay >= targetDay) {
                    targetDate.setMonth(targetDate.getMonth() + 1);
                }
                
                // 设置日期（处理月份天数不一致的情况）
                const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
                const actualDay = Math.min(targetDay, daysInMonth);
                targetDate.setDate(actualDay);
                targetDate.setHours(config.hour, config.minute, 0, 0);
            } else {
                log.error('[ScheduledTaskManager] Monthly config missing day parameter');
                return null;
            }
        } else {
            log.error(`[ScheduledTaskManager] Unknown config type: ${config.type}`);
            return null;
        }
        
        return targetDate.getTime();
    }

    /**
     * 执行指定业务类型下所有用户的任务
     */
    private async executeTaskForBusiness(businessType: BusinessType): Promise<void> {
        log.info(`[ScheduledTaskManager] Executing scheduled task for business type: ${businessType}`);
        
        try {
            // 清理该 businessType 的缓存数据
            log.info(`[ScheduledTaskManager] Clearing cache for business type: ${businessType}`);
            clearBusinessTypeCache(businessType);
            
            // 获取该业务类型下的所有用户
            const allUsers = await this.userImpl.getUserInfoList();
            const businessUsers = allUsers.filter(user => user.businessType === businessType);
            
            if (businessUsers.length === 0) {
                log.info(`[ScheduledTaskManager] No users found for business type: ${businessType}`);
                return;
            }
            
            log.info(`[ScheduledTaskManager] Found ${businessUsers.length} users for business type: ${businessType}`);
            
            for(const user of businessUsers) {
                await this.userImpl.runUser(user.username, false).catch(err => {
                    log.error(`[ScheduledTaskManager] Failed to run user ${user.username}:`, err);
                    // 不抛出错误，继续执行其他用户
                });
            }
            log.info(`[ScheduledTaskManager] Completed scheduled task for business type: ${businessType}`);
        } catch (error) {
            log.error(`[ScheduledTaskManager] Error executing task for business type ${businessType}:`, error);
        }
    }

    /**
     * 清除指定业务类型的定时任务
     */
    private clearTaskForBusiness(businessType: BusinessType): void {
        const timer = this.timers.get(businessType);
        if (timer) {
            if (typeof timer === 'number') {
                // setTimeout 返回的数字
                clearTimeout(timer);
            } else {
                // setInterval 返回的 Timer 对象
                clearInterval(timer as any);
            }
            this.timers.delete(businessType);
            log.info(`[ScheduledTaskManager] Cleared task for business type: ${businessType}`);
        }
    }

    /**
     * 重新调度所有任务（用于配置更新时）
     */
    async rescheduleAll(): Promise<void> {
        log.info('[ScheduledTaskManager] Rescheduling all tasks');
        await this.initialize();
    }

    /**
     * 停止所有定时任务
     */
    stopAll(): void {
        log.info('[ScheduledTaskManager] Stopping all scheduled tasks');
        for (const businessType of this.businessTypes) {
            this.clearTaskForBusiness(businessType);
        }
    }
}

// 创建单例实例
let taskManagerInstance: ScheduledTaskManager | null = null;

/**
 * 获取定时任务管理器实例
 */
export function getTaskManager(): ScheduledTaskManager {
    if (!taskManagerInstance) {
        taskManagerInstance = new ScheduledTaskManager();
    }
    return taskManagerInstance;
}

/**
 * 初始化定时任务（在应用启动时调用）
 */
export async function initializeScheduledTasks(): Promise<void> {
    const manager = getTaskManager();
    await manager.initialize();
}

/**
 * 重新调度所有定时任务（在配置更新时调用）
 */
export async function rescheduleScheduledTasks(): Promise<void> {
    const manager = getTaskManager();
    await manager.rescheduleAll();
}

