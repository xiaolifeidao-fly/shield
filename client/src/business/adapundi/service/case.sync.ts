import { getCasePage, getCaseDetail, Case, CaseDetail } from "../api/case.api";
import { getGlobal, setGlobal } from "../../../../../common/utils/store/electron";
import { getLoanPlan, LoanPlan } from "../api/loan.api";
import { decryptPhone, AuditDataType } from "../api/phone.api";
import { getCustomerInfo, CustomerInfo } from "../api/customer.api";
import { SyncStats, UserInfo, BusinessType } from "@eleapi/user/user.api";
import { writeCase as writeCaseApi } from "../api/writeCase.api";
import log from "electron-log";

/**
 * 运行状态内存存储（username -> running状态）
 */
const runningStatusMap = new Map<string, boolean>();

/**
 * 同步缓存数据结构
 */
interface SyncCache {
  [caseId: string]: string; // caseId -> 最后同步日期 (YYYY-MM-DD)
}

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
  
  // 如果没有缓存记录，或者最后同步日期不是今天，则需要同步
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
  // 从内存中获取 running 状态
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
  // 只保存非 running 字段到 store
  const { running, ...statsToSave } = stats;
  setGlobal(statsKey, statsToSave);
  // 单独处理 running 状态到内存
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
 * 写入案例数据
 * @param caseDetail 案例详情（手机号已解密为明文）
 * @param loanPlan 还款计划列表
 * @param customerInfo 客户信息
 * @param businessType 业务类型（用于设置 loanSource）
 */
