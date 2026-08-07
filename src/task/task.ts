import { BusinessType } from "@model/user.types";
import { SyncTimeConfig } from "@model/system.types";
import { SystemImpl } from "@src/impl/config/system.impl";
import { UserImpl } from "@src/impl/user/user.impl";
import { clearBusinessTypeCache } from "@src/business/common/base.sync";
import { CrawlerEndStatus, notifyCrawlerEnd, notifyCrawlerStart } from "@src/business/common/crawler-data-days.api";
import { calculateNextExecutionTime, PreemptiveRunController, ScheduleRevision } from './schedule.core';
import log from '../utils/logger';

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

interface ScheduledRunContext {
    cancelled: boolean;
    cancelReason?: string;
    currentUsername?: string;
}

/**
 * 定时任务管理器
 * 根据业务类型的定时配置，定时执行该业务类型下所有用户的 run 操作
 */
export class ScheduledTaskManager {
    private timers: Map<BusinessType, NodeJS.Timeout> = new Map();
    private scheduleRevisions: Map<BusinessType, ScheduleRevision> = new Map();
    private runControllers: Map<BusinessType, PreemptiveRunController> = new Map();
    private systemImpl: SystemImpl;
    private userImpl: UserImpl;
    // 支持的业务类型；初始化/重调度时仅这些类型会被自动跑任务
    // 当前分支只跑 SINGA
    private readonly businessTypes: BusinessType[] = ['SINGA'];

    constructor() {
        this.systemImpl = new SystemImpl();
        this.userImpl = new UserImpl();
    }

    private getScheduleRevision(businessType: BusinessType): ScheduleRevision {
        let revision = this.scheduleRevisions.get(businessType);
        if (!revision) {
            revision = new ScheduleRevision();
            this.scheduleRevisions.set(businessType, revision);
        }
        return revision;
    }

    private getRunController(businessType: BusinessType): PreemptiveRunController {
        let controller = this.runControllers.get(businessType);
        if (!controller) {
            controller = new PreemptiveRunController();
            this.runControllers.set(businessType, controller);
        }
        return controller;
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
        const revision = this.getScheduleRevision(businessType);
        const version = revision.advance();
        this.clearTaskForBusiness(businessType);

        try {
            const config = await this.systemImpl.getSyncTimeConfigByBusiness(businessType);
            if (!revision.isCurrent(version)) {
                log.info(`[ScheduledTaskManager] Ignoring stale schedule request for ${businessType}, version=${version}`);
                return;
            }

            this.armNextTimer(businessType, config, version, new Date());
        } catch (error) {
            log.error(`[ScheduledTaskManager] Failed to schedule task for ${businessType}:`, error);
        }
    }

    /**
     * 始终只保留一个有效定时器。定时器到点后会先挂下一次，再执行本轮任务。
     */
    private armNextTimer(
        businessType: BusinessType,
        config: SyncTimeConfig,
        version: number,
        referenceTime: Date
    ): void {
        const revision = this.getScheduleRevision(businessType);
        if (!revision.isCurrent(version)) {
            return;
        }

        const nextExecutionTime = calculateNextExecutionTime(config, referenceTime);
        if (!nextExecutionTime) {
            log.warn(`[ScheduledTaskManager] No valid execution time calculated for business type: ${businessType}`);
            return;
        }

        this.clearTaskForBusiness(businessType);
        const delay = Math.max(0, nextExecutionTime - Date.now());
        let timer: NodeJS.Timeout;
        timer = setTimeout(() => {
            if (this.timers.get(businessType) === timer) {
                this.timers.delete(businessType);
            }
            void this.handleScheduledTime(businessType, config, version, nextExecutionTime).catch(error => {
                log.error(`[ScheduledTaskManager] Scheduled trigger failed for ${businessType}:`, error);
            });
        }, delay);
        this.timers.set(businessType, timer);
        log.info(`[ScheduledTaskManager] Scheduled ${businessType} task for ${new Date(nextExecutionTime).toLocaleString()}, version=${version}`);
    }

    /**
     * 到达新的执行时间时，先按同一份最新配置安排下一次，再抢占旧任务。
     */
    private async handleScheduledTime(
        businessType: BusinessType,
        config: SyncTimeConfig,
        version: number,
        scheduledAt: number
    ): Promise<void> {
        const revision = this.getScheduleRevision(businessType);
        if (!revision.isCurrent(version)) {
            log.info(`[ScheduledTaskManager] Ignoring stale timer for ${businessType}, version=${version}`);
            return;
        }

        // 基于本次计划时间计算下一次，避免任务运行时长改变固定执行时刻。
        this.armNextTimer(businessType, config, version, new Date(scheduledAt + 1000));

        const controller = this.getRunController(businessType);
        const cancelReason = `superseded by scheduled run at ${new Date(scheduledAt).toISOString()}`;
        await controller.replace(
            () => {
                const context: ScheduledRunContext = { cancelled: false };
                const completed = this.executeTaskForBusiness(businessType, context);
                return {
                    completed,
                    cancel: async (reason: string) => {
                        context.cancelled = true;
                        context.cancelReason = reason;
                        const currentUsername = context.currentUsername;
                        log.warn(`[ScheduledTaskManager] Preempting previous ${businessType} run: ${reason}`);
                        if (currentUsername) {
                            try {
                                await this.userImpl.stopUser(currentUsername);
                            } catch (error) {
                                log.error(`[ScheduledTaskManager] Failed to stop active user ${currentUsername}:`, error);
                            }
                        }
                    },
                };
            },
            () => revision.isCurrent(version),
            cancelReason
        );
    }

