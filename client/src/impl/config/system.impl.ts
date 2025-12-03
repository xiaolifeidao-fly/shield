import { SystemApi } from "@api/system.api";
import { SyncTimeConfig } from "@model/system.types";
import { BusinessType } from "@model/user.types";
import { getGlobal, setGlobal } from "@src/utils/store/conf";
import { rescheduleScheduledTasks, getTaskManager } from "@src/task/task";

const SYNC_TIME_CONFIG_KEY = "syncTimeConfig";

export class SystemImpl extends SystemApi {

    /**
     * Get system sync time configuration (read from store)
     */
    async getSyncTimeConfig(): Promise<SyncTimeConfig> {
        const config = getGlobal(SYNC_TIME_CONFIG_KEY);
        // If no config exists, return default: daily at 0:00
        if (!config) {
            return {
                type: 'daily',
                hour: 0,
                minute: 0
            };
        }
        return config;
    }

    /**
     * Save system sync time configuration (to store)
     */
    async saveSyncTimeConfig(config: SyncTimeConfig): Promise<void> {
        // Validate configuration
        if (config.hour < 0 || config.hour > 23) {
            throw new Error('Hour must be between 0-23');
        }
        if (config.minute < 0 || config.minute > 59) {
            throw new Error('Minute must be between 0-59');
        }
        if (config.type === 'monthly') {
            if (!config.day || config.day < 1 || config.day > 31) {
                throw new Error('Day must be between 1-31');
            }
        }
        setGlobal(SYNC_TIME_CONFIG_KEY, config);
        // 重新调度定时任务
        try {
            await rescheduleScheduledTasks();
        } catch (error) {
            console.error('Failed to reschedule tasks after config update:', error);
        }
    }

    /**
     * Get system sync time configuration by business type
     */
    async getSyncTimeConfigByBusiness(businessType: BusinessType): Promise<SyncTimeConfig> {
        const configKey = `${SYNC_TIME_CONFIG_KEY}_${businessType}`;
        const config = getGlobal(configKey);
        // If no config exists, return default: daily at 0:00
        if (!config) {
            return {
                type: 'daily',
                hour: 0,
                minute: 0,
                businessType
            };
        }
        return { ...config, businessType };
    }

    /**
     * Save system sync time configuration by business type
     */
    async saveSyncTimeConfigByBusiness(businessType: BusinessType, config: SyncTimeConfig): Promise<void> {
        // Validate configuration
        if (config.hour < 0 || config.hour > 23) {
            throw new Error('Hour must be between 0-23');
        }
        if (config.minute < 0 || config.minute > 59) {
            throw new Error('Minute must be between 0-59');
        }
        if (config.type === 'monthly') {
            if (!config.day || config.day < 1 || config.day > 31) {
                throw new Error('Day must be between 1-31');
            }
        }
        const configKey = `${SYNC_TIME_CONFIG_KEY}_${businessType}`;
        setGlobal(configKey, { ...config, businessType });
        // 重新调度该业务类型的定时任务
        try {
            const manager = getTaskManager();
            await manager.scheduleTaskForBusiness(businessType);
        } catch (error) {
            console.error(`Failed to reschedule task for business type ${businessType}:`, error);
        }
    }
}   