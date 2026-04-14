import { AxiosInstance } from 'axios';
import { BaseBusinessApi } from '../../common/base.api';
import { CasePageParams, CasePageResponse, CaseDetail, LoanPlan, CustomerInfo, Case, LoanDetail } from '../../common/entities';
import { UserInfo, BusinessType } from '@eleapi/user/user.api';
import { getCurrentUser, setCurrentUser } from '../../adapundi/api/adapundi.axios';
import log from 'electron-log';
import { login as simbaLogin } from './login.api';
import { writeCase } from '@src/business/adapundi/api/writeCase.api';

const SIMBA_BASE_URL = 'https://collection.cairin.id';
const SIMBA_API_BASE = `${SIMBA_BASE_URL}/xapi/v1`;

/**
 * Simba Case 接口
 */
export interface SimbaCase extends Case {
  orderNumber?: string;
  ptpStatus?: string | null;
  otherPlatformActiveLoanCount?: number;
  waNumber?: string | null;
  email?: string | null;
  dpd?: number;
  collectionLevel?: string | null;
  penaltyAmount?: number;
  currentDueAmount?: number;
  repaymentAmount?: number;
  remainingAmount?: number;
  sensitivity?: string | null;
  waIntentionLevel?: string | null;
  plan?: string | null;
  assignedBy?: string | null;
  assignedAt?: string | null;
  lastFollowedUpDate?: string | null;
  // fieldJson 字段
  bankName?: string | null;
  collectorName?: string | null;
  productName?: string | null;
  principleAmountOriginal?: string | null;
  interestAmount?: number;
  principleAmountDue?: number;
  interestDue?: number;
  totalAmountDue?: number;
}

export class SimbaBusinessApi extends BaseBusinessApi<SimbaCase> {
  private cookie: string | null = null;

  // 存储当前用户信息用于登录
  private currentUserInfo: UserInfo | null = null;

  getLoanPlan(customerId: number): Promise<LoanPlan[]> {
    return Promise.resolve([]);
  }

  getCustomerInfo(product: string, caseItem: SimbaCase): Promise<CustomerInfo> {
    const customerInfo: CustomerInfo = {
      fullName: caseItem.fullName || '',
      customerId: caseItem.customerId,
      mobile: caseItem.mobile || '',
      credentialNo: '',
      gender: '',
      province: '',
      city: '',
      district: '',
      area: '',
      address: '',
      maritalStatus: '',
      backupMobile: '',
      familyNameInLaw: '',
      childrenNum: null,
      education: '',
      email: caseItem.email || '',
      customerSysTag: caseItem.customerSysTag || null,
      newProvince: null,
      newCity: null,
      newDistrict: null,
      newArea: null,
      lastLoginTime: caseItem.lastLoginTime || '',
      channel1: caseItem.channel1 || '',
      channel2: caseItem.channel2 || '',
      facebookId: '',
      credentialType: '',
      birthday: '',
      ktpOcrAddress: '',
    };
    return Promise.resolve(customerInfo);
  }

  async getLoanDetail(caseId: string): Promise<LoanDetail | null> {
    return null;
  }

  async getCaseDetail(product: string, caseItem: SimbaCase): Promise<CaseDetail> {
    return {
      id: caseItem.id,
      caseId: caseItem.caseId || '',
      trigger: caseItem.trigger || null,
      level: caseItem.level || caseItem.collectionLevel || null,
      fullName: caseItem.fullName || '',
      mobile: caseItem.mobile || '',
      customerId: caseItem.customerId,
      overdueDay: caseItem.overdueDay || caseItem.dpd || 0,
      reviewerId: caseItem.reviewerId || null,
      reviewerName: caseItem.reviewerName || null,
      customerTag: caseItem.customerTag || null,
      riskGrade: caseItem.riskGrade || null,
      clearedNumber: caseItem.clearedNumber || 0,
      tags: '',
      channel1: caseItem.channel1 || null,
      channel2: caseItem.channel2 || null,
      gender: null,
      dueDate: caseItem.dueDate || null,
      loanTag: caseItem.loanTag || caseItem.waIntentionLevel || null,
      postLoanPreReminderLevel: caseItem.postLoanPreReminderLevel || null,
      overdueInstitutionLevel: caseItem.overdueInstitutionLevel || null,
      isMinPay: null,
      isInstallmentPay: null,
      minPayBillId: null,
      installmentBillId: null,
      customerClikInfo: null,
      vaList: null,
      tadpoleCount: '0',
      tadpoleAmount: '0',
      riskScoreAndLevel: caseItem.riskGrade || null,
      amount: caseItem.amount || 0,
      principleAmount: caseItem.principleAmount || 0,
      interestAmount: 0,
      punishmentAmount: caseItem.penaltyAmount || 0,
      vatAmount: 0,
      distributedDay: caseItem.distributedDay || 0,
      expireAmount: caseItem.amount || 0,
      expirePrincipleAmount: caseItem.principleAmount || 0,
      expireInterestAmount: 0,
      expirePunishmentAmount: caseItem.penaltyAmount || 0,
      expireVatAmount: 0,
      backupMobile: '',
      createTime: caseItem.createTime || new Date().toISOString(),
      whatsUpNum: caseItem.waNumber || null,
      loanAmount: null,
    };
  }

