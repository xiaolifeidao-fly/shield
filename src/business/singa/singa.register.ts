import { BusinessType } from '@model/user.types';
import { businessFactoryRegistry, BusinessApiFactory, BusinessSyncServiceFactory } from '../common/factory';
import { SingaBusinessApi } from './api/singa.api';
import { SingaCaseSyncService } from './service/singa.sync';

/**
 * Singa 业务 API 工厂
 */
class SingaApiFactory implements BusinessApiFactory {
  createApi(): SingaBusinessApi {
    return new SingaBusinessApi();
  }
}

/**
 * Singa 业务同步服务工厂
 */
class SingaSyncServiceFactory implements BusinessSyncServiceFactory {
  createSyncService(): SingaCaseSyncService {
    const api = new SingaBusinessApi();
    return new SingaCaseSyncService(api);
  }
}

/**
 * 注册 Singa 业务
 */
export function registerSingaBusiness(): void {
  businessFactoryRegistry.registerApiFactory('SINGA', new SingaApiFactory());
  businessFactoryRegistry.registerSyncServiceFactory('SINGA', new SingaSyncServiceFactory());
}

