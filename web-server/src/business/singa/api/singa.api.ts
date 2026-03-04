import { AxiosInstance } from 'axios';
import { BaseBusinessApi } from '../../common/base.api';
import { CasePageParams, CasePageResponse, CaseDetail, LoanPlan, CustomerInfo, Case, LoanDetail } from '../../common/entities';
import { UserInfo, BusinessType } from '@eleapi/user/user.api';
import { getCurrentUser, setCurrentUser, writeCaseInstance } from '../../adapundi/api/adapundi.axios';
import { EngineInstance } from '@src/engine/engine.instance';
import log from 'electron-log';
import { getPage } from '@src/business/common/engine.manager';
import { Page } from 'playwright-core';
import { login as singaLogin } from './login.api';
import { writeCase } from '@src/business/adapundi/api/writeCase.api';
import { sleep } from '@utils/index';
import { evaluateSerializedScript } from '@src/utils/page-eval';
import { EXTRACT_CASE_PAGE_SCRIPT, EXTRACT_LOAN_DETAIL_SCRIPT } from './singa.page-scripts';

/**
 * Singa Case 接口，扩展自 Case
 * 包含 Singa 平台特有的字段
 */
export interface SingaCase extends Case {
  /** 订单号 (Order Number) */
  orderNumber?: string;
  
  /** PTP 状态 (Promise to Pay) */
  ptpStatus?: 'PTP' | 'NO PTP' | 'BP' | null;
  
  /** PRI 分数 (Performance Risk Indicator) */
  priScore?: number | null;
  
  /** 是否为扩展订单 (Extended Order) */
  isExtendedOrder?: boolean;
  
  /** 分期序号 (Installment Sequence) */
  installmentSequence?: number;
  
  /** 职业 (Occupation) */
  occupation?: string | null;
  
  /** 其他平台活跃贷款数量 (Other Platform Active Loan Count) */
  otherPlatformActiveLoanCount?: number;
  
  /** WA 号码 (WhatsApp Number) */
  waNumber?: string | null;
  
  /** 邮箱 (Email) */
  email?: string | null;
  
  /** DPD (Days Past Due) - 逾期天数 */
  dpd?: number;
  
  /** 催收等级 (Collection Level) */
  collectionLevel?: string | null;
  
  /** 罚金金额 (Penalty Amount) */
  penaltyAmount?: number;
  
  /** 当前应还金额 (Current Due Amount) */
  currentDueAmount?: number;
  
  /** 还款金额 (Repayment Amount) */
  repaymentAmount?: number;
  
  /** RWP - Remaining Working Principal (剩余工作本金) */
  rwp?: number;
  
  /** 剩余金额 (Remaining Amount) */
  remainingAmount?: number;
  
  /** 敏感度 (Sensitivity) */
  sensitivity?: string | null;
  
  /** WA 意向等级 (WA Intention Level) */
  waIntentionLevel?: string | null;
  
  /** 计划 (Plan) */
  plan?: string | null;
  
  /** 分配人 (Assigned By) */
  assignedBy?: string | null;
  
  /** 分配时间 (Assigned At) */
  assignedAt?: string | null;
  
  /** 最后跟进时间 (Last Followed Up Date) */
  lastFollowedUpDate?: string | null;
}

interface SingaLoanDetailPageData {
  productName: string;
  bankName: string;
  contractAmount: number;
  applyAt: string | null;
  disbursementDate: string | null;
  disbursementAmount: number;
}

/**
 * Singa 业务 API 实现
 * TODO: 实现具体的 API 方法
 */
export class SingaBusinessApi extends BaseBusinessApi<SingaCase> {

  getLoanPlan(customerId: number): Promise<LoanPlan[]> {
    return Promise.resolve([]);
  }

