import { katInstance } from "./kat.axios";
import { UserInfo } from "@model/user.types";
import log from "../../../utils/logger";

/**
 * 登录响应接口
 */
export interface LoginResponse {
  jwt: string;
}

/**
 * 用户登录接口
 * @param userInfo 用户信息
 * @returns 登录响应（包含 jwt）
 */
export async function login(userInfo: UserInfo): Promise<LoginResponse> {
  const headers = {
    'Tenant' : 'PAID',
    'Origin' : 'http://collection.pendanaan.com',
    'Referer' : 'http://collection.pendanaan.com/'
  }
  const response = await katInstance.post(
    "/api/login",
    {
      user_name: userInfo.username,
      password: userInfo.password,
    },
    {
      headers: headers
    }
  );
  log.info('login response', response.data);
  return response.data as LoginResponse;
}

