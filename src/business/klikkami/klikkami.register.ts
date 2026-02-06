import { businessFactoryRegistry, BusinessApiFactory, BusinessSyncServiceFactory } from '../common/factory';
import { KlikKamiBusinessApi } from './api/klikkami.api';
import { KlikKamiCaseSyncService } from './service/klikkami.sync';

class KlikKamiApiFactory implements BusinessApiFactory {
  createApi(): KlikKamiBusinessApi {
    return new KlikKamiBusinessApi();
  }
}

class KlikKamiSyncServiceFactory implements BusinessSyncServiceFactory {
  createSyncService(): KlikKamiCaseSyncService {
    const api = new KlikKamiBusinessApi();
    return new KlikKamiCaseSyncService(api);
  }
}

export function registerKlikKamiBusiness(): void {
  businessFactoryRegistry.registerApiFactory('KLIKKAMI', new KlikKamiApiFactory());
  businessFactoryRegistry.registerSyncServiceFactory('KLIKKAMI', new KlikKamiSyncServiceFactory());
}
