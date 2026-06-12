import { UserInfo } from '@model/user.types';
import { getPage } from '../../common/engine.manager';
import { Page } from 'playwright-core';
import log from '@src/utils/logger';
import { recognizeCaptcha } from '@src/common/utils/captcha';
import fs from 'fs';
import path from 'path';
import os from 'os';

declare const document: any;

export interface LoginResponse {
  success: boolean;
  message?: string;
  cookie?: string;
}

const MAX_CAPTCHA_RETRIES = 10;
const CAPTCHA_RETENTION_DAYS = 3;

/**
 * 获取验证码图片存储根目录: ~/.config/shield/captcha/
 */
function getCaptchaBaseDir(): string {
  return path.join(os.homedir(), '.config', 'shield', 'captcha');
}

/**
 * 获取指定用户、指定日期的验证码存储目录
 * @returns 完整目录路径，如 ~/.config/shield/captcha/username/2026-06-12/
 */
function getCaptchaDir(username: string, dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  const dir = path.join(getCaptchaBaseDir(), username, dateStr);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * 清理超过 N 天的验证码图片目录
 */
function cleanOldCaptchaImages(username: string): void {
  try {
    const userDir = path.join(getCaptchaBaseDir(), username);
    if (!fs.existsSync(userDir)) return;

    const now = Date.now();
    const maxAge = CAPTCHA_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    const entries = fs.readdirSync(userDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // 目录名格式: YYYY-MM-DD
      const dirDate = new Date(entry.name);
      if (isNaN(dirDate.getTime())) continue;
      if (now - dirDate.getTime() > maxAge) {
        const dirToRemove = path.join(userDir, entry.name);
        fs.rmSync(dirToRemove, { recursive: true, force: true });
        log.info(`[UKU] cleaned old captcha dir: ${dirToRemove}`);
      }
    }
  } catch (err) {
    log.warn('[UKU] clean old captcha images failed:', err);
  }
}

/**
 * 从 Playwright 页面下载验证码图片并保存到本地
 * @returns 保存的文件路径
 */
async function downloadCaptchaImage(page: Page, username: string): Promise<string> {
  const captchaDir = getCaptchaDir(username);
  const timestamp = Date.now();
  const filePath = path.join(captchaDir, `captcha_${timestamp}.png`);

  // 方式1: 截图验证码元素（最可靠，捕获的是浏览器渲染后的实际图像）
  const captchaImg = page.locator('#imgCode').first();
  const buffer = await captchaImg.screenshot({ type: 'png' });
  fs.writeFileSync(filePath, buffer);

  log.info(`[UKU] captcha image saved: ${filePath}`);
  return filePath;
}

/**
 * 刷新验证码图片（点击验证码图片或重新请求 /captcha）
 */
async function refreshCaptcha(page: Page): Promise<void> {
  // 点击验证码图片触发刷新
  const captchaImg = page.locator('#imgCode').first();
  if (await captchaImg.count()) {
    await captchaImg.click();
    // 等待新验证码图片加载
    await page.waitForTimeout(1000);
  } else {
    // 备选: 直接通过 JS 修改 src 触发刷新
    await page.evaluate(() => {
      const img = document.getElementById('imgCode');
      if (img) {
        img.src = '/captcha?' + Date.now();
      }
    });
    await page.waitForTimeout(1000);
  }
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

/**
 * 填写验证码字段
 */
async function fillCaptcha(page: Page, captchaText: string): Promise<boolean> {
  return fillFirst(page, [
    'input[name="captcha"]',
    'input[name="captchaCode"]',
    'input[name="verifyCode"]',
    'input[name="code"]',
    'input[placeholder*="验证码" i]',
    'input[placeholder*="captcha" i]',
    'input[placeholder*="verification" i]',
    'input[placeholder*="code" i]',
  ], captchaText);
}

/**
 * 点击登录按钮
 */
async function clickLoginButton(page: Page): Promise<void> {
  const loginBtn = page.locator('#loginBtn').first();
  if (await loginBtn.count()) {
    await loginBtn.click();
    return;
  }
  // 备选选择器
  const fallbackBtn = page.locator('button[lay-filter="login-submit"], button.layui-btn[type="button"]').first();
  if (await fallbackBtn.count()) {
    await fallbackBtn.click();
    return;
  }
  // 最后备选: 提交表单
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) form.submit();
  });
}

