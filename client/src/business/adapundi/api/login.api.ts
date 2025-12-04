import { authCenterInstance } from "./adapundi.axios";
import { UserInfo } from "@model/user.types";

/**
 * 登录响应接口
 */
export interface LoginResponse {
  accessToken: string;
}

/**
 * 用户登录接口
 * @param userInfo 用户信息
 * @returns 登录响应（包含 accessToken）
 */
export async function login(userInfo: UserInfo, product : string): Promise<LoginResponse> {
  const response = await authCenterInstance.post(
    "/ac/user/login",
    {
        phone: userInfo.username,
        password: userInfo.password,
        product : product
    }
  );
  return response as unknown as LoginResponse;
}

