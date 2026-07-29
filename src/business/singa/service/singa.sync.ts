import { BaseCaseSyncService } from '../../common/base.sync';
import { BaseBusinessApi } from '../../common/base.api';
import { Case, CaseDetail, CustomerInfo, LoanPlan } from '@src/business/common/entities';
import { BusinessType, SyncStats, UserInfo } from '@model/user.types';
import { releaseEngineInstance } from '@src/business/common/engine.manager';

interface SyncCache {
  [caseId: string]: string;
}

const SINGA_CASE_TYPES = ['need-follow-up', 'already-follow-up'] as const;

/**
 * Singa 业务同步服务
 * 继承基础同步服务，可以重写特定方法以定制行为
 */
export class SingaCaseSyncService extends BaseCaseSyncService {

  constructor(businessApi: BaseBusinessApi) {
    super(businessApi);
  }
  
  async release(businessType: BusinessType, username: string): Promise<void> {
    const resourceId = `${username}_${businessType || 'singa'}`;
    await releaseEngineInstance(resourceId);
  }

  async syncPageData(
    userInfo: UserInfo,
    params: { [key: string]: any },
    stats: SyncStats,
    cache: SyncCache,
    enableDeduplication?: boolean,
    enableResume?: boolean
  ): Promise<SyncStats> {
    let totalCountOffset = 0;

    for (const [index, caseType] of SINGA_CASE_TYPES.entries()) {
      stats = await super.syncUserCasesByParams(
        userInfo,
        { ...params, caseType },
        stats,
        cache,
        enableDeduplication,
        enableResume,
        {
          startPageNum: 1,
          totalCountOffset,
          finalize: index === SINGA_CASE_TYPES.length - 1,
        }
      );
      totalCountOffset = stats.totalCount;
    }

    return stats;
  }
}
