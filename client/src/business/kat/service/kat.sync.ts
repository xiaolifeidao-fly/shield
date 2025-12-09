import { BaseCaseSyncService } from '../../common/base.sync';
import { BaseBusinessApi } from '../../common/base.api';
import { Case, CaseDetail } from '../../common/entities';
import { BusinessType, SyncStats, UserInfo } from '@model/user.types';
import log from '../../../utils/logger';

interface SyncCache {
  [caseId: string]: string;
}

/**
 * KAT 业务同步服务
 * 继承基础同步服务，可以重写特定方法以定制行为
 */
export class KatCaseSyncService extends BaseCaseSyncService {
  
  constructor(businessApi: BaseBusinessApi) {
    super(businessApi);
  }

  async release(businessType: BusinessType, username: string): Promise<void> {
    // KAT 业务暂无特殊的释放逻辑
  }

  async syncPageData(userInfo: UserInfo, params: { [key: string]: any; }, stats: SyncStats, cache: SyncCache, enableDeduplication?: boolean, enableResume?: boolean): Promise<SyncStats> {
    const types = ["new","never_followed","today_ptp","other"];
    for(const type of types){
      params['type'] = type;
      log.info(`syncPageData type: ${type} params: ${JSON.stringify(params)}`);
      const startTime = Date.now();
      stats = await super.syncUserCasesByParams(userInfo, params, stats, cache, enableDeduplication, enableResume);
      log.info(`syncPageData type: ${type} cost: ${Date.now() - startTime}ms`);
    }
    return stats;
  }


  /**
   * KAT 不需要解密手机号，重写为空实现
   */
  protected async decryptPhoneNumbers(caseDetail: CaseDetail, caseItem: Case): Promise<void> {
    // KAT 的手机号已经是明文，不需要解密
  }
}

