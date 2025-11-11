import { getGlobal, setGlobal } from '@utils/store/electron';
import { SyncStats, UserInfo, BusinessType } from '@eleapi/user/user.api';
import { Case, CaseDetail, LoanPlan, CustomerInfo, CasePageResponse } from './entities';
import { BaseBusinessApi } from './base.api';
import log from 'electron-log';

/**
 * 同步缓存数据结构
 */
interface SyncCache {
  [caseId: string]: string; // caseId -> 最后同步日期 (YYYY-MM-DD)
}

/**
 * 当日断点续传数据结构
 */
interface ResumeData {
  date: string; // 日期 (YYYY-MM-DD)
  pageNum: number; // 页码
}

/**
 * 运行状态内存存储（username -> running状态）
 */
const runningStatusMap = new Map<string, boolean>();

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 */
function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 检查某个 caseId 今天是否已经同步过
 */
function shouldSync(cache: SyncCache, caseId: string): boolean {
  const today = getTodayString();
  const lastSyncDate = cache[caseId];
  return !lastSyncDate || lastSyncDate !== today;
}

/**
 * 更新缓存：记录某个 caseId 今天已同步
 */
function updateCache(cache: SyncCache, caseId: string): void {
  const today = getTodayString();
  cache[caseId] = today;
}

/**
 * 获取用户的同步缓存
 */
function getUserSyncCache(username: string): SyncCache {
  const cacheKey = `sync_cache_${username}`;
  const cache = getGlobal(cacheKey);
  return cache || {};
}

/**
 * 保存用户的同步缓存
 */
function saveUserSyncCache(username: string, cache: SyncCache): void {
  const cacheKey = `sync_cache_${username}`;
  setGlobal(cacheKey, cache);
}

/**
 * 获取停止标志的 key
 */
function getStopFlagKey(username: string): string {
  return `sync_stop_${username}`;
}

/**
 * 设置停止标志
 */
function setStopFlag(username: string, stop: boolean): void {
  const flagKey = getStopFlagKey(username);
  setGlobal(flagKey, stop);
}

/**
 * 获取停止标志
 */
function getStopFlag(username: string): boolean {
  const flagKey = getStopFlagKey(username);
  return getGlobal(flagKey) || false;
}

/**
 * 获取当日断点续传的 key
 */
function getResumeKey(username: string): string {
  return `sync_resume_${username}`;
}

/**
 * 获取用户的断点续传页码（如果是当日，返回保存的页码；否则返回 1）
 */
function getUserResumePageNum(username: string): number {
  const resumeKey = getResumeKey(username);
  const resumeData: ResumeData | undefined = getGlobal(resumeKey);
  const today = getTodayString();
  
  if (!resumeData || resumeData.date !== today) {
    return 1;
  }
  
  return resumeData.pageNum || 1;
}

/**
 * 保存用户的断点续传页码（当日）
 */
function saveUserResumePageNum(username: string, pageNum: number): void {
  const resumeKey = getResumeKey(username);
  const today = getTodayString();
  const resumeData: ResumeData = {
    date: today,
    pageNum: pageNum,
  };
  setGlobal(resumeKey, resumeData);
}

/**
 * 清除用户的断点续传页码
 */
function clearUserResumePageNum(username: string): void {
  const resumeKey = getResumeKey(username);
  setGlobal(resumeKey, 1);
}

/**
 * 设置用户的运行状态（内存中）
 */
function setRunningStatus(username: string, running: boolean): void {
  runningStatusMap.set(username, running);
}

/**
 * 获取用户的运行状态（内存中）
 */
function getRunningStatus(username: string): boolean {
  return runningStatusMap.get(username) || false;
}

/**
 * 获取用户的同步统计
 */
function getUserSyncStats(username: string): SyncStats {
  const statsKey = `sync_stats_${username}`;
  const stats = getGlobal(statsKey);
  const baseStats = stats || {
    totalCount: 0,
    successCount: 0,
    skipCount: 0,
    failCount: 0,
    lastSyncTime: '',
  };
  return {
    ...baseStats,
    running: getRunningStatus(username),
  };
}

/**
 * 保存用户的同步统计（不保存 running 状态到 store）
 */
function saveUserSyncStats(username: string, stats: SyncStats): void {
  const statsKey = `sync_stats_${username}`;
  const { running, ...statsToSave } = stats;
  setGlobal(statsKey, statsToSave);
  if (running !== undefined) {
    setRunningStatus(username, running);
  }
}

/**
 * 获取用户信息
 */
function getUserInfo(username: string): UserInfo | null {
  const USER_LIST_KEY = "userList";
  const userList = getGlobal(USER_LIST_KEY);
  if (!userList || !Array.isArray(userList)) {
    return null;
  }
  return userList.find((u: UserInfo) => u.username === username) || null;
}

