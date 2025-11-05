import { BaseCaseSyncService } from '../../common/base.sync';
import { BaseBusinessApi } from '../../common/base.api';
import { Case, CaseDetail, CustomerInfo, LoanPlan } from '@src/business/common/entities';
import { BusinessType } from '@eleapi/user/user.api';

/**
 * Singa 业务同步服务
 * 继承基础同步服务，可以重写特定方法以定制行为
 */
export class SingaCaseSyncService extends BaseCaseSyncService {
  constructor(businessApi: BaseBusinessApi) {
    super(businessApi);
  }

  // TODO: 如果需要定制 Singa 特定的同步逻辑，可以重写以下方法：
  // - syncSingleCase: 自定义单个案例的同步逻辑
  // - decryptPhoneNumbers: 如果 Singa 有特殊的手机号解密逻辑
  // - writeCase: 如果 Singa 需要不同的写入逻辑


  writeCase(caseDetail: CaseDetail, loanPlan: LoanPlan[], customerInfo: CustomerInfo, businessType: BusinessType | undefined): Promise<void> {
    return Promise.resolve();
  }


}

