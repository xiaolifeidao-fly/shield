import { katInstance } from "./kat.axios";
import { CustomerInfo } from "../../common/entities";

/**
 * 导出公共实体类型（保持向后兼容）
 */
export type { CustomerInfo };

/**
 * 将 KAT 案例详情转换为 CustomerInfo 格式
 */
function mapKatDetailToCustomerInfo(katDetail: any): CustomerInfo {
  return {
    fullName: katDetail.customer_name || katDetail.user_name || '',
    customerId: parseInt(katDetail.uid) || 0,
    mobile: katDetail.mobile_no || katDetail.reg_number || '',
    credentialNo: '',
    gender: katDetail.gender || '',
    province: '',
    city: katDetail.live_city || '',
    district: '',
    area: '',
    address: katDetail.home_address || '',
    maritalStatus: '',
    backupMobile: '',
    familyNameInLaw: '',
    childrenNum: null,
    education: '',
    email: katDetail.job_email || '',
    customerSysTag: null,
    newProvince: null,
    newCity: katDetail.work_city || null,
    newDistrict: null,
    newArea: null,
    lastLoginTime: '',
    channel1: '',
    channel2: '',
    facebookId: '',
    credentialType: '',
    birthday: katDetail.birthday || '',
    ktpOcrAddress: '',
  };
}

/**
 * 获取客户信息
 * @param product 产品类型（KAT 中不使用，保持接口一致）
 * @param cid 案件ID
 * @returns 客户信息
 */
export async function getCustomerInfo(product: string, cid: string): Promise<CustomerInfo> {
  const response = await katInstance.get(`/api/detail?cid=${cid}`);
  return mapKatDetailToCustomerInfo(response);
}

