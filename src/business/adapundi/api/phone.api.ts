import { adapundiInstance } from "./adapundi.axios";

/**
 * 审计数据类型枚举
 */
export enum AuditDataType {
  /** 本人手机号 */
  CASE_DETAIL_BASIC_INFO_OWN_PHONE = "CASE_DETAIL_BASIC_INFO_OWN_PHONE",
  /** 备用手机号 */
  CASE_DETAIL_BASIC_INFO_BACKUP_PHONE = "CASE_DETAIL_BASIC_INFO_BACKUP_PHONE",
}

/**
 * 手机号解密请求参数
 */
export interface DecryptPhoneParams {
  /** 审计数据类型 */
  auditDataType: AuditDataType;
  /** 客户ID */
  customerId: number;
  /** 产品枚举 */
  productEnum: string;
}

/**
 * 解密手机号
 * @param params 解密参数
 * @returns 解密后的手机号字符串
 */
export async function decryptPhone(params: DecryptPhoneParams): Promise<string> {
  const response = await adapundiInstance.post(
    "/hive-collection-admin//customer/query/decrypt/phone",
    params
  );
  return response as unknown as string;
}
