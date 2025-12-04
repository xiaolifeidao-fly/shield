import { BaseCaseSyncService } from '../../common/base.sync';
import { BaseBusinessApi } from '../../common/base.api';
import { Case, CaseDetail, LoanPlan } from '../../common/entities';
import { BusinessType, SyncStats } from '@model/user.types';
import { getLoanPlan } from '../api/loan.api';
import log from '../../../utils/logger';

interface SyncCache {
  [caseId: string]: string;
}

/**
 * KAT 业务同步服务
 * 继承基础同步服务，可以重写特定方法以定制行为
 */
export class KatCaseSyncService extends BaseCaseSyncService {
  
  constructor(businessApi: BaseBusinessApi) {
    super(businessApi);
  }

  async release(businessType: BusinessType, username: string): Promise<void> {
    // KAT 业务暂无特殊的释放逻辑
  }

  /**
   * 重写同步单个案例方法，因为 KAT 的 API 结构与 adapundi 不同
   */
  protected async syncSingleCase(
    username: string,
    caseItem: Case,
    cache: SyncCache,
    stats: SyncStats,
    enableDeduplication: boolean = true,
  ): Promise<boolean> {
    // 获取用户的 businessType
    const userInfo = this.businessApi.getCurrentUser();
    const businessType = userInfo?.businessType;
    
    if (!businessType) {
      log.error(`Failed to get businessType for user ${username}`);
      stats.failCount++;
      return false;
    }

    // 去重检查
    if (enableDeduplication) {
      const { getGlobal, setGlobal } = await import('@src/utils/store/conf');
      const cacheKey = `sync_cache_${username}_${businessType}`;
      const existingCache = getGlobal(cacheKey) || {};
      const today = this.getTodayString();
      
      if (existingCache[caseItem.caseId] === today) {
        log.info(`syncSingleCase skip case: ${caseItem.caseId} because it has been synced today`);
        stats.skipCount++;
        this.saveUserSyncStats(username, stats);
        return false;
      }
    }

    try {
      // 设置固定的产品类型为 KAT
      const product = 'KAT';
      
      // 获取案例详情
      const caseDetail = await this.businessApi.getCaseDetail(product, caseItem);
      
      // 获取还款计划 - KAT 使用 caseId 而不是 customerId
      let loanPlan: LoanPlan[] = [];
      try {
        loanPlan = await getLoanPlan(caseItem.caseId);
      } catch (error) {
        log.warn(`Failed to get loan plan for case ${caseItem.caseId}:`, error);
      }

      // KAT 不需要解密手机号
      // 手机号已经是明文

      // 获取客户信息
      let customerInfo;
      try {
        customerInfo = await this.businessApi.getCustomerInfo(product, caseItem);
      } catch (error) {
        log.warn(`Failed to get customer info for case ${caseItem.caseId}:`, error);
        throw new Error(`Failed to get customer info for case ${caseItem.caseId}`);
      }

      // 写入案例数据
      await this.writeCase(caseDetail, loanPlan, customerInfo, businessType);
      
      // 如果启用去重，更新缓存
      if (enableDeduplication) {
        const { getGlobal, setGlobal } = await import('@src/utils/store/conf');
        const cacheKey = `sync_cache_${username}_${businessType}`;
        const existingCache = getGlobal(cacheKey) || {};
        const today = this.getTodayString();
        existingCache[caseItem.caseId] = today;
        setGlobal(cacheKey, existingCache);
      }

      stats.successCount++;
      this.saveUserSyncStats(username, stats);

      return true;
    } catch (error) {
      log.error(`Failed to sync case ${caseItem.caseId}:`, error);
      stats.failCount++;
      this.saveUserSyncStats(username, stats);
      return false;
    }
  }

  /**
   * 获取今天的日期字符串 (YYYY-MM-DD)
   */
  private getTodayString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 保存用户的同步统计
   */
  private saveUserSyncStats(username: string, stats: SyncStats): void {
    const { getGlobal, setGlobal } = require('@src/utils/store/conf');
    const statsKey = `sync_stats_${username}`;
    const { running, ...statsToSave } = stats;
    setGlobal(statsKey, statsToSave);
  }

  /**
   * KAT 不需要解密手机号，重写为空实现
   */
  protected async decryptPhoneNumbers(caseDetail: CaseDetail, caseItem: Case): Promise<void> {
    // KAT 的手机号已经是明文，不需要解密
  }
}

