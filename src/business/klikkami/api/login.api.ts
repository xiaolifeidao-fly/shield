import axios from 'axios';
import { UserInfo } from '@model/user.types';

export interface KlikKamiLoginResponse {
  token: string;
  setCookie?: string;
}

export async function login(userInfo: UserInfo): Promise<KlikKamiLoginResponse> {
  const { username, password } = userInfo;
  if (!username || !password) {
    throw new Error('用户名或密码不能为空');
  }

  const response = await axios.post(
    'https://www.klikkamicorp.id/indonesia_admin/user/login',
    { email: username, password },
    { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
  );

  const data = response.data as { success: boolean; ret?: { token?: string } };
  const token = data?.ret?.token;
  const setCookieHeader = response.headers?.['set-cookie'];
  const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader;

  const result: KlikKamiLoginResponse = {
    token: token || '',
    setCookie: setCookie || undefined,
  };

  if (!result.token) {
    throw new Error('登录失败: 未获取到 token');
  }
  return result;
}
