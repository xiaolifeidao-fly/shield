import { LogApi } from "@eleapi/door/log.api";
import { InvokeType, Protocols } from "@eleapi/base";
import log from 'electron-log';
import { CryptoUtil } from "../../utils/crypto.util";
import axios from "axios";
import { getDyUser, isLogin, setDyUser, setDyUserHeadless } from "../../door/dy/store/dy.store";
import { proxyApiRequest } from "../../utils/proxy.util";
import { DyUser } from "@model/dy.entity";
import { againSendSms, awaitByLoginResult, awaitByLoginResultByQR, checkAgainValidate, getValidateCodeByPhone, loginByPhone, loginBySmsCode, openUserInfo, smsLoginInit } from "@src/door/dy/dy.login";
import { buildCKData, getSoftDeviceId, WebDeviceDTO } from "@src/door/model/dy.web.device";
import { requestLog } from "@src/door/model/log.request";

// 定义用户数据接口
interface UserData {
    uid?: string;
    secUid?: string;
    isLogin?: boolean;
    nickName?: string;
    sessionId?: string;
    token?: string;
}

export class LogApiImpl extends LogApi {

    getApiName(): string {
        return "LogApi";
    }

    @InvokeType(Protocols.INVOKE)
    async login(groupCode: string, port: string, headless: boolean = true): Promise<any> {
        try {
            log.info('[LogApi] 开始登录流程，端口:', port);
            
            if (!port) {
                log.error('[LogApi] 登录失败: 端口不能为空');
                return { success: false, message: '端口不能为空' };
            }
            
            // 调用登录方法
            const result = await awaitByLoginResult(port, headless);
        
            if (result && result.code) {
                // 获取用户数据直接从result中
                const userData = result.data as {dyUser: DyUser, webDevice: WebDeviceDTO, sessionPath: string};
                const dyUser = userData.dyUser;
                const webDevice = userData.webDevice;
                const sessionPath = userData.sessionPath;
                
                if (dyUser && (dyUser.uid || dyUser.secUid)) {
                    try {
                        setDyUser(groupCode, port, dyUser);
                        log.info('[LogApi] 设置用户数据, headless is ', headless);
                        setDyUserHeadless(port, headless);
                        // 准备要加密的数据
                        await requestLog(dyUser, webDevice, sessionPath, port);
                    } catch (encryptError: any) {
                        log.error('[LogApi] 加密会话数据失败:', encryptError.message || encryptError);
                        // 加密失败不影响登录流程继续
                    }
                } else {
                    log.warn('[LogApi] 用户数据不完整，跳过会话信息发送');
                }
                
                return { 
                    success: true, 
                    message: '登录成功',
                    data: result.data
                };
            } else {
                const errorMsg = result ? result.data : '未知错误';
                log.error('[LogApi] 登录失败:', errorMsg);
                return { 
                    success: false, 
                    message: errorMsg || '登录失败'
                };
            }
        } catch (error: any) {
            log.error('[LogApi] 登录异常:', error);
            return { 
                success: false, 
                message: error.message || '登录过程发生异常'
            };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async checkLoginStatus(groupCode: string, port: string): Promise<any> {
        try {
            log.info('[LogApi] 检查登录状态，端口:', port);
            
            if (!port) {
                log.error('[LogApi] 检查登录状态失败: 端口不能为空');
                return { success: false, message: '端口不能为空' };
            }
            
            // 获取用户信息
            const userInfo = getDyUser(groupCode, port);
            
            if (isLogin(userInfo)) {
                return { 
                    success: true, 
                    message: '用户已登录',
                    data: {
                        uid: userInfo!.uid,
                        secUid: userInfo!.secUid,
                        nickName: userInfo!.nickName,
                        isLogin: true,
                        isLock: userInfo!.isLock
                    }
                };
            } else {
                log.info('[LogApi] 用户未登录');
                return { 
                    success: false, 
                    message: '用户未登录',
                    data: {
                        isLogin: false
                    }
                };
            }
        } catch (error: any) {
            log.error('[LogApi] 检查登录状态异常:', error);
            return { 
                success: false, 
                message: error.message || '检查登录状态时发生异常',
                data: {
                    isLogin: false
                }
            };
        }
    }

    @InvokeType(Protocols.INVOKE)
    async loginBySmsCode(port: string, code: string): Promise<any> {
        const result = await loginBySmsCode(port, code);
        return result;
    }

    @InvokeType(Protocols.INVOKE)
    async checkAgainValidate(port: string): Promise<any> {
        const result = await checkAgainValidate(port);
        return result;
    }

    @InvokeType(Protocols.INVOKE)
    async awaitByLoginResultByQR(port: string): Promise<any> {
        const result = await awaitByLoginResultByQR(port);
        return result;
    }

    @InvokeType(Protocols.INVOKE)
    async openUserInfo(port: string): Promise<any> {
        return await openUserInfo(port);
    }

    @InvokeType(Protocols.INVOKE)
    async againSendSms(port: string): Promise<any> {
        const result = await againSendSms(port);
        return result;
    }

    @InvokeType(Protocols.INVOKE)
    async smsLoginInit(port: string): Promise<any> {
        const result = await smsLoginInit(port);
        return result;
    }

    @InvokeType(Protocols.INVOKE)
    async getValidateCodeByPhone(port: string, phone: string): Promise<any> {
        const result = await getValidateCodeByPhone(port, phone);
        return result;
    }

    @InvokeType(Protocols.INVOKE)
    async loginByPhone(port: string, code: string): Promise<any> {
        const result = await loginByPhone(port, code);
        return result;
    }


}   