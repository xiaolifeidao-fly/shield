import { AxiosInstance } from 'axios';
import { BaseBusinessApi } from '../../common/base.api';
import { CasePageParams, CasePageResponse, CaseDetail, LoanPlan, CustomerInfo, Case } from '../../common/entities';
import { UserInfo, BusinessType } from '@model/user.types';
import { katInstance, setCurrentUser, getCurrentUser } from './kat.axios';
import { getCasePage } from './case.api';
import { getCaseDetail } from './case.api';
import { getCustomerInfo } from './customer.api';
import { getLoanDetail } from './loan.api';
import log from '../../../utils/logger';
import { writeCaseInstance } from '@src/business/adapundi/api/adapundi.axios';

/**
 * KAT 业务 API 实现
 */
export class KatBusinessApi extends BaseBusinessApi {
  async decryptPhone?(params: any): Promise<string|undefined> {
    return undefined;
  }

  getAxiosInstance(): AxiosInstance {
    return katInstance;
  }

  setCurrentUser(userInfo: UserInfo | null): void {
    setCurrentUser(userInfo);
  }

  getCurrentUser(): UserInfo | null {
    return getCurrentUser();
  }

  async getCasePage(params: CasePageParams): Promise<CasePageResponse<Case>> {
    return await getCasePage(params);
  }

  async getCaseDetails(product: string, caseItem: Case): Promise<CaseDetail[]> {
    const caseDetail = await getCaseDetail(product, caseItem.caseId);
    
    // 获取贷款详情并填充 loanAmount
    if (caseDetail) {
      try {
        const loanDetails = await getLoanDetail(caseItem.caseId);
        if (loanDetails.length == 1) {
          const loanDetail = loanDetails[0];
          caseDetail.loanAmount = parseFloat(loanDetail.remittance_amount || '0');
          caseDetail.caseId = loanDetail.lid || '';
          caseDetail.id = parseInt(loanDetail.lid || '0');
          caseDetail.principleAmount = parseFloat(loanDetail.principal || '0');
          return [caseDetail];
        }
        const newCaseDetails: CaseDetail[] = [];
        for(const loanDetail of loanDetails){
          const newCaseDetail = { ...caseDetail };
          newCaseDetail.loanAmount = parseFloat(loanDetail.remittance_amount || '0');
          newCaseDetail.dueDate = loanDetail.due_at || null;
          newCaseDetail.caseId = loanDetail.lid || '';
          newCaseDetail.id = parseInt(loanDetail.lid || '0');
          newCaseDetail.overdueDay = loanDetail.overdue_days;
          newCaseDetail.principleAmount = parseFloat(loanDetail.principal || '0');
          newCaseDetail.interestAmount = parseFloat(loanDetail.interest || '0');
          newCaseDetail.punishmentAmount = parseFloat(loanDetail.late_fee || '0');
          newCaseDetail.amount = parseFloat(loanDetail.unpaid || '0');
          newCaseDetails.push(newCaseDetail);
        }
        return newCaseDetails;
      } catch (error) {
        log.warn(`Failed to get loan detail for case ${caseItem.caseId}:`, error);
      }
    }
    
    return [caseDetail];
  }

  async getCustomerInfo(product: string, caseItem: Case): Promise<CustomerInfo> {
    return await getCustomerInfo(product, caseItem.caseId);
  }

  async getLoanPlan(customerId: number): Promise<LoanPlan[]> {
    // KAT 的 getLoanPlan 需要使用 caseId 而不是 customerId
    // 这里需要从当前上下文获取 caseId
    // 由于架构限制，我们暂时返回空数组，在 sync service 中会单独处理
    return [];
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

