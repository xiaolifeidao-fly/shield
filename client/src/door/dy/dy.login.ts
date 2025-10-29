import log from "electron-log";
import { app } from "electron";
import path from "path";
import { DoorEntity } from "./entity";
import { DyUser } from "@model/dy.entity";
import { Locator, Page } from "playwright";
import { v4 as uuidv4 } from 'uuid';
import { getEngineLegacy as getEngine } from "./manager";
import { sleep } from "@utils/index";
import { DyEngine } from "./dy.engine";
import { DyLoginMonitor, OneLoginMonitor } from "./monitor/login.monitor";
import { DyLoginSmsMonitor, DyLoginSmsValidateMonitor, SendSmsCodeMonitor } from "./monitor/login.sms.monitor";
import { buildWebDevice, getSessionIdAndToken, WebDeviceDTO } from "../model/dy.web.device";


async function getPage(engine : DyEngine<{}>){
    const page = engine.getPage();
    if(page){
        if(!page.isClosed()){
            log.info("getPage page is not closed");
            return page;
        }
    }
    return await engine.init();
}

export async function openLogin(page : Page){
    setTimeout(async () => {
        log.info("start click");
        let button = await page.locator("#Cn2CzO_Q .bYaAzfVn").first();
        if(button){
            let times = 30;
            while(times > 0){
                const isVisible = await button.isVisible();
                if(isVisible){
                    await button.click();
                    await page.waitForTimeout(1000);
                    const loginPanel = page.locator("#login-panel-new");
                    if(loginPanel && await loginPanel.isVisible()){
                        return;
                    }
                }
                await page.waitForTimeout(1000);
                times--;
            }
        };
    }, 1000);
}



export async function awaitByLoginResult(port : string, headless: boolean = true){
    log.info("awaitByLoginResult port is ", port, " headless is ", headless);
    let engine : DyEngine<{}> = await getEngine(port, headless);
    const page = await getPage(engine);
    try{
        if(!page){
            return;
        }
        const monitor = new DyLoginMonitor();
        monitor.setMonitorTimeout(120000);
        let result = null;
        if(headless){
            result = await engine.openWaitMonitor(page, "https://www.douyin.com/user/self?from_tab_name=main&showTab=like", monitor, {});
        }else{
            result = await engine.openWaitMonitor(page, "https://www.douyin.com/user/self?from_tab_name=main&showTab=like", monitor, {}, openLogin);
        }
        if(!result.getCode()){
            return new DoorEntity<{}>(false, "登录失败");
        }
        const data = result.data;
        if(data.status_code != 0){
            return new DoorEntity<{}>(false, "登录失败");
        }
        const secUid = data.sec_uid;
        const uid = data.uid;
        let nickName = await getNickNameBySelf(page);
        log.info("nickName is ", nickName);
        if(!nickName){
            nickName = "";
        }
        const dyUser = new DyUser(uid, secUid, true, nickName);
        await saveUserState(page);
        const sessionIdAndToken = await getSessionIdAndToken(result.getHeaderData());
        if(sessionIdAndToken){
            dyUser.sessionId = sessionIdAndToken.sessionId;
            dyUser.token = sessionIdAndToken.cookie;
        }
        let webDevice : WebDeviceDTO | null = null;
        if(sessionIdAndToken){
            dyUser.sessionId = sessionIdAndToken.sessionId;
            dyUser.token = sessionIdAndToken.cookie;
            webDevice = buildWebDevice(result.getUrl(), result.getHeaderData(), sessionIdAndToken.cookie);
        }
        await engine.saveContextState();
        log.info("登录成功 ", uid);
        return new DoorEntity<{}>(true, {dyUser, webDevice, sessionPath : engine.getSessionPath()});
    }catch(error){
        log.error("awaitByLoginResult error", error);
        return new DoorEntity<{}>(false, "登录失败");
    }

}


async function saveUserState(page : Page){
    const button = await page.locator(".trust-login-switch-button").first();
    if(button){
        log.info("button is visible");
        let times = 10;
        while(times > 0){
            const isVisible = await button.isVisible();
            const classList = await button.getAttribute("class");
            log.info("button is visible ", isVisible, " classList is ", classList);
            if(isVisible){
                if(classList && classList.includes("uncheck")){
                    log.info("button is visible and classList is ", classList);
                    await button.click();
                    await page.waitForTimeout(3000);
                    log.info("button click");
                    return;
                }
                log.info("button is visible and classList is not uncheck");
                return;
            }
            await page.waitForTimeout(1000);
        }
    }
}

async function checkIsLogin(page : Page){
    const nickName = await getNickName(page);
    if(nickName){
        return true;
    }
    return false;
}

