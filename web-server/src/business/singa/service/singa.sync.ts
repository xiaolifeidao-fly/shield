import { BaseCaseSyncService } from '../../common/base.sync';
import { BaseBusinessApi } from '../../common/base.api';
import { Case, CaseDetail, CustomerInfo, LoanPlan } from '@src/business/common/entities';
import { BusinessType, SyncStats, UserInfo } from '@eleapi/user/user.api';
import { releaseEngineInstance } from '@src/business/common/engine.manager';
import { setGlobal } from '@utils/store/electron';
import log from 'electron-log';

/**
 * Singa 业务同步服务
 * 继承基础同步服务，可以重写特定方法以定制行为
 */
export class SingaCaseSyncService extends BaseCaseSyncService {

  constructor(businessApi: BaseBusinessApi) {
    super(businessApi);
  }

  async release(businessType: BusinessType, username: string): Promise<void> {
    const resourceId = `${username}_${businessType || 'singa'}`;
    await releaseEngineInstance(resourceId);
  }

  async syncUserCases(
    userInfo: UserInfo,
    params: { product?: string; enableDeduplication?: boolean; enableResume?: boolean; [key: string]: any } = {}
  ): Promise<SyncStats> {
    // const types = ["followed_up_task"];
    const types = ["need_follow_up", "followed_up_task"];

    const startTimeMs = Date.now();
    let combinedStats: SyncStats = {
      totalCount: 0,
      successCount: 0,
      skipCount: 0,
      failCount: 0,
      incrementNum: 0,
      running: true,
      startTime: new Date().toISOString(),
      duration: 0,
      lastSyncTime: new Date().toISOString(),
    };

    for (const type of types) {
      const typeParams = { ...params, type };
      log.info(`syncUserCases type: ${type} params: ${JSON.stringify(typeParams)}`);
      const startTime = Date.now();
      const stats = await super.syncUserCases(userInfo, typeParams);
      log.info(`syncUserCases type: ${type} cost: ${Date.now() - startTime}ms, totalCount=${stats.totalCount}, successCount=${stats.successCount}`);

      // 合并统计结果
      combinedStats.totalCount += stats.totalCount || 0;
      combinedStats.successCount += stats.successCount || 0;
      combinedStats.skipCount += stats.skipCount || 0;
      combinedStats.failCount += stats.failCount || 0;
      combinedStats.incrementNum = (combinedStats.incrementNum || 0) + (stats.incrementNum || 0);
    }

    combinedStats.running = false;
    combinedStats.duration = Math.round((Date.now() - startTimeMs) / 1000);

    // 保存统计结果到全局存储
    const { running, ...statsToSave } = combinedStats;
    const statsKey = `sync_stats_${userInfo.username}`;
    setGlobal(statsKey, statsToSave);
    log.info(`syncUserCases combined stats: ${JSON.stringify(combinedStats)}`);
    return combinedStats;
  }
}