async function writeCase(
  caseDetail: CaseDetail, 
  loanPlan: LoanPlan[], 
  customerInfo: CustomerInfo,
  businessType: BusinessType | undefined
): Promise<void> {
  // 调用 writeCase API 接口
  await writeCaseApi(caseDetail, loanPlan, customerInfo, businessType);
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
 * 同步单个案例
 * @param username 用户名
 * @param caseItem 案例信息
 * @param cache 同步缓存
 * @param stats 统计信息
 * @returns 是否同步成功
 */
async function syncSingleCase(
  username: string,
  caseItem: Case,
  cache: SyncCache,
  stats: SyncStats
): Promise<boolean> {
  // 检查是否需要同步（每天最多同步成功1次）
  if (!shouldSync(cache, caseItem.caseId)) {
    stats.skipCount++;
    return false;
  }

  try {
    // 查询案例详情
    if (!caseItem.product) {
      log.warn(`Case ${caseItem.caseId} has no product, skipping detail query`);
      stats.failCount++;
      return false;
    }

    const caseDetail = await getCaseDetail(caseItem.product, caseItem.id);
    // 获取还款计划
    let loanPlan: LoanPlan[] = [];
    try {
      loanPlan = await getLoanPlan(caseDetail.customerId);
    } catch (error) {
      log.warn(`Failed to get loan plan for customer ${caseDetail.customerId}:`, error);
      // 还款计划获取失败不影响主流程，使用空数组
    }

    // 解密手机号和备用手机号，替换为明文
    
    // 解密本人手机号
    if (caseDetail.mobile) {
      try {
        const decryptedMobile = await decryptPhone({
          auditDataType: AuditDataType.CASE_DETAIL_BASIC_INFO_OWN_PHONE,
          customerId: caseDetail.customerId,
          productEnum: caseItem.product,
        });
        caseDetail.mobile = decryptedMobile;
      } catch (error) {
        log.warn(`Failed to decrypt mobile for case ${caseItem.caseId}:`, error);
        // 解密失败时保留原值
      }
    }

    // 解密备用手机号
    if (caseDetail.backupMobile) {
      try {
        const decryptedBackupMobile = await decryptPhone({
          auditDataType: AuditDataType.CASE_DETAIL_BASIC_INFO_BACKUP_PHONE,
          customerId: caseDetail.customerId,
          productEnum: caseItem.product,
        });
        caseDetail.backupMobile = decryptedBackupMobile;
      } catch (error) {
        log.warn(`Failed to decrypt backupMobile for case ${caseItem.caseId}:`, error);
        // 解密失败时保留原值
      }
    }

    // 获取客户信息
    let customerInfo: CustomerInfo;
    try {
      customerInfo = await getCustomerInfo(caseItem.product, caseDetail.customerId);
    } catch (error) {
      log.warn(`Failed to get customer info for customer ${caseDetail.customerId}:`, error);
      // 客户信息获取失败不影响主流程，但需要抛出错误或使用默认值
      // 这里根据业务需求决定：如果客户信息必需，则抛出错误；如果可选，可以使用默认值或空对象
      throw new Error(`Failed to get customer info for customer ${caseDetail.customerId}`);
    }

    // 获取用户的 businessType
    const userInfo = getUserInfo(username);
    const businessType = userInfo?.businessType;

    // 写入案例数据（使用解密后的数据）
    await writeCase(caseDetail, loanPlan, customerInfo, businessType);

    // 更新缓存：记录今天已同步
    updateCache(cache, caseItem.caseId);

    // 立即保存缓存到 store
    saveUserSyncCache(username, cache);

    // 更新统计：成功数量
    stats.successCount++;
    
    // 保存统计信息
    saveUserSyncStats(username, stats);

    return true;
  } catch (error) {
    // 写入失败，不更新缓存，计入失败数量
    log.error(`Failed to sync case ${caseItem.caseId}:`, error);
    stats.failCount++;
    saveUserSyncStats(username, stats);
    return false;
  }
}

/**
 * 同步一页的案例数据
 * @param username 用户名
 * @param records 当前页的案例列表
 * @param cache 同步缓存
 * @param stats 统计信息
 * @returns 是否被停止
 */
async function syncPageCases(
  username: string,
  records: Case[],
  cache: SyncCache,
  stats: SyncStats
): Promise<boolean> {
  for (const caseItem of records) {
    // 检查停止标志
    if (getStopFlag(username)) {
      return true; // 被停止
    }
    stats.totalCount++;
    await syncSingleCase(username, caseItem, cache, stats);
  }
  return false; // 未被停止
}

/**
 * 同步用户的案例列表
 * @param username 用户名
 * @param params 额外的查询参数（如 product 等）
 */
export async function syncUserCases(
  userInfo: UserInfo,
  params: { product?: string; [key: string]: any } = {}
): Promise<SyncStats> {
  // 清除之前的停止标志
  const username = userInfo.username;
  setStopFlag(username, false);
  
  // 导入并设置当前用户
  const { setCurrentUser } = await import('../api/adapundi.axios');
  setCurrentUser(userInfo);
  
  // 获取或初始化统计信息
  const existingStats = getUserSyncStats(username);
  const stats = {
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

  let pageNum = 1;
  const pageSize = 20;

  try {
    // 保存初始状态
    log.info(`saveUserSyncStats: ${JSON.stringify(stats)}`);
    saveUserSyncStats(username, stats);
    // todo 测试用，后续删除
    while (pageNum <= 1) {
      // 检查停止标志
      if (getStopFlag(username)) {
        stats.running = false;
        stats.duration = Math.round((Date.now() - startTimeMs) / 1000);
        saveUserSyncStats(username, stats);
        break;
      }
      log.info("start sync page: " + pageNum);
      // 查询当前页的案例列表
      const pageResponse = await getCasePage({
        pageNum,
        pageSize,
        ...params,
      });
      log.info(`pageResponse: ${JSON.stringify(pageResponse.total)} total pages: ${pageResponse.pages} `);
      // 如果没有数据，结束循环
      if (!pageResponse.records || pageResponse.records.length === 0) {
        break;
      }

      // 同步当前页的案例
      const stopped = await syncPageCases(username, pageResponse.records, cache, stats);
      
      // 更新运行时长
      stats.duration = Math.round((Date.now() - startTimeMs) / 1000);
      saveUserSyncStats(username, stats);

      if (stopped) {
        stats.running = false;
        saveUserSyncStats(username, stats);
        break;
      }

      // 检查是否还有更多页
      if (!hasMorePages(
        pageResponse.records.length,
        pageNum,
        pageResponse.pages,
        pageSize
      )) {
        break;
      }

      pageNum++;
    }

    // 同步完成，更新状态
    stats.running = false;
    stats.duration = Math.round((Date.now() - startTimeMs) / 1000);
    stats.lastSyncTime = new Date().toISOString();
    saveUserSyncStats(username, stats);

    return stats;
  } catch (error) {
    // 即使出错，也要保存已处理的统计信息
    stats.running = false;
    stats.duration = Math.round((Date.now() - startTimeMs) / 1000);
    saveUserSyncStats(username, stats);
    throw error;
  }
}

/**
 * 获取用户的同步统计
 */
export function getUserSyncStatsInfo(username: string): SyncStats {
  return getUserSyncStats(username);
}

/**
 * 停止用户的同步任务
 */
export function stopUserSync(username: string): void {
  setStopFlag(username, true);
}