async function getNickName(page : Page){
    let element = await page.locator("#user-name");
    if(element && await element.isVisible()){
        const text = await element.textContent();
        if(text){
            log.info("user name is ", text);
            return text;
        }   
    }
    element = await page.locator("#user_detail_element .GMEdHsXq").first();
    if(element && await element.isVisible()){
        const text = await element.textContent();
        if(text){
            log.info("user name is ", text);
            return text;
        }   
    }
    return null;
}

async function getNickNameBySelf(page : Page){
    const element = await page.locator(".IGPVd8vQ .GMEdHsXq .arnSiSbK").first();
    if(element && await element.isVisible()){
        const text = await element.textContent();
        if(text){
            log.info("user name is ", text);
            return text;
        }   
    }
    return null;
}



async function getElemmentSelector(elemmentSelector : Map<string, Locator>, elementName : string, page : Page){
    if(elemmentSelector.has(elementName)){
        return elemmentSelector.get(elementName);
    }
    const element = await page.locator(elementName).first();
    elemmentSelector.set(elementName, element);
    return element;
}

async function openLoginPageAction(page : Page){
    try{
        await page.waitForTimeout(3000);
        const elemmentSelectorName = ["#share-login-guide img", "#douyin-login-new-id .WxXE_uiP img", "#animate_qrcode_container img"];
        let times = 120;
        let showImgElement = null;
        let isVisible = false;
        const elemmentSelector =  new Map<string, Locator>();
        while(times > 0 && !isVisible){
            for(const selectorName of elemmentSelectorName){
                if(isVisible){
                    continue;
                }
                const element = await getElemmentSelector(elemmentSelector, selectorName, page);
                if(!element){
                    continue;
                }
                isVisible = await getLoginElementVisible(page, element);
                log.info(selectorName, " isVisible is ", isVisible);
                if(!isVisible){
                    isVisible = await getLoginElementVisible(page, element);
                    const isLogin = await checkIsLogin(page);
                    if(isLogin){
                        return new DoorEntity<{}>(true);
                    }
                    continue;
                }
                log.info("showImgElement is ", selectorName);
                showImgElement = element;
            }
            await page.waitForTimeout(1000);
            times--;
        }
        if(showImgElement){
            let src = null;
            if(isVisible){
                src = await showImgElement.getAttribute("src");
            }
            if(!src){
                log.error("src is null");
                return new DoorEntity<{}>(false, "获取二维码失败");
            }
            return new DoorEntity<{qrCode: string}>(true, {qrCode: src});
        }
    }catch(error){
        log.error("openLoginPageAction error", error);
    }
    const isLogin = await checkIsLogin(page);
    log.info("isLogin is ", isLogin);
    if(isLogin){
        return new DoorEntity<{}>(true);
    }
    return new DoorEntity<{}>(false,undefined);
}

async function getLoginElementVisible(page : Page, element : Locator | null){
    if(!element){
        return false;
    }
    const isVisible = await element.isVisible();
    if(isVisible){
        return true;
    }
    return false;
}


const engineMap : Map<string, DyEngine<{}>> = new Map();


export async function openUserInfo(port : string){
    const engine = new DyEngine<{}>(port, false);
    const page = await engine.init("https://www.douyin.com/user/self?from_tab_name=main&showTab=like");
    if(!page){
        return;
    }
}

async function checkAndOneLogin(engine : DyEngine<{}>, page : Page){
    const isLogin = await checkIsLogin(page);
    if(isLogin){
        log.info("checkAndOneLogin isLogin is true by nickname");
        return true;
    }
    const loginButtonExist = await checkLoginButtonExist(page);
    if(loginButtonExist){
        log.info("checkAndOneLogin isLogin is true by loginButtonExist");
        const hadLogin = await retryOneLogin(engine, page);
        if(hadLogin){
            log.info("checkAndOneLogin isLogin is true by retryOneLogin");
            return true;
        }
    }
    return false;
}

async function clickLoginButton(page : Page, clickButton : Locator){
    await page.waitForTimeout(2000);
    await clickButton.click();
}

async function retryOneLogin(engine : DyEngine<{}>, page : Page){
    const oneLoginButton = page.locator("#douyin-login-new-id .VWgr3GWj").first();
    if(oneLoginButton){
        log.info("oneLoginButton is found");
        let num = 5;
        let loginButtonVisible = await oneLoginButton.isVisible();
        while(num > 0 && !loginButtonVisible){
            await page.waitForTimeout(1000);
            loginButtonVisible = await oneLoginButton.isVisible();
            log.info("oneLoginButton is ", loginButtonVisible);
            num--;
        }
        if(loginButtonVisible){
            const text = await oneLoginButton.textContent();
            if(text && text.includes("一键登录")){
                log.info("one loginButton click start");
                const monitor = new OneLoginMonitor();
                const result = await engine.openWaitMonitor(page, undefined, monitor, {}, clickLoginButton, oneLoginButton);
                if(result.getCode()){
                    await engine.saveContextState();
                    await page.waitForTimeout(2000);
                    log.info("one login success");
                    return true;
                }
                log.info("one login not support");
                return false;
            }
            return false;
        }
    }
    return false;

}


