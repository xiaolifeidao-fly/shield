import { BaseCaseSyncService } from '../../common/base.sync';
import { BaseBusinessApi } from '../../common/base.api';
import { Case, CaseDetail, CustomerInfo, LoanPlan } from '@src/business/common/entities';
import { BusinessType, SyncStats, UserInfo } from '@eleapi/user/user.api';
import { releaseEngineInstance } from '@src/business/common/engine.manager';
import { setGlobal } from '@utils/store/electron';
import log from 'electron-log';

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
    return stats;
  }
}
