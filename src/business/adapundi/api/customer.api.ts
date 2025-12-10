import { adapundiInstance } from "./adapundi.axios";
import { CustomerInfo } from "../../common/entities";

/**
 * 导出公共实体类型（保持向后兼容）
 */
export type { CustomerInfo };

/**
 * 获取客户信息
 * @param product 产品类型，如 "AP"
 * @param customerId 客户ID
 * @returns 客户信息
 */
export async function getCustomerInfo(product: string, customerId: number): Promise<CustomerInfo> {
  const response = await adapundiInstance.get(
    `/hive-collection-admin//customer/${product}/${customerId}/info`
  );
  return response as unknown as CustomerInfo;
}