async function checkLoginButtonExist(page : Page){
    try{
        const loginButton = await page.waitForSelector("#RkbQLUok button", {state: "visible", timeout: 5000});
        if(loginButton){
            if(await loginButton.isVisible()){
                log.info("checkLoginButtonExist start click");
                await loginButton.click();
                await page.waitForTimeout(1000);
                log.info("checkLoginButtonExist end click");
                return true;
            }
        }
        return false;
    }catch(error){
        return false;
    }
}

export async function awaitByLoginResultByQR(port : string){
    const engine = await getEngine(port);
    let page = await getPage(engine);
    if(!page){
        page = await engine.init("https://www.douyin.com/user/self?from_tab_name=main&showTab=like");
    }else{
        await page.goto("https://www.douyin.com/user/self?from_tab_name=main&showTab=like");
    }
    try{
        if(!page){
            return;
        }
        const hadLogin = await checkAndOneLogin(engine, page);
        if(hadLogin){
            log.info("awaitByLoginResultByQR hadLogin is true");
            return new DoorEntity<{}>(true, "登录成功");
        }
        const monitor = new DyLoginMonitor();
        monitor.setMonitorTimeout(120000);
        const result = await openLoginPageAction(page) as DoorEntity<{qrCodeFilePath: string, fileUrl: string, qrCode: string}>;
        if(!result.getCode()){
            return result;
        }
        const qrCode = result.data.qrCode;
        if(qrCode){
            return new DoorEntity<{qrCode: string}>(true, {qrCode: qrCode});
        }
        return new DoorEntity<{}>(true, "登录成功");
    }catch(error){
        log.error("awaitByLoginResult error", error);
        return new DoorEntity<{}>(false, "获取二维码失败");
    }

}

export async function checkAgainValidate(port : string){
    const engine = await getEngine(port);
    if(!engine){
        return new DoorEntity<{}>(false, "检测失败");
    }
    const page = engine.getPage();
    if(!page){
        return new DoorEntity<{}>(false, "检测失败");
    }
    await page.waitForTimeout(2000);
    const element = await page.locator("#uc-second-verify .vxBq1Jp1n2QfyF17sA9K").first();
    if(element){
        let isVisible = await element.isVisible();
        let times = 200;
        log.info("validate button isVisible is ", isVisible);
        while(!isVisible && times > 0){
            await page.waitForTimeout(1000);
            isVisible = await element.isVisible();
            const isLogin = await checkIsLogin(page);
            if(isLogin){
                await engine.saveContextState();
                return new DoorEntity<{}>(true, {isLogin: true, needSmsCode: false});
            }
            log.info("validate button isVisible is ", isVisible);
            times--;
        }
        if(isVisible){
            log.info("validate button start click");
            await element.click();
            log.info("validate button end click");
            return new DoorEntity<{}>(true, {isLogin: false, needSmsCode: true});
        }
    }
    const isLogin = await checkIsLogin(page);
    if(isLogin){
        return new DoorEntity<{}>(true, {isLogin: true, needSmsCode: false});
    }
    return new DoorEntity<{}>(false, "未知错误");
}

export async function loginBySmsCode(port : string, code : string){
    const engine = await getEngine(port);
    if(!engine){
        return new DoorEntity<{}>(false, "登录失败");
    }
    const page = engine.getPage();
    if(!page){
        return new DoorEntity<{}>(false, "登录失败");
    }
    const monitor = new DyLoginSmsValidateMonitor();
    const result = await engine.openWaitMonitor(page, undefined, monitor, {}, loginBySmsCodeAction, code);
    if(result.getCode()){
        await engine.saveContextState();
        await page.waitForTimeout(2000);
        return new DoorEntity<{}>(true, "登录成功");
    }
    return new DoorEntity<{}>(false, result.data);
}

export async function loginBySmsCodeAction(page : Page, code : string){
    const input = await page.locator("#button-input").first();
    if(input){
        await input.fill(code);
        await page.waitForTimeout(2000);
        const button = await page.locator("#uc-second-verify .qT0K_Szs1Fa804Pg2hhR").first();
        if(button){
            let times = 10;
            let isVisible = await button.isVisible();
            log.info("button is visible ", isVisible);
            while(!isVisible && times > 0){
                log.info("button is visible ", isVisible);
                isVisible = await button.isVisible();
                await page.waitForTimeout(1000);
                times--;
            }
            if(isVisible){
                log.info("button sms login start click"); 
                await button.click();
                log.info("button sms login end click"); 
                return undefined;

            }
        }
        log.info("button is not visible");
    }
    return new DoorEntity<{}>(false, "登录失败");
}

