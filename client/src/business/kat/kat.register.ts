import { BusinessType } from '@model/user.types';
import { businessFactoryRegistry, BusinessApiFactory, BusinessSyncServiceFactory } from '../common/factory';
import { KatBusinessApi } from './api/kat.api';
import { KatCaseSyncService } from './service/kat.sync';

/**
 * KAT 业务 API 工厂
 */
class KatApiFactory implements BusinessApiFactory {
  createApi(): KatBusinessApi {
    return new KatBusinessApi();
  }
}

/**
 * KAT 业务同步服务工厂
 */
class KatSyncServiceFactory implements BusinessSyncServiceFactory {
  createSyncService(): KatCaseSyncService {
    const api = new KatBusinessApi();
    return new KatCaseSyncService(api);
  }
}

/**
 * 注册 KAT 业务
 */
export function registerKatBusiness(): void {
  businessFactoryRegistry.registerApiFactory('KAT', new KatApiFactory());
  businessFactoryRegistry.registerSyncServiceFactory('KAT', new KatSyncServiceFactory());
}