/**
 * 初始化同步统计信息
 */
function initSyncStats(): SyncStats {
  return {
    totalCount: 0,
    successCount: 0,
    skipCount: 0,
    failCount: 0,
    lastSyncTime: new Date().toISOString(),
  };
}

/**
 * 检查是否还有更多页需要查询
 */
function hasMorePages(
  recordsLength: number,
  pageNum: number,
  totalPages: number,
  pageSize: number
): boolean {
  return recordsLength >= pageSize && pageNum < totalPages;
}

/**
 * 抽象业务同步服务基类
 * 提供通用的同步逻辑，子类可以重写特定方法以定制行为
 */
export abstract class BaseCaseSyncService {
  protected businessApi: BaseBusinessApi;

  constructor(businessApi: BaseBusinessApi) {
    this.businessApi = businessApi;
  }

  /**
   * 同步单个案例（子类可以重写此方法以定制行为）
   */
  protected async syncSingleCase(
    username: string,
    caseItem: Case,
    cache: SyncCache,
    stats: SyncStats,
    enableDeduplication: boolean = true
  ): Promise<boolean> {
    if (enableDeduplication && !shouldSync(cache, caseItem.caseId)) {
      stats.skipCount++;
      return false;
    }

    try {
      if (!caseItem.product) {
        log.warn(`Case ${caseItem.caseId} has no product, skipping detail query`);
        stats.failCount++;
        return false;
      }
      // log.info(`syncSingleCase caseItem: ${JSON.stringify(caseItem)}`);
      // 获取案例详情
      log.info(`syncSingleCase start getCaseDetail caseItem`);
      const caseDetail = await this.businessApi.getCaseDetail(caseItem.product, caseItem);
      log.info(`syncSingleCase end getCaseDetail caseItem`);
      // 获取还款计划
      let loanPlan: LoanPlan[] = [];
      try {
        loanPlan = await this.businessApi.getLoanPlan(caseDetail.customerId);
      } catch (error) {
        log.warn(`Failed to get loan plan for customer ${caseDetail.customerId}:`, error);
      }

      // 解密手机号（如果业务支持）
      await this.decryptPhoneNumbers(caseDetail, caseItem);

      // 获取客户信息
      let customerInfo: CustomerInfo;
      try {
        customerInfo = await this.businessApi.getCustomerInfo(caseItem.product, caseItem);
      } catch (error) {
        log.warn(`Failed to get customer info for customer ${caseDetail.customerId}:`, error);
        throw new Error(`Failed to get customer info for customer ${caseDetail.customerId}`);
      }
      // 获取用户的 businessType
      const userInfo = getUserInfo(username);
      const businessType = userInfo?.businessType;

      // 写入案例数据
      await this.writeCase(caseDetail, loanPlan, customerInfo, businessType);
      // 如果启用去重，更新缓存
      if (enableDeduplication) {
        updateCache(cache, caseItem.caseId);
        saveUserSyncCache(username, cache);
      }

      stats.successCount++;
      saveUserSyncStats(username, stats);

      return true;
    } catch (error) {
      log.error(`Failed to sync case ${caseItem}:`, error);
      stats.failCount++;
      saveUserSyncStats(username, stats);
      return false;
    }
  }

  /**
   * 解密手机号（子类可以重写此方法以定制行为）
   */
  protected async decryptPhoneNumbers(caseDetail: CaseDetail, caseItem: Case): Promise<void> {
    // 默认实现：如果业务 API 支持解密，则调用
      // 解密本人手机号
      if (caseDetail.mobile) {
        try {
          const decryptedMobile = await this.businessApi.decryptPhone?.({
            auditDataType: 'CASE_DETAIL_BASIC_INFO_OWN_PHONE',
            customerId: caseDetail.customerId,
            productEnum: caseItem.product,
          });
          if (decryptedMobile) {  
            caseDetail.mobile = decryptedMobile;
          }
        } catch (error) {
          log.warn(`Failed to decrypt mobile for case ${caseItem.caseId}:`, error);
        }
      }

      // 解密备用手机号
      if (caseDetail.backupMobile) {
        try {
          const decryptedBackupMobile = await this.businessApi.decryptPhone?.({
            auditDataType: 'CASE_DETAIL_BASIC_INFO_BACKUP_PHONE',
            customerId: caseDetail.customerId,
            productEnum: caseItem.product,
          });
          if (decryptedBackupMobile) {
            caseDetail.backupMobile = decryptedBackupMobile;
          }
        } catch (error) {
          log.warn(`Failed to decrypt backupMobile for case ${caseItem.caseId}:`, error);
        }
      }
  }

  /**
   * 写入案例数据（子类可以重写此方法以定制行为）
   */
  protected async writeCase(
    caseDetail: CaseDetail,
    loanPlan: LoanPlan[],
    customerInfo: CustomerInfo,
    businessType: BusinessType | undefined
  ): Promise<void> {
    await this.businessApi.writeCase(caseDetail, loanPlan, customerInfo, businessType);
  }

