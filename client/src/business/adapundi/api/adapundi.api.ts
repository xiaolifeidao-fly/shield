import { AxiosInstance } from 'axios';
import { BaseBusinessApi } from '../../common/base.api';
import { CasePageParams, CasePageResponse, CaseDetail, LoanPlan, CustomerInfo, Case } from '../../common/entities';
import { UserInfo, BusinessType } from '@eleapi/user/user.api';
import { adapundiInstance, writeCaseInstance, setCurrentUser, getCurrentUser } from './adapundi.axios';
import { decryptPhone, AuditDataType, DecryptPhoneParams } from './phone.api';
import log from 'electron-log';

/**
 * Adapundi 业务 API 实现
 */
export class AdapundiBusinessApi extends BaseBusinessApi {
  getAxiosInstance(): AxiosInstance {
    return adapundiInstance;
  }

  setCurrentUser(userInfo: UserInfo | null): void {
    setCurrentUser(userInfo);
  }

  getCurrentUser(): UserInfo | null {
    return getCurrentUser();
  }

  async getCasePage(params: CasePageParams): Promise<CasePageResponse<Case>> {
    const { pageNum = 1, pageSize = 20, ...restParams } = params;
    const response = await adapundiInstance.get("/hive-collection-admin/cases/page", {
      params: {
        pageNum,
        pageSize,
        ...restParams,
      },
    });
    return response as unknown as CasePageResponse<Case>;
  }

  async getCaseDetail(product: string, caseItem : Case): Promise<CaseDetail> {
    const response = await adapundiInstance.get(
      `/hive-collection-admin/cases/${product}/${caseItem.caseId}/detail`
    );
    return response as unknown as CaseDetail;
  }

  async getCustomerInfo(product: string, caseItem : Case): Promise<CustomerInfo> {
    const response = await adapundiInstance.get(
      `/hive-collection-admin//customer/${product}/${caseItem.customerId}/info`
    );
    return response as unknown as CustomerInfo;
  }

  async getLoanPlan(customerId: number): Promise<LoanPlan[]> {
    const response = await adapundiInstance.get(
      `/hive-collection-admin/customer/${customerId}/loan-info`
    );
    return response as unknown as LoanPlan[];
  }

  async decryptPhone(params: DecryptPhoneParams): Promise<string> {
    return await decryptPhone(params);
  }

  async writeCase(
    caseDetail: CaseDetail,
    loanPlan: LoanPlan[],
    customerInfo: CustomerInfo,
    businessType: BusinessType | undefined
  ): Promise<void> {
    // 构建请求数据
    const requestData = {
      caseDetail: caseDetail,
      customerInfo: customerInfo,
      loanPlan: loanPlan,
      loanSource: businessType || null
    };
    log.info(`writeCase requestData: ${JSON.stringify(requestData)}`);
    await writeCaseInstance.post("/loan/import/external/sync", requestData);
  }
}

