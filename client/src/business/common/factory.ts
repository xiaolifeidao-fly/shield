import { BusinessType } from '@model/user.types';
import { BaseBusinessApi } from './base.api';
import { BaseCaseSyncService } from './base.sync';

/**
 * 业务 API 工厂接口
 */
export interface BusinessApiFactory {
  createApi(): BaseBusinessApi;
}

/**
 * 业务同步服务工厂接口
 */
export interface BusinessSyncServiceFactory {
  createSyncService(): BaseCaseSyncService;
}

/**
 * 业务工厂注册表
 */
class BusinessFactoryRegistry {
  private apiFactories = new Map<BusinessType, BusinessApiFactory>();
  private syncServiceFactories = new Map<BusinessType, BusinessSyncServiceFactory>();

  /**
   * 注册业务 API 工厂
   */
  registerApiFactory(businessType: BusinessType, factory: BusinessApiFactory): void {
    this.apiFactories.set(businessType, factory);
  }

  /**
   * 注册业务同步服务工厂
   */
  registerSyncServiceFactory(businessType: BusinessType, factory: BusinessSyncServiceFactory): void {
    this.syncServiceFactories.set(businessType, factory);
  }

  /**
   * 获取业务 API 实例
   */
  getBusinessApi(businessType: BusinessType): BaseBusinessApi {
    const factory = this.apiFactories.get(businessType);
    if (!factory) {
      throw new Error(`Business API factory not found for business type: ${businessType}`);
    }
    return factory.createApi();
  }

  /**
   * 获取业务同步服务实例
   */
  getSyncService(businessType: BusinessType): BaseCaseSyncService {
    const factory = this.syncServiceFactories.get(businessType);
    if (!factory) {
      throw new Error(`Business sync service factory not found for business type: ${businessType}`);
    }
    return factory.createSyncService();
  }

  /**
   * 检查业务类型是否已注册
   */
  hasBusinessType(businessType: BusinessType): boolean {
    return this.apiFactories.has(businessType) && this.syncServiceFactories.has(businessType);
  }
}

/**
 * 全局业务工厂注册表实例
 */
export const businessFactoryRegistry = new BusinessFactoryRegistry();

