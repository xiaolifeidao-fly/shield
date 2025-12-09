/**
 * 公共业务实体类型
 * 所有业务类型共享的实体定义
 */

/**
 * 案例信息接口
 */
export interface Case {
  id: number;
  caseId: string;
  fullName: string;
  customerType: string | null;
  product: string | null;
  status: string | null;
  mobile: string;
  trigger: string | null;
  customerId: number;
  groupId: number;
  level: string | null;
  amount: number;
  principleAmount: number;
  distributedDay: number;
  overdueDay: number;
  reviewerId: number | null;
  reviewerName: string | null;
  createTime: string;
  lastLogCreateTime: string | null;
  customerTag: string | null;
  customerSysTag: string | null;
  teamLeaderName: string | null;
  lastSevenCount: number | null;
  riskGrade: string | null;
  clearedNumber: number;
  outCallTaskConfigId: number;
  outCallTaskName: string | null;
  outCallTaskStrategyId: number | null;
  outCallTaskCode: string | null;
  outCallTaskStatus: string | null;
  predictOutCallTaskId: number | null;
  lastLoginTime: string | null;
  channel1: string | null;
  channel2: string | null;
  phoneRemarkContent: string | null;
  waRemarkContent: string | null;
  dueDate: string | null;
  todoFlag: boolean;
  queue: string | null;
  smsEventStatus: string | null;
  latestSmsSendSuccessTime: string | null;
  loanTag: string | null;
  vipLevel: string | null;
  postLoanPreReminderLevel: string | null;
  overdueInstitutionLevel: string | null;
  applyPlatform: string | null;
  installPlatform: string | null;
  lastLoginPlatform: string | null;
  allowDownloadCollectionLetter: boolean;
  waitCall: boolean;
  inCollectionDays: number;
  isTadpole: boolean;
}

/**
 * 分页查询参数
 */
export interface CasePageParams {
  pageNum?: number; // 页码，默认1
  pageSize?: number; // 每页大小，默认20
  product?: string; // 产品类型
  [key: string]: any; // 允许其他查询参数
}

/**
 * 分页响应数据
 * @template TCase Case 类型或其子类型，默认为 Case
 */
export interface CasePageResponse<TCase extends Case = Case> {
  records: TCase[];
  total: number;
  size: number;
  current: number;
  orders: any[];
  optimizeCountSql: boolean;
  searchCount: boolean;
  countId: string | null;
  maxLimit: number | null;
  pages: number;
}

/**
 * 案件详情接口
 */
export interface CaseDetail {
  id: string;
  caseId: string;
  trigger: string | null;
  level: string | null;
  fullName: string;
  mobile: string;
  customerId: number;
  overdueDay: number;
  reviewerId: number | null;
  reviewerName: string | null;
  customerTag: string | null;
  riskGrade: string | null;
  clearedNumber: number;
  tags: string;
  channel1: string | null;
  channel2: string | null;
  gender: string | null;
  dueDate: string | null;
  loanTag: string | null;
  postLoanPreReminderLevel: string | null;
  overdueInstitutionLevel: string | null;
  isMinPay: boolean | null;
  isInstallmentPay: boolean | null;
  minPayBillId: number | null;
  installmentBillId: number | null;
  customerClikInfo: any | null;
  vaList: any | null;
  tadpoleCount: string;
  tadpoleAmount: string;
  riskScoreAndLevel: string | null;
  amount: number;
  principleAmount: number;
  interestAmount: number;
  punishmentAmount: number;
  vatAmount: number;
  distributedDay: number;
  expireAmount: number;
  expirePrincipleAmount: number;
  expireInterestAmount: number;
  expirePunishmentAmount: number;
  expireVatAmount: number;
  backupMobile: string;
  createTime: string;
  whatsUpNum : string | null;
  loanAmount : number | null;
  paidAmount: number;
  loanTime : string | null;
  bankCode : string | null;
  accountNumber : string | null;
  productName : string | null;
}

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

  /** 公司名称 */
  companyName: string | null;

  /** 工作城市 */
  workCity: string | null;

  /** 办公地址 */
  officeAddress: string | null;

  /** 办公电话 */
  officeNumber: string | null;
  
  /** 职业 */
  job : string | null;
}

/**
 * 还款计划接口
 */
export interface LoanPlan {
  id: number;
  loanType: string;
  status: string;
  loanSubType: string;
  amount: number;
  interestRate: number;
  duration: string;
  period: number;
  periodsNumber: number;
  periodUnit: string;
  dueAmount: number | null;
  minDueDate: string | null;
  overdueDays: number;
  gracePeriodRate: number;
  collectionLevel: string | null;
  principalAmount: number;
  interestAmount: number;
  defaultAmount: number;
  vatAmount: number;
  shouldRepaymentAmount: number;
  creditQuality: string;
  platform: string;
  rolloverType: string | null;
  esignFlag: boolean;
}

/**
 * 贷款详情接口
 */
export interface LoanDetail {
  id: number;
  loanType: string;
  status: string;
  loanSubType: string;
  amount: number;
  interestRate: number;
  duration: string;
  period: number;
  periodsNumber: number;
  periodUnit: string;
  dueAmount: number | null;
  minDueDate: string | null;
  overdueDays: number;
  gracePeriodRate: number;
  collectionLevel: string | null;
  principalAmount: number;
  interestAmount: number;
  defaultAmount: number;
  vatAmount: number;
  shouldRepaymentAmount: number;
  creditQuality: string;
  platform: string;
  rolloverType: string | null;
  esignFlag: boolean;
}

