import { getGlobal, setGlobal } from "@utils/store/electron";
import { DoorEntity } from "../dy/entity";
import log from "electron-log";

export interface WebDeviceDTO {
    devicePlatform: string;
    aid: string;
    channel: string;
    source: string;
    updateVersionCode: string;
    pcClientType: string;
    versionCode: string;
    versionName: string;
    cookieEnabled: string;
    screenWidth: string;
    screenHeight: string;
    browserLanguage: string;
    browserPlatform: string;
    browserName: string;
    browserVersion: string;
    browserOnline: string;
    engineName: string;
    engineVersion: string;
    osName: string;
    osVersion: string;
    cpuCoreNum: string;
    deviceMemory: string;
    platform: string;
    downlink: string;
    effectiveType: string;
    roundTripTime: string;
    webid: string;
    uifid: string;
    verifyFp: string;
    fp: string;
    ttwid: string;
    odinTt: string;
    userAgent: string;
    cookie: string;
    pcLibraDivert: string;
    secChUaMobile: string;
    secChUaPlatform: string;
    secChUa: string;
    secFetchDest: string;
    secFetchMode: string;
    secFetchSite: string;
}


export function buildWebDevice(url : string, headers : any, cookie : string){
    const urlParams = new URLSearchParams(url);
    
    // 下划线转驼峰的辅助函数
    const toCamelCase = (str: string): string => {
        return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    };
    
    //url的参数 参数下划线转驼峰 转化成json 转webDeviceDTO
    const params: { [key: string]: string } = {};
    urlParams.forEach((value, key) => {
        params[toCamelCase(key)] = value;
    });
    const webDevice: WebDeviceDTO = {
        devicePlatform: params.devicePlatform || '',
        aid: params.aid || '',
        channel: params.channel || '',
        source: params.source || '',
        updateVersionCode: params.updateVersionCode || '',
        pcClientType: params.pcClientType || '',
        versionCode: params.versionCode || '',
        versionName: params.versionName || '',
        cookieEnabled: params.cookieEnabled || '',
        screenWidth: params.screenWidth || '',
        screenHeight: params.screenHeight || '',
        browserLanguage: params.browserLanguage || '',
        browserPlatform: params.browserPlatform || '',
        browserName: params.browserName || '',
        browserVersion: params.browserVersion || '',
        browserOnline: params.browserOnline || '',
        engineName: params.engineName || '',
        engineVersion: params.engineVersion || '',
        osName: params.osName || '',
        osVersion: params.osVersion || '',
        cpuCoreNum: params.cpuCoreNum || '',
        deviceMemory: params.deviceMemory || '',
        platform: params.platform || '',
        downlink: params.downlink || '',
        effectiveType: params.effectiveType || '',
        roundTripTime: params.roundTripTime || '',
        webid: params.webid || '',
        uifid: params.uifid || '',
        verifyFp: params.verifyFp || '',
        fp: params.fp || '',
        ttwid: params.ttwid || '',
        odinTt: params.odinTt || '',
        userAgent: headers['user-agent'] || '',
        secChUa: headers['sec-ch-ua'] || '',
        secChUaMobile: headers['sec-ch-ua-mobile'] || '',
        secChUaPlatform: headers['sec-ch-ua-platform'] || '',
        secFetchDest: headers['sec-fetch-dest'] || '',
        secFetchMode: headers['sec-fetch-mode'] || '',
        secFetchSite: headers['sec-fetch-site'] || '',
        cookie: cookie,
        pcLibraDivert: params.pcLibraDivert || ''
    };
    return webDevice;
}

import fs from 'fs';
import { machineId } from 'node-machine-id';

export function buildCKData(sessionPath: string){
    //读取sessionPath的文件
    if(!fs.existsSync(sessionPath)){
        return "";
    }
    const ckData = fs.readFileSync(sessionPath, 'utf-8');
    if (ckData && ckData.length > 0){
        return ckData;
    }
    return "";
}


export async function getSoftDeviceId(){ 
    const key = "soft_device_id";
    const softDeviceId = getGlobal(key);
    if(softDeviceId){
        return softDeviceId;
    }
    //获取机器码
    const machineCode = await machineId();
    setGlobal(key, machineCode);
    return machineCode;
}

export async function getSessionIdAndToken(headers : { [key: string]: string; }){
    const cookie = headers["cookie"];
    if(!cookie){
        return null;
    }
    const cookieArray = cookie.split(";");
    const sessionIdStr = cookieArray.find(item => item.includes("sessionid"));
    const sessionId = sessionIdStr?.split("=")[1];
    return { sessionId, cookie };
}
