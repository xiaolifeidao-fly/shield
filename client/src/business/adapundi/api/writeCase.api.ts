import { writeCaseInstance } from "./adapundi.axios";
import { CaseDetail } from "./case.api";
import { LoanPlan } from "./loan.api";
import { CustomerInfo } from "./customer.api";
import { BusinessType } from "@eleapi/user/user.api";

/**
 * writeCase 接口的请求参数类型
 * 与 caseDataWithLoanSource 结构一致：展开 caseDetail、customerInfo，包含 loanPlan 数组和 loanSource
 */
export type WriteCaseRequest = CaseDetail & CustomerInfo & {
  loanPlan: LoanPlan[];
  loanSource: BusinessType | null;
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
  // 构建请求数据，与 caseDataWithLoanSource 结构一致
  const requestData: WriteCaseRequest = {
    ...caseDetail,
    ...customerInfo,
    loanPlan,
    loanSource: businessType || null,
  };

  await writeCaseInstance.post("/loan/import/external/sync", requestData);
}

