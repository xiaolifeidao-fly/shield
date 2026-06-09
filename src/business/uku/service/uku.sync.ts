import { BaseBusinessApi } from '../../common/base.api';
import { BaseCaseSyncService } from '../../common/base.sync';
import { BusinessType } from '@model/user.types';

/**
 * UKU 业务同步服务
 */
export class UkuCaseSyncService extends BaseCaseSyncService {
  constructor(businessApi: BaseBusinessApi) {
    super(businessApi);
  }

  async release(businessType: BusinessType, username: string): Promise<void> {
    // UKU 当前使用接口直连，无需释放浏览器资源
  }
}
