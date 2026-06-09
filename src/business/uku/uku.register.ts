import { businessFactoryRegistry, BusinessApiFactory, BusinessSyncServiceFactory } from '../common/factory';
import { UkuBusinessApi } from './api/uku.api';
import { UkuCaseSyncService } from './service/uku.sync';

class UkuApiFactory implements BusinessApiFactory {
  createApi(): UkuBusinessApi {
    return new UkuBusinessApi();
  }
}

class UkuSyncServiceFactory implements BusinessSyncServiceFactory {
  createSyncService(): UkuCaseSyncService {
    const api = new UkuBusinessApi();
    return new UkuCaseSyncService(api);
  }
}

export function registerUkuBusiness(): void {
  businessFactoryRegistry.registerApiFactory('uku', new UkuApiFactory());
  businessFactoryRegistry.registerSyncServiceFactory('uku', new UkuSyncServiceFactory());
}
