import path from 'path';
import fs from 'fs'
import { Browser, chromium, devices,firefox, BrowserContext, Page, Route ,Request, Response} from 'playwright';
import {  getGlobal, removeGlobal, setGlobal } from '@utils/store/electron';
import { app, screen as electronScreen } from 'electron';
import { DoorEntity } from './entity';
import log from 'electron-log';
import os from 'os';
import { env } from 'process';
import { Monitor, MonitorChain, MonitorRequest, MonitorResponse } from './monitor/monitor';

declare const window: any;
declare const navigator: any;
declare const document: any;
declare const screen: any;
declare const WebGLRenderingContext: any;
declare const HTMLCanvasElement: any;
declare const Element: any;
declare const WebGL2RenderingContext: any;
declare const MimeType: any;
declare const performance: any;
const browserMap = new Map<string, Browser>();

const contextMap = new Map<string, BrowserContext>();


// 获取系统真实的Chrome浏览器路径
function getSystemChromePath(): string {
    const platform = os.platform();
    
    console.log(`检测操作系统: ${platform}`);
    
    switch (platform) {
        case 'darwin': // macOS
            const macPaths = [
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
                '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
                '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
            ];
            
            console.log('检测macOS Chrome路径...');
            for (const chromePath of macPaths) {
                console.log(`检查路径: ${chromePath}`);
                if (fs.existsSync(chromePath)) {
                    console.log(`✅ 找到Chrome: ${chromePath}`);
                    return chromePath;
                }
            }
            break;
        
        case 'win32': // Windows
            const winPaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
                path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome Beta\\Application\\chrome.exe'),
                path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome Dev\\Application\\chrome.exe'),
                path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome SxS\\Application\\chrome.exe'), // Canary
                'C:\\Program Files\\Google\\Chrome Beta\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome Beta\\Application\\chrome.exe'
            ];
            
            console.log('检测Windows Chrome路径...');
            for (const chromePath of winPaths) {
                console.log(`检查路径: ${chromePath}`);
                if (fs.existsSync(chromePath)) {
                    console.log(`✅ 找到Chrome: ${chromePath}`);
                    return chromePath;
                }
            }
            break;
        
        case 'linux': // Linux
            const linuxPaths = [
                '/usr/bin/google-chrome',
                '/usr/bin/google-chrome-stable',
                '/usr/bin/google-chrome-beta',
                '/usr/bin/google-chrome-unstable',
                '/usr/bin/chromium-browser',
                '/usr/bin/chromium',
                '/snap/bin/chromium',
                '/var/lib/snapd/snap/bin/chromium',
                '/usr/local/bin/google-chrome'
            ];
            
            console.log('检测Linux Chrome路径...');
            for (const chromePath of linuxPaths) {
                console.log(`检查路径: ${chromePath}`);
                if (fs.existsSync(chromePath)) {
                    console.log(`✅ 找到Chrome: ${chromePath}`);
                    return chromePath;
                }
            }
            break;
        
        default:
            throw new Error(`不支持的操作系统: ${platform}`);
    }
    
    // 如果都没找到，抛出错误
    throw new Error(`未找到系统安装的Chrome浏览器，请检查Chrome是否已安装。操作系统: ${platform}`);
}

// 获取Chrome浏览器路径的主方法
function getChromePath(): string {
    // 1. 优先使用环境变量中的路径
    if (process.env.CHROME_PATH) {
        const envPath = process.env.CHROME_PATH;
        console.log(`使用环境变量中的Chrome路径: ${envPath}`);
        
        // 验证环境变量中的路径是否存在
        if (fs.existsSync(envPath)) {
            console.log(`✅ 环境变量路径有效: ${envPath}`);
            return envPath;
        } else {
            console.log(`❌ 环境变量路径无效: ${envPath}`);
            console.log('将尝试自动检测系统Chrome路径...');
        }
    }
    
    // 2. 自动检测系统Chrome路径
    try {
        return getSystemChromePath();
    } catch (error) {
        console.error('❌ Chrome路径检测失败:', (error as Error).message);
        throw error;
    }
}

export abstract class DoorEngine<T = any> {

    protected chromePath: string | undefined;

    protected browser: Browser | undefined;

    protected context: BrowserContext | undefined;

    public resourceId : string;

    public headless: boolean = true;

    monitors : Monitor<T>[] = [];

    monitorsChain : MonitorChain<T>[] = [];

    page : Page | undefined;

    width : number = 600;
    height : number = 400;
    usePersistentContext : boolean;

    needValidateImage : boolean = false;

    browserArgs : string[] = [
        // '--disable-accelerated-2d-canvas', '--disable-webgl',
         '--disable-software-rasterizer',
        '--no-sandbox', // 取消沙箱，某些网站可能会检测到沙箱模式
        '--disable-setuid-sandbox',
        '--disable-webrtc-encryption',
        '--disable-webrtc-hw-decoding',
        '--disable-webrtc-hw-encoding',
        '--disable-extensions-file-access-check',
        '--disable-blink-features=AutomationControlled',  // 禁用浏览器自动化控制特性 - 已过时
        '--disable-background-timer-throttling', // 禁用后台定时器节流
        '--disable-renderer-backgrounding', // 禁用渲染器后台化
        '--disable-backgrounding-occluded-windows', // 禁用被遮挡窗口的后台化
        '--disable-dev-shm-usage', // 避免共享内存问题
        '--disable-gpu-sandbox', // 禁用GPU沙箱
        '--no-first-run', // 跳过首次运行设置
        '--no-default-browser-check', // 跳过默认浏览器检查
        '--disable-default-apps', // 禁用默认应用
        '--disable-features=TranslateUI', // 禁用翻译UI
        // 添加新的反检测参数
        '--disable-automation',
        '--disable-blink-features',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=VizDisplayCompositor'
    ]

    constructor(resourceId : string, headless: boolean = true, chromePath: string = "", browserArgs : string[]|undefined = undefined){
        this.resourceId = resourceId;
        this.usePersistentContext = this.getUsePersistentContext();
        if(chromePath){
            this.chromePath = chromePath;
        }else{
            this.chromePath = this.getChromePath();
        }
        this.headless = headless;
        if(browserArgs){
            this.browserArgs = browserArgs;
        }
        try{
            // 使用更合理的默认尺寸，避免窗口跳来跳去
            this.width = 600;  // 使用标准宽度
            this.height = 400;   // 使用标准高度
        }catch(error){
            this.width = 600;
            this.height = 400;
            log.error("init width and height error", error);
        }
    }

