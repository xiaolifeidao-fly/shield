import { katInstance } from "./kat.axios";
import { UserInfo } from "@model/user.types";

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
  const response = await katInstance.post(
    "/api/login",
    {
      user_name: userInfo.username,
      password: userInfo.password,
    }
  );
  return response.data as LoginResponse;
}

