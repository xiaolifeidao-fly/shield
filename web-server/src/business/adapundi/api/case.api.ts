import { adapundiInstance } from "./adapundi.axios";
import { Case, CasePageParams, CasePageResponse, CaseDetail } from "../../common/entities";
import { getLoanDetail } from "./loan.api";

/**
 * 导出公共实体类型（保持向后兼容）
 */
export type { Case, CasePageParams, CasePageResponse, CaseDetail };

/**
 * 获取案例分页列表
 * @param params 查询参数
 * @returns 分页响应数据
 */
export async function getCasePage(params: CasePageParams = {}): Promise<CasePageResponse> {
  const { pageNum = 1, pageSize = 20, ...restParams } = params;
  const response = await adapundiInstance.get("/hive-collection-admin/cases/page", {
    params: {
      pageNum,
      pageSize,
      ...restParams,
    },
  });
  return response as unknown as CasePageResponse;
}

/**
 * 获取案件详情
 * @param product 产品类型，如 "AP"
 * @param id 案件ID
 * @returns 案件详情数据
 */
export async function getCaseDetail(product: string, id: number, customerId: number): Promise<CaseDetail> {
  const response = await adapundiInstance.get(
    `/hive-collection-admin/cases/${product}/${id}/detail`
  );
  const caseDetail = response as unknown as CaseDetail;
  if(caseDetail){
    const loanDetail = await getLoanDetail(customerId);
    if(loanDetail){
      caseDetail.loanAmount = loanDetail.amount;
    }
  }
  return caseDetail;
}
