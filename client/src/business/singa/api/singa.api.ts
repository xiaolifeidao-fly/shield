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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = await page.evaluate((): any => {
        const doc = (globalThis as any).document as any;
        if (!doc) {
          return null;
        }

        const table = doc.querySelector('#firstTable tbody');
        if (!table) {
          return null;
        }

        const row = table.querySelector('tr') as any;
        if (!row) {
          return null;
        }

        const cells = Array.from(row.querySelectorAll('td')) as any[];
        if (cells.length < 6) {
          return null;
        }

        const getCellText = (index: number): string => {
          const cell = cells[index] as any;
          if (!cell) {
            return '';
          }
          const text = cell.textContent ?? '';
          return String(text).replace(/\s+/g, ' ').trim();
        };

        const parseAmount = (text: string): number => {
          if (!text) {
            return 0;
          }
          const cleaned = text
            .replace(/Rp\./gi, '')
            .replace(/\s+/g, '')
            .replace(/\./g, '')
            .replace(/,/g, '');
          const num = parseFloat(cleaned);
          return Number.isNaN(num) ? 0 : num;
        };

        const parseDate = (text: string): string | null => {
          if (!text || text === '-' || text === '--') {
            return null;
          }
          const trimmed = text.replace(/\s+/g, ' ').trim();
          const date = new Date(trimmed);
          if (Number.isNaN(date.getTime())) {
            return null;
          }
          return date.toISOString();
        };

        const productName = getCellText(0);
        const bankName = getCellText(1);
        const contractAmount = parseAmount(getCellText(2));
        const applyAt = parseDate(getCellText(3));
        const disbursementDate = parseDate(getCellText(4));
        const disbursementAmount = parseAmount(getCellText(5));

        return {
          productName,
          bankName,
          contractAmount,
          applyAt,
          disbursementDate,
          disbursementAmount,
        };
      });

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
    const { pageNum = 1, pageSize = 20 } = params;
    
    const user = this.getCurrentUser();
    if (!user || !user.username) {
      throw new Error('未找到当前用户信息');
    }

    // resourceId = username + businessType
    const resourceId = `${user.username}_${user.businessType || 'singa'}`;

    let page;
    try {
      // 初始化页面
      const url = 'https://col.singa.id/loan-collection/assign/need-follow-up?page=' + pageNum;
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
      const username = user.username;
      // 解析表格数据
      // 注意：page.evaluate 中的代码在浏览器环境中执行
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cases: any = await page.evaluate((username : string) => {
        // @ts-expect-error - document 在浏览器环境中存在
        const rows = Array.from(document.querySelectorAll('tbody tr[class^="assign-"]'));
        const result: any[] = [];


        // 辅助函数：解析数字
        const parseNumber = (text: string | null | undefined, defaultValue: number = 0): number => {
          if (!text) return defaultValue;
          const num = parseInt(text.trim(), 10);
          return isNaN(num) ? defaultValue : num;
        };

        // 辅助函数：解析日期字符串（如 "23 Oct 2025 12:09"）
        const parseDate = (dateStr: string | null | undefined): string | null => {
          if (!dateStr || dateStr.trim() === '-' || dateStr.trim() === '') return null;
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          } catch (e) {
            // 解析失败返回 null
          }
          return null;
        };
        // DOM元素无法被JSON序列化,改为记录有用信息
        
        rows.forEach((row: any, index: number) => {
          try {
            // 从 class 中提取 ID（如 "assign-60183905"）
            const classList = row.className;
            const idMatch = classList.match(/assign-(\d+)/);
            if (!idMatch) {
              return;
            }

            const id = parseInt(idMatch[1], 10);
            if (isNaN(id)) {
              return;
            }

            // 获取所有 td 元素，按表格列顺序解析
            const cells = Array.from(row.querySelectorAll('td'));
            
            // 按照表格列顺序解析各个字段（跳过第1列复选框）
            // 1. Order # - 订单号
            const orderNumberEl = row.querySelector('.orderNumber');
            const caseId = orderNumberEl?.textContent?.trim() || '';
            
            // 从 href 中提取 caseId（更准确）
            const detailLink = row.querySelector('a[href*="/detail/"]');
            let extractedCaseId = caseId;
            if (detailLink) {
              const href = detailLink.href;
              const match = href.match(/\/detail\/([^\/]+)/);
              if (match) {
                extractedCaseId = match[1];
              }
            }
            

            // 2. PTP 状态
            let ptpStatus: string | null = null;
            const ptpCell = cells[2] as any; // 第3列（索引2）
            if (ptpCell) {
              const ptpBadge = ptpCell.querySelector('.badge');
              if (ptpBadge) {
                const ptpText = ptpBadge.textContent?.trim() || '';
                if (ptpText.includes('PTP') || ptpText.includes('NO PTP') || ptpText.includes('BP')) {
                  ptpStatus = ptpText;
                }
              }
            }

            // 3. PRI 分数
            let priScore: number | null = null;
            const priCell = cells[3] as any; // 第4列（索引3）
            if (priCell) {
              const priBadge = priCell.querySelector('.badge.bg-danger');
            if (priBadge) {
              const priText = priBadge.textContent?.trim() || '';
              const priNum = parseNumber(priText);
                if (priNum >= 0) {
                priScore = priNum;
                }
              }
            }

            // 4. Extended - 是否延期订单
            const isExtendedOrderEl = row.querySelector('.isExtendedOrder');
            const isExtendedOrderText = isExtendedOrderEl?.textContent?.trim() || '';
            const isExtendedOrder = isExtendedOrderText.toLowerCase().includes('yes');

            // 5. Installment - 分期序号
            const installmentEl = row.querySelector('.installment');
            const installmentSequence = parseNumber(installmentEl?.textContent, 0);

            // 6. Borrower - 借款人姓名
            const borrowerNameEl = row.querySelector('.borrowerName');
            const fullName = borrowerNameEl?.textContent?.trim() || '';

            // 7. Occupation - 职业
            const jobNameEl = row.querySelector('.jobName');
            const occupation = jobNameEl?.textContent?.trim() || null;

            // 8. OPL - 其他平台活跃贷款数量
            const oplEl = row.querySelector('.other-platform-active-loan-count');
            const oplCount = parseNumber(oplEl?.textContent, 0);
            
            // 从 OPL 链接的 onclick 中提取 customerId
            let customerId = id;
            if (oplEl) {
              const onclick = oplEl.getAttribute('onclick');
              if (onclick) {
                const match = onclick.match(/loadFdcLoanPage\((\d+)\)/);
                if (match) {
                  customerId = parseNumber(match[1], id);
                }
              }
            }

            // 9. Phone - 电话
            const borrowerPhoneEl = row.querySelector('.borrowerPhone');
            const mobile = borrowerPhoneEl?.textContent?.trim() || '';

            // 10. WA - WhatsApp
            const borrowerWaEl = row.querySelector('.borrowerWa');
            const waNumber = borrowerWaEl?.textContent?.trim() || null;

            // WA Remark Content
            const waRemarkLink = row.querySelector('.open-wa-remark-modal');
            const waRemarkContent = waRemarkLink?.getAttribute('data-title') || null;

            // 11. Email - 邮箱
            const borrowerEmailEl = row.querySelector('.borrowerEmail');
            const email = borrowerEmailEl?.textContent?.trim() || null;

            // 12. Product - 产品
            const productEl = row.querySelector('.product');
            const product = productEl?.textContent?.trim() || null;

            // 13. DPD - 逾期天数
            let overdueDay = 0;
            const dpdCell = cells[13] as any; // 第14列（索引13）
            if (dpdCell) {
              const textDangerEl = dpdCell.querySelector('.text-danger');
              if (textDangerEl) {
                const text = textDangerEl.textContent?.trim() || '';
                const num = parseInt(text, 10);
                if (!isNaN(num) && num >= 0) {
                  overdueDay = num;
                }
              }
            }

            // 14. Bucket - 催收等级
            const collectionLevelEl = row.querySelector('.collectionLevel');
            const collectionLevel = collectionLevelEl?.textContent?.trim() || null;

            // 15-20. 金额字段：Penalty, Current Due, Total Due, Repayment, RWP, Remaining
            // 按表格列顺序提取金额（索引15-20）
            let penaltyAmount = 0;
            let currentDueAmount = 0;
            let totalDueAmount = 0;
            let repaymentAmount = 0;
            let rwp = 0;
            let remainingAmount = 0;
            
            // 按表格列顺序解析金额字段
            // 15. Penalty (索引15)
            const penaltyCell = cells[15] as any;
            if (penaltyCell && penaltyCell.textContent?.includes('Rp.')) {
              const text = penaltyCell.textContent?.trim() || '';
              const match = text.match(/Rp\.\s*([\d.]+)/);
              if (match) {
                const numStr = match[1].replace(/\./g, '');
                penaltyAmount = parseFloat(numStr) || 0;
              }
            }
            
            // 16. Current Due (索引16)
            const currentDueCell = cells[16] as any;
            if (currentDueCell && currentDueCell.textContent?.includes('Rp.')) {
              const text = currentDueCell.textContent?.trim() || '';
              const match = text.match(/Rp\.\s*([\d.]+)/);
              if (match) {
                const numStr = match[1].replace(/\./g, '');
                currentDueAmount = parseFloat(numStr) || 0;
              }
            }
            
            // 17. Total Due (索引17)
            const totalDueCell = cells[17] as any;
            if (totalDueCell && totalDueCell.textContent?.includes('Rp.')) {
              const text = totalDueCell.textContent?.trim() || '';
              const match = text.match(/Rp\.\s*([\d.]+)/);
              if (match) {
                const numStr = match[1].replace(/\./g, '');
                totalDueAmount = parseFloat(numStr) || 0;
              }
            }
            
            // 18. Repayment (索引18)
            const repaymentCell = cells[18] as any;
            if (repaymentCell && repaymentCell.textContent?.includes('Rp.')) {
              const text = repaymentCell.textContent?.trim() || '';
              const match = text.match(/Rp\.\s*([\d.]+)/);
              if (match) {
                const numStr = match[1].replace(/\./g, '');
                repaymentAmount = parseFloat(numStr) || 0;
              }
            }
            
            // 19. RWP (索引19)
            const rwpCell = cells[19] as any;
            if (rwpCell && rwpCell.textContent?.includes('Rp.')) {
              const text = rwpCell.textContent?.trim() || '';
              const match = text.match(/Rp\.\s*([\d.]+)/);
              if (match) {
                const numStr = match[1].replace(/\./g, '');
                rwp = parseFloat(numStr) || 0;
              }
            }
            
            // 20. Remaining (索引20)
            const remainingCell = cells[20] as any;
            if (remainingCell && remainingCell.textContent?.includes('Rp.')) {
              const text = remainingCell.textContent?.trim() || '';
              const match = text.match(/Rp\.\s*([\d.]+)/);
              if (match) {
                const numStr = match[1].replace(/\./g, '');
                remainingAmount = parseFloat(numStr) || 0;
              }
            }

            // 计算 principleAmount（通常是最小的金额，可能是 Current Due 或 Remaining）
            let principleAmount = 0;
            if (currentDueAmount > 0) {
              principleAmount = currentDueAmount;
            } else if (remainingAmount > 0) {
              principleAmount = remainingAmount;
            } else if (totalDueAmount > 0) {
              principleAmount = totalDueAmount;
            }

            // 21. Sensitivity - 敏感度
            let sensitivity: string | null = null;
            const sensitivityCell = cells[21] as any; // 第22列（索引21）
            if (sensitivityCell) {
              const sensitivityBadge = sensitivityCell.querySelector('.badge');
              if (sensitivityBadge) {
                const sensitivityText = sensitivityBadge.textContent?.trim() || '';
                if (sensitivityText.includes('risk') || sensitivityText.includes('No risk')) {
                  sensitivity = sensitivityText;
                }
              }
            }

            // 22. Borrower Type - 借款人类型
            let customerType: string | null = null;
            const borrowerTypeCell = cells[22] as any; // 第23列（索引22）
            if (borrowerTypeCell) {
              const borrowerTypeBadge = borrowerTypeCell.querySelector('.badge');
              if (borrowerTypeBadge) {
                const borrowerTypeText = borrowerTypeBadge.textContent?.trim() || '';
                if (borrowerTypeText.includes('New') || borrowerTypeText.includes('Existing') || borrowerTypeText.includes('No risk')) {
                  customerType = borrowerTypeText;
                }
              }
            }

            // 23. WA Intention - WA 意向
            let waIntentionLevel: string | null = null;
            const waIntentionCell = cells[23] as any; // 第24列（索引23）
            if (waIntentionCell) {
              const waIntentionBadge = waIntentionCell.querySelector('.badge');
              if (waIntentionBadge) {
                const waIntentionText = waIntentionBadge.textContent?.trim() || '';
                if (waIntentionText.includes('WA') || waIntentionText.includes('Delivered')) {
                  waIntentionLevel = waIntentionText;
                }
              }
            }

            // 24. Plan - 计划
            let plan: string | null = null;
            const planCell = cells[24] as any; // 第25列（索引24）
            if (planCell) {
              const planText = planCell.textContent?.trim() || '';
              if (planText.includes('Apps Notif') || planText.includes('Plan')) {
                plan = planText;
              }
            }

            // 25. Assigned By - 分配人
            let assignedBy: string | null = null;
            const assignedByCell = cells[25] as any; // 第26列（索引25）
            if (assignedByCell) {
              const assignedByText = assignedByCell.textContent?.trim() || '';
              // 排除日期格式和金额
              if (assignedByText && !assignedByText.match(/\d+\s+\w+\s+\d{4}/) && !assignedByText.includes('Rp.')) {
                assignedBy = assignedByText;
              }
            }

            // 26. Assigned At - 分配时间
            let assignedAt: string | null = null;
            const assignedAtCell = cells[26] as any; // 第27列（索引26）
            if (assignedAtCell) {
              const assignedAtText = assignedAtCell.textContent?.trim() || '';
              if (assignedAtText && assignedAtText !== '-') {
                assignedAt = parseDate(assignedAtText);
              }
            }

            // 27. Last Followed - 最后跟进时间
            let lastFollowedUpDate: string | null = null;
            const lastFollowedCell = cells[27] as any; // 第28列（索引27）
            if (lastFollowedCell) {
              const lastFollowedText = lastFollowedCell.textContent?.trim() || '';
              if (lastFollowedText && lastFollowedText !== '-') {
                lastFollowedUpDate = parseDate(lastFollowedText);
              }
            }

            // 构建 SingaCase 对象，尽可能填充所有字段
            const caseItem: any = {
              id: id,
              caseId: extractedCaseId || caseId,
              fullName: fullName,
              customerType: customerType,
              product: product,
              status: ptpStatus,
              mobile: mobile,
              trigger: plan,
              customerId: customerId,
              groupId: 0,
              level: collectionLevel,
              amount: totalDueAmount || 0,
              principleAmount: principleAmount,
              distributedDay: 0,
              overdueDay: overdueDay,
              reviewerId: null,
              reviewerName: username,
              createTime: assignedAt || new Date().toISOString(),
              lastLogCreateTime: lastFollowedUpDate,
              customerTag: null,
              customerSysTag: occupation,
              teamLeaderName: null,
              lastSevenCount: null,
              riskGrade: priScore?.toString() || null,
              clearedNumber: 0,
              outCallTaskConfigId: 0,
              outCallTaskName: null,
              outCallTaskStrategyId: null,
              outCallTaskCode: null,
              outCallTaskStatus: null,
              predictOutCallTaskId: null,
              lastLoginTime: null,
              channel1: null,
              channel2: null,
              phoneRemarkContent: null,
              waRemarkContent: waRemarkContent,
              dueDate: null,
              todoFlag: false,
              queue: null,
              smsEventStatus: null,
              latestSmsSendSuccessTime: null,
              loanTag: waIntentionLevel,
              vipLevel: null,
              postLoanPreReminderLevel: null,
              overdueInstitutionLevel: null,
              applyPlatform: null,
              installPlatform: null,
              lastLoginPlatform: null,
              allowDownloadCollectionLetter: false,
              waitCall: false,
              inCollectionDays: overdueDay,
              isTadpole: oplCount > 0,
              // SingaCase 特有字段
              orderNumber: extractedCaseId || caseId,
              ptpStatus: ptpStatus as 'PTP' | 'NO PTP' | 'BP' | null,
              priScore: priScore,
              isExtendedOrder: isExtendedOrder,
              installmentSequence: installmentSequence || undefined,
              occupation: occupation,
              otherPlatformActiveLoanCount: oplCount || undefined,
              waNumber: waNumber,
              email: email,
              dpd: overdueDay,
              collectionLevel: collectionLevel,
              penaltyAmount: penaltyAmount || undefined,
              currentDueAmount: currentDueAmount || undefined,
              repaymentAmount: repaymentAmount || undefined,
              rwp: rwp || undefined,
              remainingAmount: remainingAmount || undefined,
              sensitivity: sensitivity,
              waIntentionLevel: waIntentionLevel,
              plan: plan,
              assignedBy: assignedBy,
              assignedAt: assignedAt,
              lastFollowedUpDate: lastFollowedUpDate,
            };

            console.log(`第 ${index} 行: ✓ 成功解析, CaseID=${extractedCaseId}`, username);
            result.push(caseItem);
          } catch (error) {
            console.error(`第 ${index} 行: ✗ 解析失败`, error);
            // 打印更详细的错误信息
            if (error instanceof Error) {
              console.error(`  错误消息: ${error.message}`);
              console.error(`  错误堆栈: ${error.stack}`);
            }
          }
        });
        return result;
      }, username);
      log.info(`cases: ${JSON.stringify(cases)}`);
      // 从页面提取分页信息
      const paginationInfo = await page.evaluate(() => {
        // @ts-expect-error - document 在浏览器环境中存在
        const showingText = (document.querySelector('.text-muted') as HTMLElement)?.textContent || '';
        // 匹配 "Showing 1 to 50 of 110 results"
        const match = showingText.match(/of\s+(\d+)\s+results/i);
        const total = match ? parseInt(match[1], 10) : 0;
        
        // 获取当前页码
        // @ts-expect-error - document 在浏览器环境中存在
        const activePage = document.querySelector('.pagination .page-item.active .page-link') as HTMLElement;
        const current = activePage ? parseInt(activePage.textContent || '1', 10) : 1;
        
        return { total, current };
      });

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

