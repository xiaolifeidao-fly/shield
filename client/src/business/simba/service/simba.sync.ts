import { BaseCaseSyncService } from '../../common/base.sync';
import { BaseBusinessApi } from '../../common/base.api';
import { BusinessType, SyncStats, UserInfo } from '@eleapi/user/user.api';
import { releaseEngineInstance } from '@src/business/common/engine.manager';

/**
 * Simba 业务同步服务
 * 继承基础同步服务，可以重写特定方法以定制行为
 */
export class SimbaCaseSyncService extends BaseCaseSyncService {

  constructor(businessApi: BaseBusinessApi) {
    super(businessApi);
  }

  async release(businessType: BusinessType, username: string): Promise<void> {
    const resourceId = `${username}_${businessType || 'simba'}`;
    await releaseEngineInstance(resourceId);
  }

  async syncUserCases(
    userInfo: UserInfo,
    params: { product?: string; enableDeduplication?: boolean; enableResume?: boolean; [key: string]: any } = {}
  ): Promise<SyncStats> {
    const stats = await super.syncUserCases(userInfo, params);

    // 同步完成后标记首次同步完成
    const simbaApi = this.businessApi as any;
    if (simbaApi.markFirstSyncComplete) {
      simbaApi.markFirstSyncComplete();
    }

    return stats;
  }
}
