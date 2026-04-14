import { businessFactoryRegistry, BusinessApiFactory, BusinessSyncServiceFactory } from '../common/factory';
import { SimbaBusinessApi } from './api/simba.api';
import { SimbaCaseSyncService } from './service/simba.sync';

/**
 * Simba 业务 API 工厂
 */
class SimbaApiFactory implements BusinessApiFactory {
  createApi(): SimbaBusinessApi {
    return new SimbaBusinessApi();
  }
}

/**
 * Simba 业务同步服务工厂
 */
class SimbaSyncServiceFactory implements BusinessSyncServiceFactory {
  createSyncService(): SimbaCaseSyncService {
    const api = new SimbaBusinessApi();
    return new SimbaCaseSyncService(api);
  }
}

/**
 * 注册 Simba 业务
 */
export function registerSimbaBusiness(): void {
  businessFactoryRegistry.registerApiFactory('simba', new SimbaApiFactory());
  businessFactoryRegistry.registerSyncServiceFactory('simba', new SimbaSyncServiceFactory());
}