  getCustomerInfo(product: string, caseItem : SingaCase): Promise<CustomerInfo> {
    // 将 SingaCase 转换为 CustomerInfo
    const customerInfo: CustomerInfo = {
      fullName: caseItem.fullName || '',
      customerId: caseItem.customerId,
      mobile: caseItem.mobile || '',
      credentialNo: '', // SingaCase 中没有此字段
      gender: '', // SingaCase 中没有此字段
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
    if (!caseId) {
      log.warn('Singa 获取贷款详情失败: caseId 为空');
      return null;
    }

    const user = this.getCurrentUser();
    if (!user || !user.username) {
      log.error('Singa 获取贷款详情失败: 未找到当前用户信息');
      return null;
    }

    const resourceId = `${user.username}_${user.businessType || 'singa'}`;
    const detailUrl = `https://col.singa.id/loan-collection/detail/${caseId}`;
    const loginUrl = 'https://col.singa.id/login';

    try {
      let page = await getPage(resourceId, detailUrl) as unknown as Page;
      if (!page) {
        throw new Error('无法初始化详情页面');
      }

      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl === loginUrl) {
        const loginResult = await singaLogin(user, detailUrl);
        if (!loginResult.success) {
          log.error(`Singa 登录失败，无法获取贷款详情: ${loginResult.message || '未知错误'}`);
          return null;
        }

        page = await getPage(resourceId, detailUrl) as unknown as Page;
        if (!page) {
          throw new Error('登录后无法初始化详情页面');
        }
      }

      await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {
        log.warn(`Singa 贷款详情页面加载 domcontentloaded 超时: ${caseId}`);
      });

      await page.waitForSelector('#firstTable tbody tr', { timeout: 15000 }).catch(() => {
        log.warn(`Singa 贷款详情页面未找到订单表格: ${caseId}`);
      });

      const detail = await evaluateSerializedScript<SingaLoanDetailPageData | null>(page, EXTRACT_LOAN_DETAIL_SCRIPT);

      if (!detail) {
        log.warn(`Singa 贷款详情解析失败: ${caseId}`);
        return null;
      }

      const loanDetail: LoanDetail = {
        id: 0,
        loanType: detail.productName || '',
        status: '',
        loanSubType: detail.bankName || '',
        amount: detail.contractAmount || 0,
        interestRate: 0,
        duration: '',
        period: 0,
        periodsNumber: 0,
        periodUnit: '',
        dueAmount: 0,
        minDueDate: detail.disbursementDate ?? null,
        overdueDays: 0,
        gracePeriodRate: 0,
        collectionLevel: null,
        principalAmount: detail.disbursementAmount || 0,
        interestAmount: 0,
        defaultAmount: 0,
        vatAmount: 0,
        shouldRepaymentAmount: detail.disbursementAmount ?? 0,
        creditQuality: '',
        platform: '',
        rolloverType: null,
        esignFlag: false,
      };

      return loanDetail;
    } catch (error) {
      log.error(`Singa 获取贷款详情异常 caseId=${caseId}`, error);
      return null;
    }
  }

  async getCaseDetail(product: string, caseItem : SingaCase): Promise<CaseDetail> {
    // 将 SingaCase 转换为 CaseDetail
    const caseDetail: CaseDetail = {
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
      riskGrade: caseItem.riskGrade || (caseItem.priScore !== null && caseItem.priScore !== undefined ? String(caseItem.priScore) : null),
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
      tadpoleCount: caseItem.otherPlatformActiveLoanCount !== undefined ? String(caseItem.otherPlatformActiveLoanCount) : '0',
      tadpoleAmount: '0', // SingaCase 中没有此字段
      riskScoreAndLevel: caseItem.priScore !== null && caseItem.priScore !== undefined 
        ? `${caseItem.priScore}${caseItem.riskGrade ? '/' + caseItem.riskGrade : ''}` 
        : null,
      amount: caseItem.amount || 0,
      principleAmount: caseItem.principleAmount || 0,
      interestAmount: 0, // SingaCase 中没有此字段，需要计算或默认为 0
      punishmentAmount: caseItem.penaltyAmount || 0,
      vatAmount: 0, // SingaCase 中没有此字段
      distributedDay: caseItem.distributedDay || 0,
      expireAmount: caseItem.amount || 0, // 使用 amount 作为过期金额
      expirePrincipleAmount: caseItem.principleAmount || 0,
      expireInterestAmount: 0,
      expirePunishmentAmount: caseItem.penaltyAmount || 0,
      expireVatAmount: 0,
      backupMobile: '',
      createTime: caseItem.createTime || new Date().toISOString(),
      whatsUpNum: caseItem.waNumber || null,
      loanAmount: null,
    };
    try {
      const loanDetail = await this.getLoanDetail(caseDetail.caseId);
      if (loanDetail && loanDetail.amount > 0) {
        caseDetail.loanAmount = loanDetail.amount;
        if (!caseDetail.principleAmount) {
          caseDetail.principleAmount = loanDetail.principalAmount;
        }
        if (!caseDetail.amount) {
          caseDetail.loanAmount = loanDetail.amount;
        }
      }
    } catch (error) {
      log.warn(`Singa 案件详情补充贷款数据失败 caseId=${caseDetail.caseId}`, error);
    }
    return caseDetail;
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

  /**
   * 解析金额字符串（如 "Rp. 1.084.424"）为数字
   */
  private parseAmount(amountStr: string | null | undefined): number {
    if (!amountStr) return 0;
    // 移除 "Rp.", 空格和千位分隔符 "."
    const cleaned = amountStr.replace(/Rp\./gi, '').replace(/\s+/g, '').replace(/\./g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * 解析数字字符串
   */
  private parseNumber(str: string | null | undefined, defaultValue: number = 0): number {
    if (!str) return defaultValue;
    const num = parseInt(str.trim(), 10);
    return isNaN(num) ? defaultValue : num;
  }

  async getCasePage(params: CasePageParams): Promise<CasePageResponse<SingaCase>> {
    const { pageNum = 1, pageSize = 20, type = 'need_follow_up' } = params;

    const user = this.getCurrentUser();
    if (!user || !user.username) {
      throw new Error('未找到当前用户信息');
    }

    // resourceId = username + businessType
    const resourceId = `${user.username}_${user.businessType || 'singa'}`;

    let page;
    try {
      // 根据 type 构建不同的 URL
      let url: string;
      if (type === 'followed_up_task') {
        // 计算昨天的日期 (yyyy-MM-dd)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yyyy = yesterday.getFullYear();
        const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const dd = String(yesterday.getDate()).padStart(2, '0');
        const assignAt = `${yyyy}-${mm}-${dd}`;
        url = `https://col.singa.id/loan-collection/assign/already-follow-up?assign_at=${assignAt}&page=${pageNum}&pageSize=1000`;
      } else {
        // 默认 need_follow_up 页面
        url = 'https://col.singa.id/loan-collection/assign/need-follow-up?page=' + pageNum + "&pageSize=1000";
      }

      log.info(`Singa getCasePage: params=${JSON.stringify(params)}, type=${type}, url=${url}`);

      page = await getPage(resourceId, url) as unknown as Page;
      if (!page) {
        throw new Error('无法初始化页面');
      }

      // 检查是否需要重新登录
      // 如果当前 URL 包含登录页面，说明需要重新登录
      const currentUrl = page.url();
      const loginUrl = 'https://col.singa.id/login';
      if (currentUrl.includes('/login') || currentUrl === loginUrl) {
        log.info('检测到需要重新登录，开始执行登录流程');
        const loginResult = await singaLogin(user, url);
        if (!loginResult.success) {
          throw new Error(`登录失败: ${loginResult.message || '未知错误'}`);
        }
        // 登录成功后，重新获取 case 列表页面
        page = await getPage(resourceId, url) as unknown as Page;
        if (!page) {
          throw new Error('登录后无法重新初始化页面');
        }
      }

      // 等待界面加载完成
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
        log.warn('页面加载超时');
      });

      // 等待表格渲染完成，再执行 evaluate
      try {
        await page.waitForSelector('tbody tr[class^="assign-"]', { timeout: 15000 });
      } catch (e) {
        log.warn('表格未在15秒内渲染完成，继续尝试解析');
      }

      const username = user.username;
      // 解析表格数据
      // 注意：page.evaluate 中的代码在浏览器环境中执行

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cases: any;
      try {
        // @ts-ignore
        cases = await evaluateSerializedScript<SingaCase[], string>(page, EXTRACT_CASE_PAGE_SCRIPT, username);
      } catch (error: any) {
        log.error('page.evaluate failed:', error?.message || error);
        throw new Error(`page.evaluate 解析失败: ${error?.message || error}`);
      }

      // 从页面提取分页信息（使用 locator 避免 page.evaluate 上下文冲突）
      let paginationTotal = 0;
      let paginationCurrent = 1;
      try {
        const showingText = await page.locator('.text-muted').first().innerText({ timeout: 10000 });
        const match = showingText.match(/of\s+(\d+)\s+results/i);
        paginationTotal = match ? parseInt(match[1], 10) : 0;
      } catch (e) {
        log.warn('提取分页信息失败:', e);
      }
      try {
        const activePageText = await page.locator('.pagination .page-item.active .page-link').first().innerText({ timeout: 5000 });
        paginationCurrent = parseInt(activePageText || '1', 10);
      } catch (e) {
        log.warn('提取当前页码失败:', e);
      }
      const paginationInfo = { total: paginationTotal, current: paginationCurrent };

      // 计算总数和页数
      const casesArray = Array.isArray(cases) ? cases : [];
      const total = paginationInfo.total || (casesArray.length >= pageSize ? casesArray.length * pageNum : casesArray.length);
      const pages = Math.ceil(total / pageSize);

      const response: CasePageResponse<SingaCase> = {
        records: casesArray as SingaCase[],
        total: total,
        size: pageSize,
        current: pageNum,
        orders: [],
        optimizeCountSql: false,
        searchCount: true,
        countId: null,
        maxLimit: null,
        pages: pages,
      };
      return response;
    } catch (error) {
      log.error('getCasePage error:', error);
      throw error;
    } finally {
      // 注意：这里不关闭引擎，因为引擎可能被重用
      // 如果需要关闭，可以调用 engine.closeBrowser()
    }
  }

  // Singa 业务可能不需要解密手机号，或者使用不同的解密方式
  // 如果 Singa 需要解密手机号，可以重写此方法
  async decryptPhone?(params: any): Promise<string|undefined> {
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
