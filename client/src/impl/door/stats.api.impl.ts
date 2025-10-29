import { StatsApi } from "@eleapi/door/stats.api";
import { InvokeType, Protocols } from "@eleapi/base";
import log from 'electron-log';
import { getDyUserStatistic, getDyUserTodayStatistic } from "@src/door/dy/store/dy.store";
import { TaskType } from "@model/task.entity";

export class StatsApiImpl extends StatsApi {

    getApiName(): string {
        return "StatsApi";
    }

    @InvokeType(Protocols.INVOKE)
    async getLikeStats(port: string) {
        try {
            const dyUserStatistic = getDyUserStatistic(port, TaskType.DIGG);
            const dyUserTodayStatistic = getDyUserTodayStatistic(port, TaskType.DIGG);
            const mockData = {
                totalLikes:dyUserStatistic.totalLoveNum,
                todayLikes: dyUserTodayStatistic.totalLoveNum,
                successRate: 1
            };
            return {
                success: true,
                data: mockData
            };
        } catch (error: any) {
            log.error('获取点赞统计数据失败:', error);
            return { 
                success: false, 
                message: '获取点赞统计数据失败: ' + error.message 
            };
        }
    }
} 