    buildPersistentContextKey(){
        return this.resourceId + "_" + this.getSessionPath();
    }

    getUsePersistentContext () : boolean {
        const key = this.buildPersistentContextKey();
        const usePersistentContext = getGlobal(key);
        if(usePersistentContext){
            return usePersistentContext;
        }
        const sessionDir = this.getSessionPath();
        if(!sessionDir){
            return true;
        }
        return false;
    }

    setNeedValidateImage(needValidateImage : boolean){
        this.needValidateImage = needValidateImage;
    }

    // 添加设置窗口尺寸的方法
    setWindowSize(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    // 获取窗口尺寸的方法
    getWindowSize() {
        return { width: this.width, height: this.height };
    }

    getChromePath() : string | undefined{
        return process.env.CHROME_PATH;
    }

    addMonitor(monitor: Monitor){
        this.monitors.push(monitor);
    }

    getPage(){
        return this.page;
    }

    addMonitorChain(monitorChain: MonitorChain<T>){
        this.monitorsChain.push(monitorChain);
        this.monitors.push(...monitorChain.getMonitors());
    }



    public async init(url : string|undefined = undefined) : Promise<Page | undefined> {
        log.info("init usePersistentContext is ", this.usePersistentContext);
        if(this.usePersistentContext){
            return this.initPageByPersistentContext(url);
        }
        this.browser = await this.createBrowser();
        if(!this.context){
            this.context = await this.createContext();
        }
        // this.context = await this.createBrowser();
        if(!this.context){
            log.info("context is null");
            return undefined;
        }
        
        // 添加网络请求拦截
        // await this.setupNetworkInterception(this.context);
        
        const page = await this.context.newPage();
        // await page.setViewportSize({ width: this.width, height: this.height });
        if(url){
            try{
                await page.goto(url);
            }catch(error){
                log.error("init page goto error", error);
                return page;
            }
        }
        this.onRequest(page);
        this.onResponse(page);
        this.page = page;
        return page;
    }

    public async initContext(url : string|undefined = undefined) : Promise<BrowserContext | undefined> {
        log.info("init usePersistentContext is ", this.usePersistentContext);
        if(this.usePersistentContext){
            return this.initByPersistentContext(url);
        }
        this.browser = await this.createBrowser();
        if(!this.context){
            this.context = await this.createContext();
        }
        // this.context = await this.createBrowser();
        if(!this.context){
            log.info("context is null");
            return undefined;
        }
        return this.context;
    }



    async initByPersistentContext(url : string|undefined = undefined) : Promise<BrowserContext | undefined> {
        this.context = await this.createContextByPersistentContext();
        if(!this.context){
            return undefined;
        }
        return this.context;
    }

    async initPageByPersistentContext(url : string|undefined = undefined) : Promise<Page | undefined> {
        this.context = await this.createContextByPersistentContext();
        if(!this.context){
            return undefined;
        }
        // await this.addAntiDetectionScript(this.context);
        const page = await this.context.newPage();
        // await page.setViewportSize({ width: this.width, height: this.height });
        if(url){
            await page.goto(url);
        }
        this.onRequest(page);
        this.onResponse(page);
        this.page = page;
        return page;
    }

    async createContextByPersistentContext(): Promise<BrowserContext> {
        let storeBrowserPath = await this.getRealChromePath();

        let key = this.getKey();
        if(storeBrowserPath){
            key += "_" + storeBrowserPath;
        }   
        log.info("browser key is ", key);
        if(contextMap.has(key)){
            return contextMap.get(key) as BrowserContext;
        }
        const userDataDir = this.getUserDataDir();
        const platform = await getPlatform();
        
        // 创建浏览器上下文配置
        // 只保留必要的环境变量，避免触发安全警告
        
        // 设置Playwright环境变量以避免自动添加--no-sandbox
        env['PLAYWRIGHT_CHROMIUM_USE_HEADLESS_NEW'] = 'true'
        env['PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD'] = '0'
        // 添加更多环境变量来阻止自动添加 --no-sandbox
        // env['PLAYWRIGHT_CHROMIUM_ARGS'] = '--disable-blink-features=AutomationControlled'  // 已过时
        env['PLAYWRIGHT_DISABLE_SANDBOX'] = 'false'

        const contextConfig: any = {
            headless: this.headless,
            executablePath: storeBrowserPath,
            env : env,
            args: [
                ...this.browserArgs,
                `--window-size=${this.width},${this.height}`,
                // 明确禁用沙箱相关参数
                '--disable-sandbox=false',
                '--enable-sandbox',
                '--disable-dev-shm-usage',
                // '--disable-gpu-sandbox',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-default-apps',
                '--disable-features=TranslateUI',
                // 添加新的反检测参数
                '--disable-automation',
                '--disable-blink-features',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-features=VizDisplayCompositor'
            ],
            ignoreDefaultArgs: [
                '--enable-automation', 
                // '--disable-blink-features=AutomationControlled',  // 禁用浏览器自动化控制特性 - 已过时
                '--enable-blink-features=IdleDetection',
                '--no-sandbox',  // 明确忽略 --no-sandbox
                '--disable-setuid-sandbox'  // 明确忽略 --disable-setuid-sandbox
            ],
            extraHTTPHeaders: {
                'sec-ch-ua': getSecChUa(platform),
                'sec-ch-ua-mobile': '?0', // 设置为移动设备
                'sec-ch-ua-platform': platform?.userAgentData?.platform ? `"${platform.userAgentData.platform}"` : '"Windows"',
            },
            userAgent: platform?.userAgent,

            bypassCSP : true,
            locale: 'zh-CN',
        };
        
        
        const context = await chromium.launchPersistentContext(userDataDir, contextConfig);
        contextMap.set(key, context);
        const persistentContextKey = this.buildPersistentContextKey();
        setGlobal(persistentContextKey, true);
        return context;
    }

    public getContext(){
        return this.context;
    }

    public async closePage(){
        if(this.page){
            await this.page.close();
            log.info("closePage success");
        }
    }

    public async release(){
        await this.closePage();
        await this.closeContext();
        await this.closeBrowser();
    }


    public async doBeforeRequest(router : Route, request: Request, headers: { [key: string]: string; }){
        let isFilter = false;
        for(const monitor of this.monitors){
            if(await monitor.filter(request.url(), request.resourceType(), request.method(), headers)){
                await router.abort();
                isFilter = true;
                continue;
            }
            if(monitor.finishTag){
                continue;
            }
            
            if(!(monitor instanceof MonitorRequest)){
                continue;
            }
            if(!await monitor.isMatch(request.url(), request.method(), headers)){
                continue;
            }
            const requestMonitor = monitor as MonitorRequest<T>;
            let data;
            if(requestMonitor.handler){
                data = await requestMonitor.handler(request, undefined);
            }
            let headerData = {};
            if(requestMonitor.needHeaderData()){
                headerData = await request.allHeaders();
            }
            let url = "";
            if(requestMonitor.needUrl()){
                url = request.url();
            }
            let requestBody = {};
            if(requestMonitor.needRequestBody()){
                const body = request.postData();
                if(body){
                    const params = new URLSearchParams(body);
                    // 将其转换为对象
                    requestBody = Object.fromEntries(params.entries());
                }
            }
            monitor._doCallback(new DoorEntity(data ? true : false, data, url, headerData, requestBody));
            monitor.setFinishTag(true);
        }
        return isFilter;
    }

    public async onRequest(page : Page){
        page.route("*/**", async (router : Route) => {
            // 获取请求对象
            const request = router.request();
            const headers = await request.allHeaders();
            const isFilter = await this.doBeforeRequest(router, request, headers);
            if(isFilter){
                return;
            }
            router.continue();
        });
    }

    public async doAfterResponse(response: Response){
        for(const monitor of this.monitors){
            if(monitor.finishTag){
                continue;
            }
            if(!(monitor instanceof MonitorResponse)){
                continue;
            }
            const responseMonitor = monitor as MonitorResponse<T>;
            if(!await monitor.doMatchResponse(response)){
                continue;
            }
            let headerData = {};
            const request = response.request();
            
            const allHeaders = await request.allHeaders();
            if(responseMonitor.needHeaderData()){
                headerData = allHeaders;
            }
            let url = "";
            if(responseMonitor.needUrl()){
                url = request.url();
            }
            let responseHeaderData = {};
            if(responseMonitor.needResponseHeaderData()){
                responseHeaderData = await response.allHeaders();
            }
            let requestBody = {};
            if(responseMonitor.needRequestBody()){
                const body = request.postData();
                if(body){
                    const params = new URLSearchParams(body);
                    // 将其转换为对象
                    requestBody = Object.fromEntries(params.entries());
                }
            }
            const data = await responseMonitor.getResponseData(response);
            data.url = url;
            data.headerData = headerData;
            data.requestBody = requestBody;
            data.responseHeaderData = responseHeaderData;
            responseMonitor._doCallback(data, response.request(), response);
            responseMonitor.setFinishTag(true);
        }
    }

    public async onResponse(page : Page){
        page.on('response', async (response) => {
            await this.doAfterResponse(response);
        });
    }

    resetMonitor(){
        this.monitors = [];
        this.monitorsChain = [];
    }

    resetListener(page : Page){
        this.onRequest(page);
        this.onResponse(page);
    }

    public async openWaitMonitor(page : Page,  url: string | undefined, monitor : Monitor<T | any>, headers: Record<string, string> = {}, doAction: (page: Page, ...doActionParams: any[]) => Promise<void | DoorEntity<any> | undefined> = async (page: Page, ...doActionParams: any[]) => {return undefined}, ...doActionParams: any[]){
        this.addMonitor(monitor);
        await this.startMonitor();
        if(url){
            await page.goto(url);
        }
        const result = await doAction(page, ...doActionParams);
        if(result != undefined){
            if(result instanceof DoorEntity){
                return result;
            }
            return result;
        }
        const doorEntity = await monitor.waitForAction();
        return doorEntity;
    }

    public async openNotWaitMonitor(page : Page,  url: string, monitor : Monitor<T | any>, headers: Record<string, string> = {}, doAction: (page: Page, ...doActionParams: any[]) => Promise<any>, ...doActionParams: any[]){
        this.addMonitor(monitor);
        await this.startMonitor();
        await page.goto(url);
        const result = await doAction(page, ...doActionParams);
        return result;
    }


    public async openWaitMonitorChain(page : Page,  url: string, monitorChain: MonitorChain<T | any>, headers: Record<string, string> = {}, doAction: (page: Page, ...doActionParams: any[]) => Promise<void> = async (page: Page, ...doActionParams: any[]) => {}, ...doActionParams: any[] ){
        const itemKey = monitorChain.getItemKeys(url);
        this.addMonitorChain(monitorChain);
        await this.startMonitor();
        await page.goto(url);
        await doAction(page, ...doActionParams);
        const doorEntity = await monitorChain.waitForAction();
        return doorEntity;
    }

    public async startMonitor(){
        for(const monitor of this.monitors){
            monitor.start();
        }
    }


    getMonitorChainFromChain(key : string) : MonitorChain<T> | undefined{
        if(!this.monitorsChain || this.monitorsChain.length == 0){
            return undefined;
        }
        for(const monitorChain of this.monitorsChain){
            if(monitorChain.getKey() == key){
                return monitorChain;
            }
        }
        return undefined;
    }

    getMonitor(key : string) : Monitor<T> | undefined{
        if(!this.monitors || this.monitors.length == 0){
            return undefined;
        }
        for(const monitor of this.monitors){
            if(monitor.getKey() == key){
                return monitor;
            }
        }
        return undefined;
    }

    public async closeContext(){
        if(this.context){
            await this.context.close();
            log.info("closeContext success");
        }
    }

    public async closeBrowser(){
        if(this.browser){
            await this.browser.close();
            log.info("closeBrowser success");
        }
    }

    getKey(){
        return `door_engine_${this.getNamespace()}_${this.resourceId}`;
    }

    getSessionPath(){
        let sessionPath = getGlobal(this.getKey())
        if(sessionPath == undefined){
            sessionPath = this.getLastSessionDir();
            if(sessionPath && fs.existsSync(sessionPath)){
                setGlobal(this.getKey(), sessionPath);
                return sessionPath;
            }
            log.info("getSessionPath sessionPath is ", sessionPath);
            return null;
        }
        if(fs.existsSync(sessionPath)){
            log.info("sessionPath is ", sessionPath);
            return sessionPath;
        }
        return null;
    }

    public getLastSessionDir(){
        const userDataPath = app.getPath('userData');

        const sessionDirPath = path.join(userDataPath,'resource','session',this.getNamespace(), this.resourceId.toString());
        log.info("sessionDirPath is ", sessionDirPath);
        if(fs.existsSync(sessionDirPath)){
            //获取此文件夹下最新的那个.json文件
            const files = fs.readdirSync(sessionDirPath).filter(file => file.endsWith('.json'));
            if(files.length > 0){
                const latestFile = files.sort((a, b) => fs.statSync(path.join(sessionDirPath, b)).mtime.getTime() - fs.statSync(path.join(sessionDirPath, a)).mtime.getTime())[0];
                const filePath = path.join(sessionDirPath, latestFile);
                log.info("latestSessionDir is ", filePath);
                return filePath;
            }
        }
        return undefined;
    }

    public getSessionDir(){
        const sessionFileName = Date.now().toString() + ".json";
        const userDataPath = app.getPath('userData');

        const sessionDirPath = path.join(userDataPath,'resource','session',this.getNamespace(), this.resourceId.toString());
        if(!fs.existsSync(sessionDirPath)){
            fs.mkdirSync(sessionDirPath, { recursive: true });
        }
        const sessionDir = path.join(sessionDirPath, sessionFileName);
        return sessionDir;
    }

    getUserDataDir(){
        const userDataPath = app.getPath('userData');
        const userDataDir = path.join(userDataPath,'resource','userDataDir',this.getNamespace(), this.resourceId.toString());
        log.info("userDataDir is ", userDataDir);
        if(!fs.existsSync(userDataDir)){
            fs.mkdirSync(userDataDir, { recursive: true });
        }
        return userDataDir;
    }

    abstract getNamespace(): string;

    public async saveContextState() {
        if(!this.context){
            return;
        }
        const sessionDir = this.getSessionDir();
        setGlobal(this.getKey(), sessionDir);
        await this.context.storageState({ path: sessionDir});
    }


    public getHeaderKey(){
        return `${this.resourceId}_door_header_${this.getKey()}`;
    }

    public getValidateAutoTagKey(){
        return `${this.resourceId}_door_validate_auto_tag_${this.getKey()}`;
    }

    public setHeader(header : {[key : string] : any}){
        if(!header || Object.keys(header).length == 0){
            return;
        }
        const key = this.getHeaderKey();
        setGlobal(key, header);
    }

    public setValidateAutoTag(validateAutoTag : boolean){
        const key = this.getValidateAutoTagKey();
        setGlobal(key, validateAutoTag);
    }

    public getValidateAutoTag(){
        const key = this.getValidateAutoTagKey();
        const validateAutoTag = getGlobal(key);
        if(validateAutoTag == undefined){
            return true;
        }
        return validateAutoTag;
    }

    public getHeader(){
        const key = this.getHeaderKey();
        return getGlobal(key);
    }

    public clearHeader(){
        const key = this.getHeaderKey();
        removeGlobal(key);
    }

    public setParams(key : string, value : any){
        const paramsKey = this.getKey() + "_" + key;
        setGlobal(paramsKey, value);
    }

    public getParams(key : string){
        const paramsKey = this.getKey() + "_" + key;
        return getGlobal(paramsKey);
    }
    async createContext(){
        if(!this.browser){
            return;
        }
        const key = this.headless.toString() + "_" + this.getKey();
        if(contextMap.has(key)){
            return contextMap.get(key);
        }
        // let context;
        const storeBrowserPath = await this.getRealChromePath();
        const platform = await getPlatform();
        const contextConfig : any = {
            bypassCSP : true,
            locale: 'zh-CN',
            args: [
                ...this.browserArgs,
                `--window-size=${this.width},${this.height}`,
                // 明确禁用沙箱相关参数
                '--disable-sandbox=false',
                '--enable-sandbox',
                '--disable-dev-shm-usage',
                // '--disable-gpu-sandbox',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-default-apps',
                '--disable-features=TranslateUI',
                // 添加新的反检测参数
                '--disable-automation',
                '--disable-blink-features',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-features=VizDisplayCompositor'
            ],
            ignoreDefaultArgs: [
                '--enable-automation', 
                // '--disable-blink-features=AutomationControlled',  // 禁用浏览器自动化控制特性 - 已过时
                '--enable-blink-features=IdleDetection',
                '--no-sandbox',  // 明确忽略 --no-sandbox
                '--disable-setuid-sandbox'  // 明确忽略 --disable-setuid-sandbox
            ],
            extraHTTPHeaders: {
                'sec-ch-ua': getSecChUa(platform),
                'sec-ch-ua-mobile': '?0', // 设置为移动设备
                'sec-ch-ua-platform': platform?.userAgentData?.platform ? `"${platform.userAgentData.platform}"` : '"Windows"',
            }
        }
        if(storeBrowserPath){
            contextConfig.executablePath = storeBrowserPath;
        }
        // contextConfig.screen = {
        //     width: this.width,
        //     height: this.height
        // }
        const sessionPath = await this.getSessionPath();
        if(sessionPath){
            contextConfig.storageState = sessionPath;
        }
        if(platform){
            contextConfig.userAgent = platform.userAgent;
            contextConfig.extraHTTPHeaders = {
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
                'sec-ch-ua': getSecChUa(platform),
                'sec-ch-ua-mobile': '?0', // 设置为移动设备
                'sec-ch-ua-platform': platform?.userAgentData?.platform ? `"${platform.userAgentData.platform}"` : '"Windows"',
            };
        }

        const context = await this.browser?.newContext(contextConfig);
        contextMap.set(key, context);
        return context;
    }

    async getRealChromePath(){
        const storeBrowserPath = await getChromePath();
        if(storeBrowserPath){
            return storeBrowserPath;
        }
        return this.chromePath;
    }

    getBrowserKey(){
        let key = this.headless.toString() + "_" + this.needValidateImage.toString();
        if (this.chromePath) {
            key += "_" + this.chromePath;
        }
        return key;
    }

    async createBrowser(){
        let key = this.getBrowserKey();
        log.info("browser key is ", key);
        let storeBrowserPath = await this.getRealChromePath();
        if(browserMap.has(key)){
            return browserMap.get(key);
        }
        
        // 设置环境变量来阻止 Playwright 自动添加 --no-sandbox
        env['PLAYWRIGHT_CHROMIUM_USE_HEADLESS_NEW'] = 'true'
        env['PLAYWRIGHT_DISABLE_SANDBOX'] = 'false'
        // env['PLAYWRIGHT_CHROMIUM_ARGS'] = '--disable-blink-features=AutomationControlled'  // 已过时
        
        // 使用固定的窗口尺寸，避免跳来跳去
        const windowWidth = this.width || 600;
        const windowHeight = this.height || 400;
        
        log.info(`[Engine] 设置浏览器窗口尺寸: ${windowWidth}x${windowHeight}`);
        
        const args = [
            ...this.browserArgs,
            `--window-size=${windowWidth},${windowHeight}`,
            // 明确禁用沙箱相关参数
            '--disable-sandbox=false',
            '--enable-sandbox',
            '--disable-dev-shm-usage',
            // '--disable-gpu-sandbox',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-features=TranslateUI',
            // 添加新的反检测参数
            '--disable-automation',
            '--disable-blink-features',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-features=VizDisplayCompositor'
        ];
        
        const browser = await chromium.launch({
            headless: this.headless,
            slowMo: 15 + Math.floor(Math.random() * 30), // 修改为更小的随机延迟
            executablePath: storeBrowserPath,
            args: args,
            ignoreDefaultArgs: [
                '--enable-automation',
                '--enable-blink-features=IdleDetection',
                '--no-sandbox',  // 明确忽略 --no-sandbox
                '--disable-setuid-sandbox'  // 明确忽略 --disable-setuid-sandbox
            ]
        });
        
        browserMap.set(key, browser);
        return browser;
    }

    // 添加网络请求拦截方法
    async setupNetworkInterception(context: BrowserContext) {
        await context.route('**/*', async route => {
            const request = route.request();
            const headers = await request.allHeaders();
            
            // 修改请求头，增加更多人类特征
            const customHeaders = {
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
                'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site'
            };
            
            // 合并头部信息
            const mergedHeaders = { ...headers, ...customHeaders };
            
            // 监听与验证相关的请求，记录详细日志
            if (request.url().includes('captcha') || 
                request.url().includes('verify') || 
                request.url().includes('check') || 
                request.url().includes('report') || 
                request.url().includes('punish') || 
                request.url().includes('_____tmd_____')) {
                log.info(`发现验证相关请求: ${request.url()}`);
                log.info(`请求方法: ${request.method()}`);
                
                try {
                    const postData = request.postData();
                    if (postData) {
                        log.info(`请求数据: ${postData}`);
                    }
                } catch (e) {
                    log.info(`无法获取请求数据: ${e}`);
                }
            }
            
            try {
                // 继续请求，但使用修改后的头部
                await route.continue({ headers: mergedHeaders });
            } catch (e) {
                // 如果修改失败，则以原始方式继续
                await route.continue();
            }
        });
    }

    // 添加新方法：注入反检测脚本
    async addAntiDetectionScript(context: BrowserContext) {
        await context.addInitScript(() => {
            // =================== 关键浏览器指纹伪装 ===================
            
            // 1. 覆盖navigator对象的关键属性
            const overrideNavigator = () => {
                // 覆盖webdriver属性
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => null
                });
                
                // // 语言伪装
                // Object.defineProperty(navigator, 'languages', {
                //     get: function() {
                //         return ['zh-CN', 'zh', 'en-US', 'en'];
                //     }
                // });
                
                // // 硬件并发伪装
                // Object.defineProperty(navigator, 'hardwareConcurrency', {
                //     get: function() {
                //         return 8; // 大多数普通用户的值
                //     }
                // });
                
                // // deviceMemory
                // Object.defineProperty(navigator, 'deviceMemory', {
                //     get: function() {
                //         return 8; // 常见值
                //     }
                // });
                
                // // 连接类型伪装
                // // @ts-ignore
                // if (navigator.connection) {
                //     // @ts-ignore
                //     Object.defineProperty(navigator.connection, 'rtt', {
                //         get: function() {
                //             return 50 + Math.floor(Math.random() * 40);
                //         }
                //     });
                // }
                
                // // 阻止权限查询
                // const originalPermissions = navigator.permissions;
                // if (originalPermissions) {
                //     // 完全绕过TypeScript类型检查来修改权限API
                //     Object.defineProperty(navigator.permissions, 'query', {
                //         // @ts-ignore - 必须忽略类型检查以实现反检测
                //         value: function() {
                //             return Promise.resolve({
                //                 state: "prompt",
                //                 onchange: null
                //             });
                //         }
                //     });
                // }
            };
            
            // 2. 覆盖WebGL指纹 - 动态生成
            const overrideWebGL = () => {
                try {
                    // 生成随机的WebGL指纹数据
                    const generateWebGLFingerprint = () => {
                        const vendors = [
                            'Intel Inc.',
                            'NVIDIA Corporation',
                            'AMD',
                            'Apple Inc.',
                            'Intel Open Source Technology Center',
                            'Mesa/X.org',
                            'Google Inc.',
                            'ARM',
                            'Qualcomm',
                            'Imagination Technologies'
                        ];
                        
                        const renderers = [
                            'Intel(R) HD Graphics 620',
                            'Intel(R) UHD Graphics 630',
                            'NVIDIA GeForce GTX 1060',
                            'AMD Radeon RX 580',
                            'Apple M1 Pro',
                            'Mesa DRI Intel(R) HD Graphics 630 (Kaby Lake GT2)',
                            'Mesa DRI Intel(R) UHD Graphics 620 (Kaby Lake GT2)',
                            'ANGLE (Intel, Intel(R) HD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
                            'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
                            'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)',
                            'Metal',
                            'Vulkan',
                            'OpenGL ES 3.0',
                            'WebGL 2.0'
                        ];
                        
                        // 随机选择vendor和renderer
                        const randomVendor = vendors[Math.floor(Math.random() * vendors.length)];
                        const randomRenderer = renderers[Math.floor(Math.random() * renderers.length)];
                        
                        return { vendor: randomVendor, renderer: randomRenderer };
                    };
                    
                    // 为每个WebGL上下文生成唯一的指纹
                    const webglFingerprints = new WeakMap();
                    
                    const getParameterProto = WebGLRenderingContext.prototype.getParameter;
                    // @ts-ignore
                    WebGLRenderingContext.prototype.getParameter = function(parameter) {
                        // 为每个WebGL上下文生成或获取指纹
                        if (!webglFingerprints.has(this)) {
                            webglFingerprints.set(this, generateWebGLFingerprint());
                        }
                        const fingerprint = webglFingerprints.get(this);
                        
                        // 根据参数返回相应的指纹值
                        if (parameter === 37445) { // VENDOR
                            return fingerprint.vendor;
                        }
                        if (parameter === 37446) { // RENDERER
                            return fingerprint.renderer;
                        }
                        if (parameter === 37447) { // VERSION
                            // 生成随机的WebGL版本
                            const versions = ['WebGL 1.0', 'WebGL 2.0', 'OpenGL ES 2.0', 'OpenGL ES 3.0'];
                            return versions[Math.floor(Math.random() * versions.length)];
                        }
                        if (parameter === 37448) { // SHADING_LANGUAGE_VERSION
                            const shaderVersions = ['WebGL GLSL ES 1.0', 'WebGL GLSL ES 3.00', 'GLSL ES 1.0', 'GLSL ES 3.0'];
                            return shaderVersions[Math.floor(Math.random() * shaderVersions.length)];
                        }
                        
                        return getParameterProto.apply(this, [...arguments]);
                    };
                    
                    // 同样处理WebGL2
                    if (WebGL2RenderingContext) {
                        const getParameterProto2 = WebGL2RenderingContext.prototype.getParameter;
                        // @ts-ignore
                        WebGL2RenderingContext.prototype.getParameter = function(parameter) {
                            if (!webglFingerprints.has(this)) {
                                webglFingerprints.set(this, generateWebGLFingerprint());
                            }
                            const fingerprint = webglFingerprints.get(this);
                            
                            if (parameter === 37445) {
                                return fingerprint.vendor;
                            }
                            if (parameter === 37446) {
                                return fingerprint.renderer;
                            }
                            if (parameter === 37447) {
                                const versions = ['WebGL 2.0', 'OpenGL ES 3.0'];
                                return versions[Math.floor(Math.random() * versions.length)];
                            }
                            if (parameter === 37448) {
                                const shaderVersions = ['WebGL GLSL ES 3.00', 'GLSL ES 3.0'];
                                return shaderVersions[Math.floor(Math.random() * shaderVersions.length)];
                            }
                            
                            return getParameterProto2.apply(this, [...arguments]);
                        };
                    }
                } catch (e) {
                    console.log('WebGL指纹修改失败，但继续执行', e);
                }
            };
            
            // 3. 覆盖Chrome特有属性
            const overrideChrome = () => {
                // @ts-ignore
                window.chrome = {
                    runtime: {},
                    loadTimes: function() {
                        return {
                            firstPaintTime: 0,
                            firstPaintAfterLoadTime: 0,
                            navigationType: "Other",
                            requestTime: Date.now() / 1000,
                            startLoadTime: Date.now() / 1000,
                            finishDocumentLoadTime: Date.now() / 1000,
                            finishLoadTime: Date.now() / 1000,
                            firstPaintChromeTime: Date.now() / 1000,
                            wasAlternateProtocolAvailable: false,
                            wasFetchedViaSpdy: false,
                            wasNpnNegotiated: false,
                            npnNegotiatedProtocol: "http/1.1",
                            connectionInfo: "h2",
                        };
                    },
                    app: {
                        isInstalled: false,
                        getDetails: function(){},
                        getIsInstalled: function(){},
                        installState: function(){
                            return "disabled";
                        },
                        runningState: function(){
                            return "cannot_run";
                        }
                    },
                    csi: function() {
                        return {
                            startE: Date.now(),
                            onloadT: Date.now(),
                            pageT: Date.now(),
                            tran: 15
                        };
                    }
                };
            };
            
            // 4. 伪装通知API
            const overrideNotification = () => {
                if (window.Notification) {
                    Object.defineProperty(window.Notification, 'permission', {
                        get: () => "default"
                    });
                }
            };
            
            // 5. 伪造Canvas指纹 - 动态生成
            const overrideCanvas = () => {
                try {
                    // 生成随机的Canvas指纹修改策略
                    const generateCanvasFingerprint = () => {
                        const strategies = [
                            // 策略1: 添加随机字符
                            (text: string) => text + ' ' + Math.random().toString(36).substring(2, 5),
                            // 策略2: 添加随机空格
                            (text: string) => text + ' '.repeat(Math.floor(Math.random() * 3) + 1),
                            // 策略3: 添加随机Unicode字符
                            (text: string) => text + String.fromCharCode(0x200B + Math.floor(Math.random() * 10)),
                            // 策略4: 添加随机数字
                            (text: string) => text + Math.floor(Math.random() * 1000).toString(),
                            // 策略5: 添加随机符号
                            (text: string) => text + ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'].sort(() => 0.5 - Math.random())[0],
                            // 策略6: 添加随机emoji
                            (text: string) => text + ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇'].sort(() => 0.5 - Math.random())[0],
                            // 策略7: 添加随机中文字符
                            (text: string) => text + ['的', '是', '在', '有', '和', '与', '或', '但', '而', '且'].sort(() => 0.5 - Math.random())[0],
                            // 策略8: 添加随机标点
                            (text: string) => text + ['，', '。', '！', '？', '；', '：', '"', '"', '\'', '\'', '（', '）'].sort(() => 0.5 - Math.random())[0]
                        ];
                        
                        return strategies[Math.floor(Math.random() * strategies.length)];
                    };
                    
                    // 为每个Canvas上下文生成唯一的指纹修改策略
                    const canvasFingerprints = new WeakMap();
                    
                    const originalGetContext = HTMLCanvasElement.prototype.getContext;
                    // @ts-ignore
                    HTMLCanvasElement.prototype.getContext = function(contextType) {
                        const contextId = arguments[0];
                        const options = arguments.length > 1 ? arguments[1] : undefined;
                        const context = originalGetContext.call(this, contextId, options);
                        
                        if (contextType === '2d' && context) {
                            // 为每个Canvas上下文生成或获取指纹修改策略
                            if (!canvasFingerprints.has(context)) {
                                canvasFingerprints.set(context, generateCanvasFingerprint());
                            }
                            const textModifier = canvasFingerprints.get(context);
                            
                            // @ts-ignore
                            const originalFillText = context.fillText;
                            // @ts-ignore
                            context.fillText = function() {
                                const args = Array.from(arguments);
                                if (args.length > 0 && typeof args[0] === 'string') {
                                    // 使用动态生成的策略修改文本
                                    args[0] = textModifier(args[0]);
                                }
                                return originalFillText.apply(this, args);
                            };
                            
                            // @ts-ignore
                            const originalStrokeText = context.strokeText;
                            // @ts-ignore
                            context.strokeText = function() {
                                const args = Array.from(arguments);
                                if (args.length > 0 && typeof args[0] === 'string') {
                                    // 使用动态生成的策略修改文本
                                    args[0] = textModifier(args[0]);
                                }
                                return originalStrokeText.apply(this, args);
                            };
                            
                            // @ts-ignore
                            const originalGetImageData = context.getImageData;
                            // @ts-ignore
                            context.getImageData = function() {
                                const args = Array.from(arguments);
                                const imageData = originalGetImageData.apply(this, args);
                                if (imageData && imageData.data && imageData.data.length > 0) {
                                    // 动态修改像素数据
                                    const modificationCount = Math.floor(Math.random() * 20) + 5; // 5-25个像素
                                    const modificationType = Math.floor(Math.random() * 4); // 4种修改类型
                                    
                                    for (let i = 0; i < modificationCount; i++) {
                                        const offset = Math.floor(Math.random() * imageData.data.length);
                                        const pixelIndex = Math.floor(offset / 4) * 4; // 确保修改整个像素
                                        
                                        switch (modificationType) {
                                            case 0: // 轻微调整
                                                imageData.data[pixelIndex] = imageData.data[pixelIndex] ^ 1;
                                                break;
                                            case 1: // 随机调整
                                                imageData.data[pixelIndex] = (imageData.data[pixelIndex] + Math.floor(Math.random() * 3)) % 256;
                                                break;
                                            case 2: // 交换相邻像素
                                                if (pixelIndex + 4 < imageData.data.length) {
                                                    const temp = imageData.data[pixelIndex];
                                                    imageData.data[pixelIndex] = imageData.data[pixelIndex + 4];
                                                    imageData.data[pixelIndex + 4] = temp;
                                                }
                                                break;
                                            case 3: // 添加噪声
                                                imageData.data[pixelIndex] = Math.max(0, Math.min(255, imageData.data[pixelIndex] + (Math.random() - 0.5) * 10));
                                                break;
                                        }
                                    }
                                }
                                return imageData;
                            };
                            
                            // 修改measureText方法
                            // @ts-ignore
                            const originalMeasureText = context.measureText;
                            // @ts-ignore
                            context.measureText = function(text) {
                                // 使用相同的文本修改策略
                                const modifiedText = textModifier(text);
                                return originalMeasureText.call(this, modifiedText);
                            };
                        }
                        return context;
                    };
                } catch (e) {
                    console.log('Canvas指纹修改失败，但继续执行', e);
                }
            };
            
            // 6. 隐藏自动化特征
            const hideAutomationFeatures = () => {
                // 隐藏Playwright特征
                Object.defineProperty(window, 'outerWidth', {
                    get: function() { return window.innerWidth; }
                });
                Object.defineProperty(window, 'outerHeight', {
                    get: function() { return window.innerHeight; }
                });
                
                // 阻止检测自动化的navigator特性
                // Object.defineProperty(navigator, 'plugins', {
                //     get: function() {
                //         // 常见插件
                //         const fakePlugins = [];
                //         const flash = { name: 'Shockwave Flash', description: 'Shockwave Flash 32.0 r0', filename: 'internal-flash.plugin', version: '32.0.0' };
                //         const pdf = { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf.plugin', version: '1.0' };
                //         const pdfViewer = { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', version: '1.0' };
                        
                //         // @ts-ignore
                //         fakePlugins.push(flash, pdf, pdfViewer);
                        
                //         // 添加可迭代性
                //         // @ts-ignore
                //         fakePlugins.item = function(index) { return this[index]; };
                //         // @ts-ignore
                //         fakePlugins.namedItem = function(name) { 
                //             // @ts-ignore
                //             return this.find(p => p.name === name); 
                //         };
                //         // @ts-ignore
                //         fakePlugins.refresh = function() {};
                        
                //         return fakePlugins;
                //     }
                // });
                
                // 伪造指纹特征
                const originalQuery = Element.prototype.querySelectorAll;
                // @ts-ignore
                Element.prototype.querySelectorAll = function(selector) {
                    if (selector && selector.includes(':target')) {
                        // 扰乱指纹
                        return document.createElement('div');
                    }
                    return originalQuery.apply(this, [...arguments]);
                };
                
                // 无头模式特殊修复 - 修复window.Notification
                if (window.Notification === undefined) {
                    // @ts-ignore
                    window.Notification = {
                        permission: 'default',
                        requestPermission: function() {
                            return Promise.resolve('default');
                        }
                    };
                }
                
                // 修复headless Chrome检测
                // 模拟浏览器连接
                // @ts-ignore
                if (!navigator.connection) {
                    // @ts-ignore
                    navigator.connection = {
                        downlink: 10 + Math.random() * 5,
                        effectiveType: "4g",
                        onchange: null,
                        rtt: 50 + Math.random() * 30,
                        saveData: false
                    };
                }
                
                // 修复无头WebDriver检测
                Object.defineProperty(navigator, 'userAgent', {
                    get: function() {
                        return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
                    }
                });
                
                // 模拟媒体设备
                if (navigator.mediaDevices === undefined) {
                    // @ts-ignore
                    navigator.mediaDevices = {
                        enumerateDevices: function() {
                            return Promise.resolve([
                                {kind: 'audioinput', deviceId: 'default', groupId: 'default', label: ''},
                                {kind: 'videoinput', deviceId: 'default', groupId: 'default', label: ''}
                            ]);
                        }
                    };
                }
            };
            
            // 7. 阻止指纹收集
            const blockFingerprinting = () => {
                // 阻止FP收集常用的脚本
                Object.defineProperty(performance, 'mark', {
                    value: function() {
                        // 记录性能但如果调用与fingerprint相关就扰乱
                        const args = Array.from(arguments);
                        if (args.length > 0 && typeof args[0] === 'string' && 
                            (args[0].includes('finger') || args[0].includes('detect') || args[0].includes('bot'))) {
                            return null;
                        }
                        return performance.mark.apply(this, args as unknown as [string, any?]);
                    }
                });
                
                // 干扰AudioContext指纹
                if (window.AudioContext || (window as any).webkitAudioContext) {
                    const OriginalAudioContext = window.AudioContext || (window as any).webkitAudioContext;
                    // @ts-ignore
                    window.AudioContext = (window as any).webkitAudioContext = function() {
                        const audioContext = new OriginalAudioContext();
                        const originalGetChannelData = audioContext.createAnalyser().getFloatFrequencyData;
                        // @ts-ignore
                        audioContext.createAnalyser().getFloatFrequencyData = function(array) {
                            const result = originalGetChannelData.apply(this, [...arguments]);
                            // 轻微改变音频数据
                            if (array && array.length > 0) {
                                for (let i = 0; i < array.length; i += 200) {
                                    array[i] = array[i] + Math.random() * 0.01;
                                }
                            }
                            return result;
                        };
                        return audioContext;
                    };
                }
                
                // 无头模式特殊处理 - 修复语音合成
                if (window.speechSynthesis === undefined) {
                    // @ts-ignore
                    window.speechSynthesis = {
                        pending: false,
                        speaking: false,
                        paused: false,
                        onvoiceschanged: null,
                        getVoices: function() { return []; },
                        speak: function() {},
                        cancel: function() {},
                        pause: function() {},
                        resume: function() {}
                    };
                }
            };
            
            // 8. 无头浏览器专用反检测
            const antiHeadlessDetection = () => {
                // 模拟物理屏幕尺寸
                Object.defineProperty(screen, 'availWidth', {
                    get: function() { return window.innerWidth; }
                });
                Object.defineProperty(screen, 'availHeight', {
                    get: function() { return window.innerHeight; }
                });
                Object.defineProperty(screen, 'width', {
                    get: function() { return window.innerWidth; }
                });
                Object.defineProperty(screen, 'height', {
                    get: function() { return window.innerHeight; }
                });
                
                // 模拟WebGL2
                if (window.WebGL2RenderingContext) {
                    const getParameterProto = WebGL2RenderingContext.prototype.getParameter;
                    // @ts-ignore
                    WebGL2RenderingContext.prototype.getParameter = function(parameter) {
                        if (parameter === 37445) {
                            return 'Intel Open Source Technology Center';
                        }
                        if (parameter === 37446) {
                            return 'Mesa DRI Intel(R) HD Graphics 630 (Kaby Lake GT2)';
                        }
                        return getParameterProto.apply(this, [...arguments]);
                    };
                }
                
                // 处理无头模式中navigator.plugins和mimeTypes
                if (navigator.plugins.length === 0) {
                    Object.defineProperty(navigator, 'plugins', {
                        get: function() {
                            const ChromePDFPlugin = { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' };
                            const FakeMimeType = { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' };
                            
                            // @ts-ignore
                            ChromePDFPlugin.__proto__ = MimeType.prototype;
                            const pluginArray = [ChromePDFPlugin];
                            
                            // @ts-ignore
                            pluginArray.item = function(index) { return this[index]; };
                            // @ts-ignore
                            pluginArray.namedItem = function(name) { return this[0].name === name ? this[0] : null; };
                            // @ts-ignore
                            pluginArray.refresh = function() {};
                            // @ts-ignore
                            pluginArray.length = 1;
                            
                            return pluginArray;
                        }
                    });
                }
                
                if (navigator.mimeTypes.length === 0) {
                    Object.defineProperty(navigator, 'mimeTypes', {
                        get: function() {
                            const mimeTypes = [
                                { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: {} }
                            ];
                            
                            // @ts-ignore
                            mimeTypes.item = function(index) { return this[index]; };
                            // @ts-ignore
                            mimeTypes.namedItem = function(name) { return this[0].type === name ? this[0] : null; };
                            // @ts-ignore
                            mimeTypes.length = 1;
                            
                            return mimeTypes;
                        }
                    });
                }
            };
            
            // 执行所有伪装
            try {
                overrideNavigator();
                overrideWebGL();
                overrideChrome();
                overrideNotification();
                overrideCanvas();
                hideAutomationFeatures();
                blockFingerprinting();
                antiHeadlessDetection(); // 添加无头浏览器专用反检测
            } catch (err) {
                // 忽略错误继续执行
            }
        });
    }

}

export function getSecChUa(platform : any){
    if(!platform){
        return "";
    }
    if(!platform.userAgentData || !platform.userAgentData.brands){
        return "";
    }
    const brands = platform.userAgentData.brands;
    const result = [];
    for(const brand of brands){
        result.push(`"${brand.brand}";v="${brand.version}"`);
    }
    return result.join(", ");
}

export async function initPlatform(){
    let browser : Browser | undefined = undefined;
    try{
        let platform = await getPlatform();
        if(platform){
            return platform;
        }
        let storeBrowserPath = await getChromePath();

        // 设置环境变量来阻止 Playwright 自动添加 --no-sandbox
        env['PLAYWRIGHT_CHROMIUM_USE_HEADLESS_NEW'] = 'true'
        env['PLAYWRIGHT_DISABLE_SANDBOX'] = 'false'
        // env['PLAYWRIGHT_CHROMIUM_ARGS'] = '--disable-blink-features=AutomationControlled'  // 已过时

        browser = await chromium.launch({
            headless: false,
            executablePath: storeBrowserPath,
            args: [
                '--disable-accelerated-2d-canvas', '--disable-webgl', '--disable-software-rasterizer',
                // '--no-sandbox', // 取消沙箱，某些网站可能会检测到沙箱模式
                // '--disable-setuid-sandbox',
                // '--disable-blink-features=AutomationControlled',  // 禁用浏览器自动化控制特性 - 已过时
                // 明确禁用沙箱相关参数
                '--disable-sandbox=false',
                '--enable-sandbox',
                '--disable-dev-shm-usage',
                // '--disable-gpu-sandbox',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-default-apps',
                '--disable-features=TranslateUI',
                // 添加新的反检测参数
                '--disable-automation',
                '--disable-blink-features',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-features=VizDisplayCompositor'
            ],
            ignoreDefaultArgs: [
                '--enable-automation',
                '--enable-blink-features=IdleDetection',
                '--no-sandbox',  // 明确忽略 --no-sandbox
                '--disable-setuid-sandbox'  // 明确忽略 --disable-setuid-sandbox
            ]
         });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto("https://www.baidu.com");
        platform = await setPlatform(page);
        log.info("login platform is ", JSON.stringify(platform));
        return platform;
    }catch(error){
        log.error("initPlatform error", error);
    }finally{
        if(browser){
            await browser.close();
        }
    }
}

export async function setPlatform(page : Page){
    const platform = await page.evaluate(() => {
        // @ts-ignore
        const navigatorObj = navigator;
        const result : any = {};
        for(let key in navigatorObj){
            result[key] = navigatorObj[key];
        }
        return result;
    });
    setGlobal("browserPlatform_" + (process.env.CHROME_VERSION || '1169'), JSON.stringify(platform));
    return platform;
}

export async function getPlatform(){
    const chromeVersion = process.env.CHROME_VERSION || '1169';
    const browserPlatform = await getGlobal("browserPlatform_" + chromeVersion);
    if(browserPlatform){
        return JSON.parse(browserPlatform);
    }
    return undefined;
}
