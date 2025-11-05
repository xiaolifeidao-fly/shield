import { BusinessType } from '@eleapi/user/user.api';
import { businessFactoryRegistry, BusinessApiFactory, BusinessSyncServiceFactory } from '../common/factory';
import { AdapundiBusinessApi } from './api/adapundi.api';
import { AdapundiCaseSyncService } from './service/adapundi.sync';

/**
 * Adapundi 业务 API 工厂
 */
class AdapundiApiFactory implements BusinessApiFactory {
  createApi(): AdapundiBusinessApi {
    return new AdapundiBusinessApi();
  }
}

/**
 * Adapundi 业务同步服务工厂
 */
class AdapundiSyncServiceFactory implements BusinessSyncServiceFactory {
  createSyncService(): AdapundiCaseSyncService {
    const api = new AdapundiBusinessApi();
    return new AdapundiCaseSyncService(api);
  }
}

/**
 * 注册 Adapundi 业务
 */
export function registerAdapundiBusiness(): void {
  businessFactoryRegistry.registerApiFactory('adapundi', new AdapundiApiFactory());
  businessFactoryRegistry.registerSyncServiceFactory('adapundi', new AdapundiSyncServiceFactory());
}