/**
 * 检测是否登录成功（URL 不再包含 /login）
 */
async function checkLoginSuccess(page: Page, timeout: number = 5000): Promise<boolean> {
  try {
    await page.waitForURL(
      (url) => !url.href.includes('/login'),
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
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
      log.warn('[UKU] login page network idle timeout, proceeding anyway');
    });

    // 清理过期的验证码图片
    cleanOldCaptchaImages(username);

    // 填写用户名和密码（只需填写一次）
    await fillLoginForm(page, username, password);

    // 验证码识别重试循环
    let lastError = '';
    for (let attempt = 1; attempt <= MAX_CAPTCHA_RETRIES; attempt++) {
      log.info(`[UKU] captcha attempt ${attempt}/${MAX_CAPTCHA_RETRIES} for ${username}`);

      try {
        // 1. 下载验证码图片
        const imagePath = await downloadCaptchaImage(page, username);

        // 2. 识别验证码
        const captchaText = await recognizeCaptcha(imagePath);
        log.info(`[UKU] captcha recognized: "${captchaText}" (attempt ${attempt})`);

        if (!captchaText || captchaText.length === 0) {
          lastError = '验证码识别结果为空';
          log.warn(`[UKU] ${lastError}, retrying...`);
          await refreshCaptcha(page);
          continue;
        }

        // 3. 清空并填写验证码
        // 先清空验证码输入框（防止之前残留的值）
        await page.locator('input[name="captcha"]').first().fill('');
        const filled = await fillCaptcha(page, captchaText);
        if (!filled) {
          lastError = '无法填写验证码字段';
          log.warn(`[UKU] ${lastError}`);
          break;
        }

        // 4. 确保用户名和密码仍然有值（某些页面刷新可能清空表单）
        await fillLoginForm(page, username, password);

        // 5. 点击登录按钮
        await clickLoginButton(page);

        // 6. 等待并检查登录结果
        await page.waitForTimeout(2000);
        const success = await checkLoginSuccess(page, 5000);

        if (success) {
          log.info(`[UKU] login successful for ${username} after ${attempt} attempt(s)`);

          // 提取 cookies
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
            message: `登录成功（验证码第${attempt}次识别成功）`,
            cookie: cookieString,
          };
        }

        // 登录失败，检查是否仍在登录页
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
          // 可能是验证码错误，刷新验证码重试
          lastError = `验证码可能错误，当前URL: ${currentUrl}`;
          log.warn(`[UKU] ${lastError}, refreshing captcha...`);
          await refreshCaptcha(page);
          // 等待新验证码加载
          await page.waitForTimeout(500);
          continue;
        }

        // 不在登录页但也不是成功的情况
        lastError = `登录后跳转到未知页面: ${currentUrl}`;
        log.warn(`[UKU] ${lastError}`);
        break;

      } catch (attemptError) {
        lastError = `第${attempt}次尝试出错: ${attemptError instanceof Error ? attemptError.message : String(attemptError)}`;
        log.error(`[UKU] ${lastError}`);
        // 出错时尝试刷新验证码继续
        try {
          await refreshCaptcha(page);
        } catch {
          // 刷新失败也继续
        }
      }
    }

    return {
      success: false,
      message: `验证码识别失败，已重试${MAX_CAPTCHA_RETRIES}次。最后错误: ${lastError}`,
    };
  } catch (error) {
    log.error('[UKU] login failed:', error);
    return {
      success: false,
      message: `登录失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
