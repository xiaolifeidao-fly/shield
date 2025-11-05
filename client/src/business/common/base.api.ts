import { AxiosInstance } from 'axios';
import { Case, CasePageParams, CasePageResponse, CaseDetail, LoanPlan, CustomerInfo } from './entities';
import { UserInfo, BusinessType } from '@eleapi/user/user.api';

/**
 * 业务 API 抽象基类
 * 定义所有业务类型必须实现的 API 接口
 */
export abstract class BaseBusinessApi {
  /**
   * 获取该业务类型的 axios 实例
   */
  abstract getAxiosInstance(): AxiosInstance|null;

  /**
   * 设置当前操作用户
   */
  abstract setCurrentUser(userInfo: UserInfo | null): void;

  /**
   * 获取当前操作用户
   */
  abstract getCurrentUser(): UserInfo | null;

  /**
   * 获取案例分页列表
   * @param params 查询参数
   * @returns 分页响应数据
   */
  abstract getCasePage(params: CasePageParams): Promise<CasePageResponse>;

  /**
   * 获取案件详情
   * @param product 产品类型
   * @param id 案件ID
   * @returns 案件详情数据
   */
  abstract getCaseDetail(product: string, caseId: Case): Promise<CaseDetail>;

  /**
   * 获取客户信息
   * @param product 产品类型
   * @param customerId 客户ID
   * @returns 客户信息
   */
  abstract getCustomerInfo(product: string, caseItem : Case): Promise<CustomerInfo>;

  /**
   * 获取还款计划
   * @param customerId 客户ID
   * @returns 还款计划列表
   */
  abstract getLoanPlan(customerId: number): Promise<LoanPlan[]>;

  /**
   * 解密手机号（可选，某些业务可能需要）
   * @param params 解密参数
   * @returns 解密后的手机号
   */
  abstract decryptPhone?(params: any): Promise<string>;

  /**
   * 写入案例数据
   * @param caseDetail 案例详情（手机号已解密为明文）
   * @param loanPlan 还款计划列表
   * @param customerInfo 客户信息
   * @param businessType 业务类型（用于设置 loanSource）
   * @returns Promise<void>
   */
  abstract writeCase(
    caseDetail: CaseDetail,
    loanPlan: LoanPlan[],
    customerInfo: CustomerInfo,
    businessType: BusinessType | undefined
  ): Promise<void>;
}

