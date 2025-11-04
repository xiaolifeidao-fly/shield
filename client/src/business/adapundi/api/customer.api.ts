import { adapundiInstance } from "./adapundi.axios";

/**
 * 客户信息接口
 */
export interface CustomerInfo {
  /** 全名 */
  fullName: string;
  /** 客户ID */
  customerId: number;
  /** 手机号（脱敏） */
  mobile: string;
  /** 身份证号（脱敏） */
  credentialNo: string;
  /** 性别 */
  gender: string;
  /** 省份 */
  province: string;
  /** 城市 */
  city: string;
  /** 区县 */
  district: string;
  /** 区域 */
  area: string;
  /** 地址（脱敏） */
  address: string;
  /** 婚姻状况 */
  maritalStatus: string;
  /** 备用手机号 */
  backupMobile: string;
  /** 岳家姓 */
  familyNameInLaw: string;
  /** 子女数量 */
  childrenNum: number | null;
  /** 教育程度 */
  education: string;
  /** 邮箱 */
  email: string;
  /** 客户系统标签 */
  customerSysTag: string | null;
  /** 新省份 */
  newProvince: string | null;
  /** 新城市 */
  newCity: string | null;
  /** 新区县 */
  newDistrict: string | null;
  /** 新区域 */
  newArea: string | null;
  /** 最后登录时间 */
  lastLoginTime: string;
  /** 渠道1 */
  channel1: string;
  /** 渠道2 */
  channel2: string;
  /** Facebook ID */
  facebookId: string;
  /** 证件类型 */
  credentialType: string;
  /** 生日 */
  birthday: string;
  /** KTP OCR 地址（脱敏） */
  ktpOcrAddress: string;
}

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
