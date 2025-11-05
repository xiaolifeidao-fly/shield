import { adapundiInstance } from "./adapundi.axios";
import { LoanPlan } from "../../common/entities";

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

