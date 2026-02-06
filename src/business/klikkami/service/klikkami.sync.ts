import { BaseCaseSyncService } from '../../common/base.sync';
import { BaseBusinessApi } from '../../common/base.api';
import { CaseDetail } from '../../common/entities';
import { BusinessType, SyncStats, UserInfo } from '@model/user.types';
import log from '@src/utils/logger';

interface SyncCache {
  [caseId: string]: string;
}

export class KlikKamiCaseSyncService extends BaseCaseSyncService {
  constructor(businessApi: BaseBusinessApi) {
    super(businessApi);
  }

  async release(businessType: BusinessType, username: string): Promise<void> {
    // 无特殊释放逻辑
  }

  async syncPageData(
    userInfo: UserInfo,
    params: { [key: string]: any },
    stats: SyncStats,
    cache: SyncCache,
    enableDeduplication?: boolean,
    enableResume?: boolean
  ): Promise<SyncStats> {
    const startTime = Date.now();
    stats = await super.syncUserCasesByParams(userInfo, params, stats, cache, enableDeduplication, enableResume);
    log.info(`klik kami syncPageData cost: ${Date.now() - startTime}ms`);
    return stats;
  }

  async getCasePage(pageNum: number, pageSize: number, params: any) {
    // Klik Kami 固定使用 limit=100
    return super.getCasePage(pageNum, 100, params);
  }

  protected async decryptPhoneNumbers(caseDetail: CaseDetail): Promise<void> {
    // 不需要解密手机号
  }
}