  getAxiosInstance(): AxiosInstance | null {
    return null;
  }

  setCurrentUser(userInfo: UserInfo | null): void {
    setCurrentUser(userInfo as UserInfo);
  }

  getCurrentUser(): UserInfo | null {
    return getCurrentUser();
  }

  private async ensureLogin(): Promise<boolean> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('未找到当前用户信息');
    }

    // 如果已有 cookie，直接返回
    if (this.cookie) {
      return true;
    }

    // 执行登录获取 cookie
    const loginResult = await simbaLogin(user, SIMBA_BASE_URL);
    if (!loginResult.success) {
      throw new Error(`登录失败: ${loginResult.message}`);
    }

    // 从登录结果获取 cookie
    this.cookie = loginResult.cookie || '';
    log.info(`Simba 获取到 cookie: ${this.cookie}`);
    return true;
  }

  private async getCookieFromBrowser(): Promise<string | null> {
    // 从 Playwright 浏览器上下文获取 cookie
    return null;
  }

  async getCasePage(params: CasePageParams): Promise<CasePageResponse<SimbaCase>> {
    const { pageNum = 1, pageSize = 20 } = params;

    const user = this.getCurrentUser();
    if (!user || !user.username) {
      throw new Error('未找到当前用户信息');
    }

    // 确保已登录
    await this.ensureLogin();

    try {
      const response = await fetch(`${SIMBA_API_BASE}/cases/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.cookie || '',
        },
        body: JSON.stringify({
          userId: 1803,
          action: 1,
          sortRule: 0,
          searchLabel: 0,
          limit: pageSize,
          page: pageNum,
          searchKeyParam: {},
        }),
      });

      const data = await response.json() as any;
      log.info(`Simba getCasePage response: ${JSON.stringify(data)}`);

      // 解析响应数据
      const records: SimbaCase[] = (data.data?.list || []).map((item: any) => {
        const fieldJson = item.fieldJson || {};
        return {
          id: item.id,
          caseId: String(item.id),
          fullName: item.name || '',
          mobile: item.mobile || '',
          customerId: item.id,
          amount: item.amount || 0,
          principleAmount: parseFloat(fieldJson.actualLoanAmount) || 0,
          overdueDay: item.overdueDays || 0,
          dpd: item.overdueDays || 0,
          createTime: item.createTime ? new Date(item.createTime).toISOString() : new Date().toISOString(),
          email: item.email || null,
          // 从 fieldJson 提取更多字段
          penaltyAmount: parseFloat(fieldJson.penaltyAmount) || 0,
          currentDueAmount: parseFloat(fieldJson.dueAmount) || 0,
          remainingAmount: parseFloat(fieldJson.remainingAmount) || 0,
          bankName: fieldJson.bankName || null,
          // 其他字段
          customerSysTag: null,
          channel1: fieldJson.channel1 || '',
          channel2: fieldJson.channel2 || '',
          level: null,
          trigger: null,
          collectorName: fieldJson.collectorName || null,
          collectionLevel: fieldJson.collectionLevel || null,
          waIntentionLevel: fieldJson.waIntentionLevel || null,
          sensitivity: fieldJson.sensitivity || null,
          productName: fieldJson.productName || null,
          principleAmountOriginal: fieldJson.principleAmountOriginal || null,
          interestAmount: fieldJson.interestAmount || 0,
          principleAmountDue: fieldJson.principleAmountDue || 0,
          interestDue: fieldJson.interestDue || 0,
          totalAmountDue: fieldJson.totalAmountDue || 0,
          distributedDay: fieldJson.distributedDay || null,
          assignedBy: fieldJson.assignedBy || null,
          assignedAt: fieldJson.assignedAt || null,
          lastFollowedUpDate: fieldJson.lastFollowedUpDate || null,
          waNumber: fieldJson.waNumber || null,
          otherPlatformActiveLoanCount: fieldJson.otherPlatformActiveLoanCount || null,
          ptpStatus: fieldJson.ptpStatus || null,
        } as SimbaCase;
      }) || [];

      const total = data.data?.total || records.length;

      return {
        records,
        total,
        size: pageSize,
        current: pageNum,
        orders: [],
        optimizeCountSql: false,
        searchCount: true,
        countId: null,
        maxLimit: null,
        pages: Math.ceil(total / pageSize) || 1,
      };
    } catch (error) {
      log.error('Simba getCasePage error:', error);
      throw error;
    }
  }

  async decryptPhone?(params: any): Promise<string | undefined> {
    return undefined;
  }

  async writeCase(
    caseDetail: CaseDetail,
    loanPlan: LoanPlan[],
    customerInfo: CustomerInfo,
    businessType: BusinessType | undefined
  ): Promise<void> {
    await writeCase(caseDetail, loanPlan, customerInfo, businessType);
  }
}