  /**
   * 同步一页的案例数据
   */
  protected async syncPageCases(
    username: string,
    records: Case[],
    cache: SyncCache,
    stats: SyncStats,
    enableDeduplication: boolean = true
  ): Promise<boolean> {
    for (const caseItem of records) {
      if (getStopFlag(username)) {
        log.info(`syncPageCases stop flag is true, return true`);
        return true;
      }
      stats.totalCount++;
      await this.syncSingleCase(username, caseItem, cache, stats, enableDeduplication);
    }
    return false;
  }

  /**
   * 同步用户的案例列表
   */
  async syncUserCases(
    userInfo: UserInfo,
    params: { product?: string; enableDeduplication?: boolean; enableResume?: boolean; [key: string]: any } = {}
  ): Promise<SyncStats> {
    const username = userInfo.username;
    setStopFlag(username, false);
    
    // 设置当前用户
    this.businessApi.setCurrentUser(userInfo);
    
    const existingStats = getUserSyncStats(username);
    const stats: SyncStats = {
      ...existingStats,
      totalCount: 0,
      successCount: 0,
      skipCount: 0,
      failCount: 0,
      running: true,
      startTime: new Date().toISOString(),
      duration: 0,
      lastSyncTime: new Date().toISOString(),
    };
    
    const cache = getUserSyncCache(username);
    const startTimeMs = Date.now();
    const enableDeduplication = params.enableDeduplication !== undefined ? params.enableDeduplication : true;
    const enableResume = params.enableResume !== undefined ? params.enableResume : false;

    let pageNum: number;
    if (enableResume) {
      pageNum = getUserResumePageNum(username);
      log.info(`Resume enabled, starting from page ${pageNum}`);
    } else {
      pageNum = 1;
      clearUserResumePageNum(username);
      log.info(`Resume disabled, starting from page 1`);
    }
    
    const pageSize = 20;

    try {
      log.info(`saveUserSyncStats: ${JSON.stringify(stats)}`);
      saveUserSyncStats(username, stats);
      
      while (true) {
        if (getStopFlag(username)) {
          stats.running = false;
          stats.duration = Math.round((Date.now() - startTimeMs) / 1000);
          saveUserSyncStats(username, stats);
          break;
        }
        
        const startTime = Date.now();
        log.info("start sync page: " + pageNum);
        const pageResponse = await this.getCasePage(pageNum, pageSize, params);
        
        log.info(`pageResponse: ${JSON.stringify(pageResponse.total)} total records : ${pageResponse?.records?.length} cost: ${Math.round((Date.now() - startTime) / 1000)}s`);
        if (!pageResponse?.records || pageResponse?.records?.length === 0) {
          break;
        }

        const stopped = await this.syncPageCases(username, pageResponse.records, cache, stats, enableDeduplication);
        
        stats.duration = Math.round((Date.now() - startTimeMs) / 1000);
        saveUserSyncStats(username, stats);

        if (stopped) {
          stats.running = false;
          saveUserSyncStats(username, stats);
          break;
        }

        if (!hasMorePages(
          pageResponse.records.length,
          pageNum,
          pageResponse.pages,
          pageSize
        )) {
          break;
        }

        pageNum++;
        
        if (enableResume) {
          saveUserResumePageNum(username, pageNum);
          log.info(`Saved resume pageNum ${pageNum} for user ${username}`);
        }
      }

      stats.running = false;
      stats.duration = Math.round((Date.now() - startTimeMs) / 1000);
      stats.lastSyncTime = new Date().toISOString();
      saveUserSyncStats(username, stats);
      
      if (enableResume) {
        clearUserResumePageNum(username);
        log.info(`Sync completed, cleared resume pageNum for user ${username}`);
      }

      return stats;
    } catch (error) {
      stats.running = false;
      stats.duration = Math.round((Date.now() - startTimeMs) / 1000);
      saveUserSyncStats(username, stats);
      throw error;
    }
  }

  async getCasePage(pageNum: number, pageSize: number, params: any){
    let retryNum = 3;
    while(retryNum > 0){
      try{
        const pageResponse = await this.businessApi.getCasePage({
          pageNum,
          pageSize,
          ...params,
        });
        return pageResponse;
      } catch (error) {
          log.error(`getCasePage error:`, error);
          retryNum--;
      }
    }
    throw new Error(`getCasePage failed after ${retryNum} retries`);
  }

  /**
   * 获取用户的同步统计
   */
  getUserSyncStatsInfo(username: string): SyncStats {
    return getUserSyncStats(username);
  }

  /**
   * 停止用户的同步任务
   */
  stopUserSync(username: string): void {
    setStopFlag(username, true);
  }
}

