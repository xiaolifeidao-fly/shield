import { adapundiInstance } from "./adapundi.axios";
import { LoanPlan, LoanDetail } from "../../common/entities";

/**
 * 导出公共实体类型（保持向后兼容）
 */
export type { LoanPlan };

/**
 * 查询还款计划
 * @param customerId 客户ID
 * @returns 还款计划列表
 */
export async function getLoanPlan(customerId: number): Promise<LoanPlan[]> {
  const response = await adapundiInstance.get(
    `/hive-collection-admin/customer/${customerId}/loan-info`
  );
  return response as unknown as LoanPlan[];
}


/**
 * 查询贷款详情
 * @param customerId 客户ID
 * @returns 贷款详情列表
 */
export async function getLoanDetail(customerId: number): Promise<LoanDetail | null> {
  const response = await adapundiInstance.get(
    `/hive-collection-admin/customer/${customerId}/loan-info`
  );

  const loanDetails = response as unknown as LoanDetail[];
  if(loanDetails){
    return loanDetails[0];
  }
  return null;
}

