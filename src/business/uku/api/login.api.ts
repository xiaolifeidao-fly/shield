import { UserInfo } from '@model/user.types';
import { getPage } from '../../common/engine.manager';
import { Page } from 'playwright-core';
import log from '@src/utils/logger';

export interface LoginResponse {
  success: boolean;
  message?: string;
  cookie?: string;
}

async function fillFirst(page: Page, selectors: string[], value: string): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count().catch(() => 0)) {
      await locator.fill(value).catch(() => undefined);
      const currentValue = await locator.inputValue().catch(() => '');
      if (currentValue === value) {
        return true;
      }
    }
  }
  return false;
}

async function fillLoginForm(page: Page, username: string, password: string): Promise<void> {
  const usernameFilled = await fillFirst(page, [
    'input[name="username"]',
    'input[name="userName"]',
    'input[name="account"]',
    'input[name="loginName"]',
    'input[id*="user" i]',
    'input[placeholder*="username" i]',
    'input[placeholder*="user" i]',
    'input[placeholder*="account" i]',
    'input[placeholder*="nama" i]',
    'input[type="text"]',
  ], username);

  const passwordFilled = await fillFirst(page, [
    'input[name="password"]',
    'input[name="pwd"]',
    'input[id*="password" i]',
    'input[placeholder*="password" i]',
    'input[placeholder*="kata sandi" i]',
    'input[type="password"]',
  ], password);

  log.info(`[UKU] login form autofill username=${usernameFilled} password=${passwordFilled}`);
}

export async function login(userInfo: UserInfo): Promise<LoginResponse> {
  const { username, password } = userInfo;
  if (!username || !password) {
    return {
      success: false,
      message: '用户名或密码不能为空',
    };
  }

  const resourceId = `${username}_${userInfo.businessType || 'uku'}`;
  const loginUrl = 'https://collection.ukuindo.com/login';

  let page: Page | undefined;
  try {
    page = await getPage(resourceId, loginUrl) as unknown as Page;
    if (!page) {
      throw new Error('无法初始化登录页面');
    }

    log.info(`[UKU] login page opened: ${page.url()}`);
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
      log.warn('[UKU] login page network idle timeout, continue waiting for manual login');
    });

    await fillLoginForm(page, username, password);

    log.info(`[UKU] waiting manual login for ${username}`);
    await page.waitForURL(
      (url) => !url.href.includes('/login'),
      { timeout: 300000 }
    );
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    log.info(`[UKU] current URL after login: ${currentUrl}`);
    if (currentUrl.includes('/login')) {
      return {
        success: false,
        message: `登录失败: 当前仍在登录页 ${currentUrl}`,
      };
    }

    const cookies = await page.context().cookies('https://collection.ukuindo.com');
    const cookieString = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
    if (!cookieString) {
      return {
        success: false,
        message: '登录成功后未获取到 Cookie',
      };
    }

    return {
      success: true,
      message: '登录成功',
      cookie: cookieString,
    };
  } catch (error) {
    log.error('[UKU] login failed:', error);
    return {
      success: false,
      message: `登录失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
