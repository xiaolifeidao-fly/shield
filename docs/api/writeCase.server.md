## 接口名称

- writeCase（服务端）

## 接口描述

- 接收单个案件详情 `caseDetail`、还款计划 `loanPlan` 和客户信息 `customerInfo`，在服务端完成存储/落库（或转发到目标系统）。
- 注意：进入本接口前，前端已将手机号类字段解密为明文，服务端无需再次解密，但需做好敏感信息保护与审计。

## 请求

- 方法: `POST`
- 路径: `/api/case/write`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`（建议）
  - 可选安全头：`X-Request-Id`、`X-Signature`（如启用签名校验）

### 请求体

```json
{
  "loanSource":"adapundi",
  "caseDetail": { /* CaseDetail 对象，手机号字段为明文 */ },
  "loanPlan": [ /* LoanPlan[]，可为空数组 */ ],
  "customerInfo": { /* CustomerInfo 对象 */ }
}
```

#### CaseDetail 字段

- 字段与说明：

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

#### LoanPlan 字段

- 字段与说明：

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

#### CustomerInfo 字段

- 字段与说明：

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

## 响应

- 成功: `200 OK`

```json
{
  "success": true,
  "data": {
    "caseId": "string",
    "storedAt": "2025-10-30T12:00:00.000Z",
    "version": "string"
  }
}
```

- 失败（示例）

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "mobile is required",
    "details": [
      { "field": "caseDetail.mobile", "issue": "required" }
    ]
  }
}
```


### 请求示例


