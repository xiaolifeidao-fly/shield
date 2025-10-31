## 接口名称

- writeCase

## 功能说明

- 将一个案件的详情数据与其还款计划写入本地/目标存储（手机号字段在进入本函数前已完成解密处理）。

## 方法签名

```ts
async function writeCase(caseDetail: CaseDetail, loanPlan: LoanPlan[], customerInfo: CustomerInfo): Promise<void>
```

## 入参说明

- caseDetail: 案件详情对象，类型为 `CaseDetail`。注意 `mobile`、`backupMobile` 在调用本函数前已被解密为明文。
- loanPlan: 还款计划数组，元素类型为 `LoanPlan`，可能为空数组。
- customerInfo: 客户信息对象，类型为 `CustomerInfo`。

---

## CaseDetail 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 案件内部主键ID |
| caseId | string | 案件编号 |
| trigger | string \| null | 触发来源或分案触发类型 |
| level | string \| null | 催收分级/风险等级 |
| fullName | string | 姓名 |
| mobile | string | 本人手机号（明文） |
| customerId | number | 客户ID |
| overdueDay | number | 逾期天数 |
| reviewerId | number \| null | 审核人ID |
| reviewerName | string \| null | 审核人名称 |
| customerTag | string \| null | 客户标签（自定义标签） |
| riskGrade | string \| null | 风险等级（如 A/B/C 等） |
| clearedNumber | number | 已结清次数或笔数 |
| tags | string | 标签集合（字符串形式） |
| channel1 | string \| null | 渠道一级来源 |
| channel2 | string \| null | 渠道二级来源 |
| gender | string \| null | 性别 |
| dueDate | string \| null | 到期日（ISO 字符串） |
| loanTag | string \| null | 贷款标签 |
| postLoanPreReminderLevel | string \| null | 贷后预提醒层级 |
| overdueInstitutionLevel | string \| null | 逾期机构层级 |
| isMinPay | boolean \| null | 是否支持最低还款 |
| isInstallmentPay | boolean \| null | 是否支持分期还款 |
| minPayBillId | number \| null | 最低还款账单ID |
| installmentBillId | number \| null | 分期账单ID |
| customerClikInfo | any \| null | 客户点击/行为信息 |
| vaList | any \| null | 虚拟账户/收款账户列表 |
| tadpoleCount | string | “蝌蚪”计数（业务自定义维度） |
| tadpoleAmount | string | “蝌蚪”金额（业务自定义维度） |
| riskScoreAndLevel | string \| null | 风险分与级别描述 |
| amount | number | 应还总额 |
| principleAmount | number | 本金 |
| interestAmount | number | 利息 |
| punishmentAmount | number | 违约金 |
| vatAmount | number | 增值税额 |
| distributedDay | number | 入催/分案天数 |
| expireAmount | number | 逾期总额 |
| expirePrincipleAmount | number | 逾期本金 |
| expireInterestAmount | number | 逾期利息 |
| expirePunishmentAmount | number | 逾期违约金 |
| expireVatAmount | number | 逾期增值税额 |
| backupMobile | string | 备用手机号（明文） |
| createTime | string | 创建时间（ISO 字符串） |

---

## LoanPlan 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 还款计划ID |
| loanType | string | 贷款类型（如现金贷/分期等） |
| status | string | 当前状态（如生效/结清/逾期等） |
| loanSubType | string | 贷款子类型 |
| amount | number | 贷款金额 |
| interestRate | number | 利率（按后端定义的口径） |
| duration | string | 期限描述（如 12M/30D 等） |
| period | number | 当前期数 |
| periodsNumber | number | 总期数 |
| periodUnit | string | 期限单位（如 DAY/MONTH） |
| dueAmount | number \| null | 当期应还金额 |
| minDueDate | string \| null | 最早应还日（ISO 字符串） |
| overdueDays | number | 逾期天数 |
| gracePeriodRate | number | 宽限期费率 |
| collectionLevel | string \| null | 催收层级 |
| principalAmount | number | 本金 |
| interestAmount | number | 利息 |
| defaultAmount | number | 罚息/违约金 |
| vatAmount | number | 增值税额 |
| shouldRepaymentAmount | number | 应还总额 |
| creditQuality | string | 授信质量（如良好/关注/不良） |
| platform | string | 产品/平台标识 |
| rolloverType | string \| null | 展期类型 |
| esignFlag | boolean | 是否电子签章 |

---

## CustomerInfo 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| fullName | string | 全名 |
| customerId | number | 客户ID |
| mobile | string | 手机号（脱敏） |
| credentialNo | string | 身份证号（脱敏） |
| gender | string | 性别 |
| province | string | 省份 |
| city | string | 城市 |
| district | string | 区县 |
| area | string | 区域 |
| address | string | 地址（脱敏） |
| maritalStatus | string | 婚姻状况 |
| backupMobile | string | 备用手机号 |
| familyNameInLaw | string | 岳家姓 |
| childrenNum | number \| null | 子女数量 |
| education | string | 教育程度 |
| email | string | 邮箱 |
| customerSysTag | string \| null | 客户系统标签 |
| newProvince | string \| null | 新省份 |
| newCity | string \| null | 新城市 |
| newDistrict | string \| null | 新区县 |
| newArea | string \| null | 新区域 |
| lastLoginTime | string | 最后登录时间 |
| channel1 | string | 渠道1 |
| channel2 | string | 渠道2 |
| facebookId | string | Facebook ID |
| credentialType | string | 证件类型 |
| birthday | string | 生日 |
| ktpOcrAddress | string | KTP OCR 地址（脱敏） |

---

## 返回值

- `Promise<void>`：无返回数据，写入成功则完成；异常由调用方捕获处理。

## 备注

- 在进入 `writeCase` 前，手机号相关字段会通过解密接口替换为明文，`writeCase` 无需再做解密。
- 还款计划获取失败时可能传入空数组，需容错处理。
- 客户信息会在调用 `writeCase` 前获取，获取失败会抛出错误。


