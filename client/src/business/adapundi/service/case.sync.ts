import { SyncStats, UserInfo, BusinessType } from "@eleapi/user/user.api";
import { businessFactoryRegistry } from "../../common/factory";
import { BaseBusinessApi } from "../../common/base.api";
import { getGlobal } from "../../../../../common/utils/store/electron";
import log from "electron-log";

/**
 * 通用案例同步服务适配器
 * 通过 businessType 获取对应的同步服务实例，适配不同业务类型
 */

/**
 * 同步用户的案例列表（通用适配器）
 * 根据 userInfo.businessType 自动获取对应的同步服务
 * @param userInfo 用户信息（必须包含 businessType）
 * @param params 额外的查询参数（如 product、enableDeduplication、enableResume 等）
 */
export async function syncUserCases(
  userInfo: UserInfo,
  params: { product?: string; enableDeduplication?: boolean; enableResume?: boolean; [key: string]: any } = {}
): Promise<SyncStats> {
  if (!userInfo.businessType) {
    throw new Error(`用户 ${userInfo.username} 未设置业务类型`);
  }

  // 检查业务类型是否已注册
  if (!businessFactoryRegistry.hasBusinessType(userInfo.businessType)) {
    throw new Error(`业务类型 ${userInfo.businessType} 未注册`);
  }

  // 根据 businessType 获取对应的同步服务
  const syncService = businessFactoryRegistry.getSyncService(userInfo.businessType);
  
  // 调用同步服务的 syncUserCases 方法
  return await syncService.syncUserCases(userInfo, params);
}

/**
 * 获取用户的同步统计（通用适配器）
 * 注意：此方法需要从用户信息中获取 businessType
 */
export function getUserSyncStatsInfo(username: string): SyncStats {
  // 从 store 中获取用户信息以确定 businessType
  const USER_LIST_KEY = "userList";
  const userList = getGlobal(USER_LIST_KEY);
  if (!userList || !Array.isArray(userList)) {
    throw new Error(`用户 ${username} 不存在`);
  }
  const userInfo = userList.find((u: UserInfo) => u.username === username);
  if (!userInfo || !userInfo.businessType) {
    throw new Error(`用户 ${username} 未设置业务类型`);
  }

  // 根据 businessType 获取对应的同步服务
  const syncService = businessFactoryRegistry.getSyncService(userInfo.businessType);
  return syncService.getUserSyncStatsInfo(username);
}

/**
 * 停止用户的同步任务（通用适配器）
 * 注意：此方法需要从用户信息中获取 businessType
 */
export function stopUserSync(username: string): void {
  // 从 store 中获取用户信息以确定 businessType
  const USER_LIST_KEY = "userList";
  const userList = getGlobal(USER_LIST_KEY);
  if (!userList || !Array.isArray(userList)) {
    throw new Error(`用户 ${username} 不存在`);
  }
  const userInfo = userList.find((u: UserInfo) => u.username === username);
  if (!userInfo || !userInfo.businessType) {
    throw new Error(`用户 ${username} 未设置业务类型`);
  }

  // 根据 businessType 获取对应的同步服务
  const syncService = businessFactoryRegistry.getSyncService(userInfo.businessType);
  syncService.stopUserSync(username);
}

/**
 * 通过工厂获取指定业务类型的业务 API 实例
 * 用于在需要调用不同业务类型 API 的场景
 * @param businessType 业务类型
 * @returns 业务 API 实例
 */
export function getBusinessApi(businessType: BusinessType): BaseBusinessApi {
  if (!businessFactoryRegistry.hasBusinessType(businessType)) {
    throw new Error(`业务类型 ${businessType} 未注册`);
  }
  return businessFactoryRegistry.getBusinessApi(businessType);
}

/**
 * 通过用户名获取对应的业务 API 实例
 * 从用户信息中获取 businessType，然后返回对应的 API 实例
 * @param username 用户名
 * @returns 业务 API 实例
 */
export function getBusinessApiByUsername(username: string): BaseBusinessApi {
  const USER_LIST_KEY = "userList";
  const userList = getGlobal(USER_LIST_KEY);
  if (!userList || !Array.isArray(userList)) {
    throw new Error(`用户 ${username} 不存在`);
  }
  const userInfo = userList.find((u: UserInfo) => u.username === username);
  if (!userInfo || !userInfo.businessType) {
    throw new Error(`用户 ${username} 未设置业务类型`);
  }
  return getBusinessApi(userInfo.businessType);
}