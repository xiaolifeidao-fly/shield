import { writeCaseInstance, getCurrentUser } from "./adapundi.axios";
import { CaseDetail, LoanPlan, CustomerInfo } from "../../common/entities";
import { BusinessType } from "@model/user.types";
import log from "../../../utils/logger";
/**
 * writeCase 接口的请求参数类型
 * 与 caseDataWithLoanSource 结构一致：展开 caseDetail、customerInfo，包含 loanPlan 数组和 loanSource
 */
export type WriteCaseRequest = {
  loanPlan: LoanPlan[];
  loanSource: BusinessType | null;
  caseDetail: CaseDetail;
  customerInfo: CustomerInfo;
};

/**
 * 写入案例数据
 * @param caseDetail 案例详情（手机号已解密为明文）
 * @param loanPlan 还款计划列表
 * @param customerInfo 客户信息
 * @param businessType 业务类型（用于设置 loanSource）
 * @returns Promise<void>
 */
export async function writeCase(
  caseDetail: CaseDetail,
  loanPlan: LoanPlan[],
  customerInfo: CustomerInfo,
  businessType: BusinessType | undefined
): Promise<void> {
  // reviewerName 强制使用当前登录账号
  const currentUser = getCurrentUser();
  const reviewerName = currentUser?.username || caseDetail.reviewerName || null;

  // 构建请求数据，与 caseDataWithLoanSource 结构一致
  const requestData: WriteCaseRequest = {
    caseDetail: {
      ...caseDetail,
      reviewerName,
    },
    customerInfo: customerInfo,
    loanPlan: loanPlan,
    loanSource: businessType || null
  };
  // 如果 baseURL 已经包含完整路径，则直接使用 baseURL，否则追加路径
  const baseURL = process.env.WRITE_CASE_API_BASE_URL || '';
  const endpoint = baseURL.includes('/loan/import/external/sync') ? '' : '/loan/import/external/sync';
  log.info(`[writeCase] Request URL: ${baseURL}${endpoint}, caseId: ${caseDetail.caseId}`);
  try {
    await writeCaseInstance.post(endpoint, requestData);
  } catch (error: any) {
    log.error(`[writeCase] Request failed, caseId: ${caseDetail.caseId}, error:`, error);
    throw error;
  }
}