    /**
     * 执行指定业务类型下所有用户的任务
     */
    private async executeTaskForBusiness(businessType: BusinessType, context: ScheduledRunContext): Promise<void> {
        log.info(`[ScheduledTaskManager] Executing scheduled task for business type: ${businessType}`);
        const crawlDate = formatLocalDate(new Date());
        let crawlerEndStatus: CrawlerEndStatus = 'SUCCESS';
        const failureReasons: string[] = [];
        const markCancelled = (): void => {
            crawlerEndStatus = 'FAILED';
            const reason = context.cancelReason || 'cancelled by a newer scheduled run';
            if (!failureReasons.includes(reason)) {
                failureReasons.push(reason);
            }
        };

        try {
            await notifyCrawlerStart(businessType, crawlDate).catch(error => {
                log.error(`[ScheduledTaskManager] Failed to notify crawler start for ${businessType} ${crawlDate}:`, error);
            });
            if (context.cancelled) {
                markCancelled();
                return;
            }

            // 读取是否跳过今日已同步案件的配置
            const skipSyncedCases = await this.systemImpl.getSkipSyncedCases(businessType);
            log.info(`[ScheduledTaskManager] skipSyncedCases config: ${skipSyncedCases}`);
            if (context.cancelled) {
                markCancelled();
                return;
            }

            if (!skipSyncedCases) {
                // 默认行为：清理缓存，全量更新
                log.info(`[ScheduledTaskManager] Clearing cache for business type: ${businessType}`);
                await clearBusinessTypeCache(businessType);
            } else {
                log.info(`[ScheduledTaskManager] Skipping cache clear for business type: ${businessType} (skipSyncedCases=true)`);
            }
            if (context.cancelled) {
                markCancelled();
                return;
            }
            
            // 获取该业务类型下的所有用户
            const allUsers = await this.userImpl.getUserInfoList();
            const businessUsers = allUsers.filter(user => user.businessType === businessType);
            
            if (businessUsers.length === 0) {
                log.info(`[ScheduledTaskManager] No users found for business type: ${businessType}`);
                return;
            }
            
            log.info(`[ScheduledTaskManager] Found ${businessUsers.length} users for business type: ${businessType}: ${businessUsers.map(u => u.username).join(',')}`);

            // 所有业务保持串行执行，单个账号失败时继续执行后续账号
            for (const [index, user] of businessUsers.entries()) {
                if (context.cancelled) {
                    markCancelled();
                    break;
                }

                log.info(`[ScheduledTaskManager] Starting user ${user.username} (${index + 1}/${businessUsers.length})`);
                context.currentUsername = user.username;
                try {
                    await this.userImpl.runUser(user.username, skipSyncedCases);
                    if (context.cancelled) {
                        markCancelled();
                        log.warn(`[ScheduledTaskManager] User ${user.username} stopped because a newer scheduled run is due`);
                        break;
                    }
                    log.info(`[ScheduledTaskManager] Completed user ${user.username} (${index + 1}/${businessUsers.length})`);
                } catch (err) {
                    log.error(`[ScheduledTaskManager] Failed to run user ${user.username}:`, err);
                    crawlerEndStatus = 'FAILED';
                    failureReasons.push(`user ${user.username}: ${getErrorMessage(err)}`);
                    log.warn(`[ScheduledTaskManager] Skipping failed user ${user.username} and continuing with remaining users`);
                } finally {
                    if (context.currentUsername === user.username) {
                        context.currentUsername = undefined;
                    }
                }
            }
            if (!context.cancelled) {
                log.info(`[ScheduledTaskManager] Completed scheduled task for business type: ${businessType}`);
            }
        } catch (error) {
            crawlerEndStatus = 'FAILED';
            failureReasons.push(getErrorMessage(error));
            log.error(`[ScheduledTaskManager] Error executing task for business type ${businessType}:`, error);
        } finally {
            const reason = failureReasons.length > 0 ? failureReasons.join('; ').slice(0, 1000) : undefined;
            await notifyCrawlerEnd(businessType, crawlDate, crawlerEndStatus, reason).catch(error => {
                log.error(`[ScheduledTaskManager] Failed to notify crawler end for ${businessType} ${crawlDate}:`, error);
            });
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
            this.getScheduleRevision(businessType).advance();
            this.clearTaskForBusiness(businessType);
            void this.getRunController(businessType).stop('scheduled tasks stopped').catch(error => {
                log.error(`[ScheduledTaskManager] Failed to stop active ${businessType} run:`, error);
            });
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