```http
POST /api/case/write HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "loanSource":"adapundi",
  "caseDetail": {
    "id": 65064959,
    "caseId": "1075801351789862912",
    "trigger": "M4_1001",
    "level": "F",
    "fullName": "APIP SAEPULOH",
    "mobile": "13800138000",
    "customerId": 19170420,
    "overdueDay": 183,
    "reviewerId": 122583,
    "reviewerName": "KAT-Q5-005",
    "customerTag": null,
    "riskGrade": "P7",
    "clearedNumber": 14,
    "tags": "",
    "channel1": "Organic",
    "channel2": "Organic",
    "gender": "MALE",
    "dueDate": "2025-04-29T16:59:59.999+00:00",
    "loanTag": "WHATSAPP_LOGIN,E_SIGN,CUT_OFF",
    "postLoanPreReminderLevel": "PRE_3",
    "overdueInstitutionLevel": "L1",
    "isMinPay": null,
    "isInstallmentPay": null,
    "minPayBillId": null,
    "installmentBillId": null,
    "customerClikInfo": null,
    "vaList": null,
    "tadpoleCount": "0",
    "tadpoleAmount": "0",
    "riskScoreAndLevel": "523/C4",
    "amount": 9688085.00000000,
    "principleAmount": 4139664.00000000,
    "interestAmount": 1822417.00000000,
    "punishmentAmount": 3501990.00000000,
    "vatAmount": 224014.00000000,
    "distributedDay": 28,
    "expireAmount": 9688085.00000000,
    "expirePrincipleAmount": 4139664.00000000,
    "expireInterestAmount": 1822417.00000000,
    "expirePunishmentAmount": 3501990.00000000,
    "expireVatAmount": 224014.00000000,
    "backupMobile": "13900139000",
    "createTime": "2025-09-30T17:31:09.746+00:00"
  },
  
  "loanPlan": [
    {
      "id": 77564535,
      "loanType": "RE_PAYDAY",
      "status": "OVERDUE",
      "loanSubType": "INSTALLMENT",
      "amount": 1711000.00000000,
      "interestRate": 0.00300000,
      "duration": "30D*6",
      "period": 30,
      "periodsNumber": 6,
      "periodUnit": "D",
      "dueAmount": null,
      "minDueDate": "2025-04-29T16:59:59.999+00:00",
      "overdueDays": 183,
      "gracePeriodRate": 0.00600000,
      "collectionLevel": null,
      "principalAmount": 570332.00000000,
      "interestAmount": 250980.00000000,
      "defaultAmount": 600393.00000000,
      "vatAmount": 31037.00000000,
      "shouldRepaymentAmount": 1452742.00000000,
      "creditQuality": "Macet",
      "platform": "CD_RISK",
      "rolloverType": null,
      "esignFlag": false
    },
    {
      "id": 80119795,
      "loanType": "RE_PAYDAY",
      "status": "OVERDUE",
      "loanSubType": "INSTALLMENT",
      "amount": 2140667.00000000,
      "interestRate": 0.00300000,
      "duration": "30D*6",
      "period": 30,
      "periodsNumber": 6,
      "periodUnit": "D",
      "dueAmount": null,
      "minDueDate": "2025-04-30T16:59:59.999+00:00",
      "overdueDays": 182,
      "gracePeriodRate": 0.00600000,
      "collectionLevel": null,
      "principalAmount": 1070333.00000000,
      "interestAmount": 470979.00000000,
      "defaultAmount": 1072322.00000000,
      "vatAmount": 57868.00000000,
      "shouldRepaymentAmount": 2671502.00000000,
      "creditQuality": "Macet",
      "platform": "CD_RISK",
      "rolloverType": null,
      "esignFlag": false
    },
    {
      "id": 85078364,
      "loanType": "RE_PAYDAY",
      "status": "OVERDUE",
      "loanSubType": "INSTALLMENT",
      "amount": 1666000.00000000,
      "interestRate": 0.00300000,
      "duration": "30D*6",
      "period": 30,
      "periodsNumber": 6,
      "periodUnit": "D",
      "dueAmount": null,
      "minDueDate": "2025-05-24T16:59:59.999+00:00",
      "overdueDays": 158,
      "gracePeriodRate": 0.00300000,
      "collectionLevel": null,
      "principalAmount": 1110666.00000000,
      "interestAmount": 489092.00000000,
      "defaultAmount": 902746.00000000,
      "vatAmount": 60048.00000000,
      "shouldRepaymentAmount": 2562552.00000000,
      "creditQuality": "Macet",
      "platform": "CD_RISK",
      "rolloverType": null,
      "esignFlag": false
    },
    {
      "id": 85655679,
      "loanType": "RE_PAYDAY",
      "status": "OVERDUE",
      "loanSubType": "INSTALLMENT",
      "amount": 1666000.00000000,
      "interestRate": 0.00300000,
      "duration": "30D*6",
      "period": 30,
      "periodsNumber": 6,
      "periodUnit": "D",
      "dueAmount": null,
      "minDueDate": "2025-04-30T16:59:59.999+00:00",
      "overdueDays": 182,
      "gracePeriodRate": 0.00300000,
      "collectionLevel": null,
      "principalAmount": 1388333.00000000,
      "interestAmount": 611366.00000000,
      "defaultAmount": 926529.00000000,
      "vatAmount": 75061.00000000,
      "shouldRepaymentAmount": 3001289.00000000,
      "creditQuality": "Macet",
      "platform": "CD_RISK",
      "rolloverType": null,
      "esignFlag": false
    }
  ],
  "customerInfo": {
    "fullName": "APIP SAEPULOH",
    "customerId": 19170420,
    "mobile": "138****8000",
    "credentialNo": "320123****1234",
    "gender": "MALE",
    "province": "Jawa Barat",
    "city": "Bandung",
    "district": "Cimahi",
    "area": "Cimahi Utara",
    "address": "Jl. Example No. 123",
    "maritalStatus": "MARRIED",
    "backupMobile": "139****9000",
    "familyNameInLaw": "SAEPULOH",
    "childrenNum": 2,
    "education": "HIGH_SCHOOL",
    "email": "example@email.com",
    "customerSysTag": "VIP",
    "newProvince": null,
    "newCity": null,
    "newDistrict": null,
    "newArea": null,
    "lastLoginTime": "2025-10-29T12:00:00.000Z",
    "channel1": "Organic",
    "channel2": "Organic",
    "facebookId": "1234567890",
    "credentialType": "KTP",
    "birthday": "1990-01-01",
    "ktpOcrAddress": "Jl. Example No. 123, Bandung"
  }
}
```