export async function againSendSms(port : string){
    const engine = await getEngine(port);
    if(!engine){
        return new DoorEntity<{}>(false, "发送失败");
    }
    const page = engine.getPage();
    if(!page){
        return new DoorEntity<{}>(false, "发送失败");
    }
    const button = await page.locator(".MPtA2zFhBqMwM58QgANJ").first();
    if(button){
        let times = 10;
        let isVisible = await button.isVisible();
        log.info("button is visible ", isVisible);
        while(!isVisible && times > 0){
            await page.waitForTimeout(1000);
            isVisible = await button.isVisible();
            log.info("button is visible ", isVisible);
            times--;
        }
        if(isVisible){  
            log.info("button sms login start click"); 
            await button.click();
            log.info("button sms login end click"); 
            return new DoorEntity<{}>(true, "发送成功");
        }
        return new DoorEntity<{}>(false, "发送失败");
    }
    return new DoorEntity<{}>(false, "发送失败");
}


export async function smsLoginInit(port : string){
    const engine = await getEngine(port);
    let page = await getPage(engine);
    if(!page){
        page = await engine.init("https://www.douyin.com/user/self?from_tab_name=main&showTab=like");
    }else{
        await page.goto("https://www.douyin.com/user/self?from_tab_name=main&showTab=like");
    }
    if(!page){
        return new DoorEntity<{}>(false, "初始化失败");
    }
    const hadLogin = await checkAndOneLogin(engine, page);
    if(hadLogin){
        return new DoorEntity<{}>(true, "登录成功");
    }
    return new DoorEntity<{}>(false, "加载验证码页面");
}


export async function getValidateCodeByPhone(port : string, phone : string){
    const engine = await getEngine(port);
    if(!engine){
        return new DoorEntity<{}>(false, "获取验证码引擎错误");
    }
    const page = engine.getPage();
    if(!page){
        return new DoorEntity<{}>(false, "获取验证码引擎错误");
    }
    const monitor = new SendSmsCodeMonitor();
    const input = await page.locator(".GmnLSQ7P").first();
    const isInputVisible = await input.isVisible();
    log.info("getValidateCodeByPhone isInputVisible is ", isInputVisible);
    if(isInputVisible){
        await input.fill(phone);
        await page.waitForTimeout(2000);
        const button = await page.locator(".MVPbkVeT").first();
        const isButtonVisible = await button.isVisible();
        log.info("getValidateCodeByPhone isButtonVisible is ", isButtonVisible);
        if(isButtonVisible){
            await button.click();
            const result = await engine.openWaitMonitor(page, undefined, monitor, {});
            if(result.getCode()){
                return new DoorEntity<{}>(true, "发送验证码成功");
            }
            log.error("getValidateCodeByPhone result is ", result.data);
            return new DoorEntity<{}>(false, result.data);
        }
    }
    return new DoorEntity<{}>(false, "发送验证码异常,请重新打开验证码登录");
}

export async function loginByPhone(port : string, code : string){
    const engine = await getEngine(port);
    if(!engine){
        return new DoorEntity<{}>(false, "登录引擎错误");
    }
    const page = engine.getPage();
    if(!page){
        return new DoorEntity<{}>(false, "登录引擎错误");
    }
    const input = await page.locator("#button-input").first();
    if(input && await input.isVisible()){
        await input.fill(code);
        await page.waitForTimeout(2000);
    }else{
        return new DoorEntity<{}>(false, "登录未填充验证码");
    }
    const monitor = new DyLoginSmsMonitor();
    const loginButton = await page.locator(".VWgr3GWj").first();
    const isLoginButtonVisible = await loginButton.isVisible();
    log.info("loginByPhone isLoginButtonVisible is ", isLoginButtonVisible);
    if(isLoginButtonVisible){
        const result = await engine.openWaitMonitor(page, undefined, monitor, {}, loginByPhoneAction, loginButton);
        if(result.code){
            await page.waitForTimeout(2000);
            await engine.saveContextState();
            return new DoorEntity<{}>(true, "登录成功");
        }
        log.error("loginByPhone result is ", result.data);
        return new DoorEntity<{}>(false, result.data);
    }
    return new DoorEntity<{}>(false, "登录失败");
}

export async function loginByPhoneAction(page : Page, loginButton : Locator){
    await page.waitForTimeout(2000);
    await loginButton.click();
}



/**
 * 
 * document.querySelectorAll(".GmnLSQ7P")[0] 手机号
 * #button-input 验证码
 * .MVPbkVeT.V9IjO6Mf 发送验证码按钮
 * document.querySelectorAll(".VWgr3GWj.pMmqGuAl.aPX2jxr8.N3G6ARrS")[0] 登录按钮
 * 
 */