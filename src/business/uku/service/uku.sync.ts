import { BaseBusinessApi } from '../../common/base.api';
import { BaseCaseSyncService } from '../../common/base.sync';
import { BusinessType } from '@model/user.types';
import { releaseEngineInstance } from '@src/business/common/engine.manager';

/**
 * UKU 业务同步服务
 */
export class UkuCaseSyncService extends BaseCaseSyncService {
  constructor(businessApi: BaseBusinessApi) {
    super(businessApi);
  }

  async release(businessType: BusinessType, username: string): Promise<void> {
    const resourceId = `${username}_${businessType || 'uku'}`;
    await releaseEngineInstance(resourceId);
  }
}
