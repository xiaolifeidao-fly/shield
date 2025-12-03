import { BaseCaseSyncService } from '../../common/base.sync';
import { BaseBusinessApi } from '../../common/base.api';
import { Case, CaseDetail, CustomerInfo, LoanPlan } from '@src/business/common/entities';
import { BusinessType } from '@model/user.types';
import { releaseEngineInstance } from '@src/business/common/engine.manager';

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
}

