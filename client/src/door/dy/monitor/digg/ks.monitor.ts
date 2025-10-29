// import axios from "axios";
// import { Page, Route } from "playwright";
// import { Request } from "playwright";
// import { DyEngine } from "../../dy.engine";
// import { app } from "electron";
// import path from "path";
// import { sleep } from "@utils/index";
// import log from "electron-log";
// import { TaskResponse } from "@model/task.entity";
// import { getEngineLegacy as getEngine } from "../../manager";
// import { callbackDigg } from "../../task/run";
// import { TaskType } from "@model/task.entity";
// import { requestLog } from "@src/door/model/log.request";
// import { getConsecutiveFailures, getDyUser, getWebDevice, setWebDevice } from "../../store/dy.store";
// import { buildWebDevice, getSessionIdAndToken } from "@src/door/model/dy.web.device";


// export class DiggMonitor {

//     private portId: string;
//     private taskResponse: TaskResponse | null = null;
//     private startFlag: boolean = false;
//     private page: Page | null = null;
//     private logRequest: boolean = false;
//     public headless: boolean = true;
//     constructor(portId: string, headless: boolean = true) {
//         this.portId = portId;
//         this.headless = headless;
//     }
//     setLogRequest(logRequest: boolean){
//         this.logRequest = logRequest;
//     }

//     setTaskResponse(taskResponse: TaskResponse){
//         this.taskResponse = taskResponse;
//     }

//     getSessionDir() {
//         const userDataPath = app.getPath('userData');
//         const sessionDir = path.join(userDataPath, 'resource', 'dy', this.portId);
//         return sessionDir;
//     }

//     async actionMonitor(page: Page) {
//         await page.route('**/*', async (route) => {
//             // 获取请求对象
//             const request = route.request();
//             if (request.resourceType() == 'xhr') {
//                 const requestUrl = await request.url();
//                 const diggUrl = "web/commit/item/digg";
//                 if (requestUrl.includes(diggUrl) && this.taskResponse?.taskType == TaskType.DIGG) {
//                     log.info("diggIntercept start taskResponse is ", this.taskResponse);
//                     await this.diggIntercept(route, request)
//                     return;
//                 }
//                 const collectUrl = "web/aweme/collect";
//                 // if (requestUrl.includes(collectUrl) && this.taskResponse?.taskType == TaskType.COLLECT) {
//                 //     log.info("collectIntercept start taskResponse is ", this.taskResponse);
//                 //     await this.collectIntercept(route, request)
//                 //     return;
//                 // }
//                 const playUrl = "web/aweme/stats";
//                 const followUrl = "web/commit/follow/user";
//                 if (requestUrl.includes(playUrl) || requestUrl.includes(followUrl) || requestUrl.includes(collectUrl)) {
//                     log.info("doIntercept start taskResponse is ", this.taskResponse);
//                     await this.doIntercept(route, request, this.taskResponse?.taskType || "")
//                     return;
//                 }
//             }
//             route.continue();
//         });
//     }

//     async confirmWindow(page: Page) {
//         await sleep(2000);
//         log.info("confirmWindow start");
//         const confirmWindow = page.locator('#douyin-web-recommend-guide-mask');
//         if(!confirmWindow){
//             return;
//         }
//         log.info("confirmWindow found confirmWindow");
//         const confirmWindowVisible = await confirmWindow.isVisible();
//         log.info("confirmWindow is ", confirmWindowVisible);
//         let num = 30;
//         while(confirmWindowVisible && num > 0){
//             const confirmButton = page.locator('#douyin-web-recommend-guide-mask button').first();
//             log.info("confirmButton is found ");
//             if(confirmButton){
//                 const confirmButtonVisible = await confirmButton.isVisible();
//                 log.info("confirmButton is ", confirmButtonVisible);
//                 if(confirmButtonVisible){
//                     log.info("confirmButton click start");
//                     await confirmButton.click();
//                     log.info("confirmButton click end");
//                     return;
//                 }
//             }
//             await sleep(1000);
//             num--;
//         }
//     }

//     async stopVideo(page: Page) {
//         log.info("🎬 stopVideoV2 开始暂停视频");
//         try {
//             await this.confirmWindow(page);
//             log.info("🔄 尝试备用方案：使用空格键暂停");
//             await sleep(1000);
//             await page.keyboard.press('Space');
//             await sleep(1000);
//             // 检查备用方案是否成功
//             const videoContainer = page.locator('.xgplayer.xgplayer-playing').first();
//             const isPausedBySpace = await videoContainer.evaluate((el) => {
//                 return el.classList.contains('xgplayer-pause');
//             }, { timeout: 10000 });

//             if (isPausedBySpace) {
//                 log.info("✅ 备用方案成功：视频已通过空格键暂停");
//                 return true;
//             }
//         } catch (spaceError) {
//             console.error("❌ 备用方案也失败:", spaceError);
//         }
//         return false;
//     }


//     async doClickPlay(taskResponse: TaskResponse, page : Page){
//         const webDevice = getWebDevice(this.portId);
//         if(!webDevice){
//             return;
//         }
//         const url = `https://www.douyin.com/aweme/v2/web/aweme/stats/?device_platform=webapp&aid=${webDevice.aid}&channel=${webDevice.channel}&pc_client_type=${webDevice.pcClientType}&pc_libra_divert=${webDevice.pcLibraDivert}&update_version_code=${webDevice.updateVersionCode}&support_h265=1&support_dash=1&version_code=${webDevice.versionCode}&version_name=${webDevice.versionName}&cookie_enabled=true&screen_width=${webDevice.screenWidth}&screen_height=${webDevice.screenHeight}&browser_language=${webDevice.browserLanguage}&browser_platform=${webDevice.browserPlatform}&browser_name=${webDevice.browserName}&browser_version=${webDevice.browserVersion}&browser_online=${webDevice.browserOnline}&engine_name=${webDevice.engineName}&engine_version=${webDevice.engineVersion}&os_name=${webDevice.osName}&os_version=${webDevice.osVersion}&cpu_core_num=${webDevice.cpuCoreNum}&device_memory=${webDevice.deviceMemory}&platform=${webDevice.platform}&downlink=${webDevice.downlink}&effective_type=${webDevice.effectiveType}&round_trip_time=${webDevice.roundTripTime}&webid=${webDevice.webid}`;
//         const javascriptCode = `
//         (function(){
//                 var url = "${url}";
//                 var params = new URLSearchParams();
//                 params.set("aweme_type","0");
//                 params.set("item_id","${taskResponse.videoId}");
//                 params.set("play_delta","1");
//                 params.set("source","0");
//                 var xhr = new XMLHttpRequest();
//                 xhr.open("POST", url, true);
//                 xhr.withCredentials = true;
//                 xhr.setRequestHeader("accept", "application/json, text/plain, */*");
//                 xhr.setRequestHeader("Accept-Language", "zh-CN,zh;q=0.9");
//                 xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
//                 xhr.send(params.toString());
//             })();
//         `
//         await page.evaluate(javascriptCode);
//     }

//     async doClickFollow(taskResponse: TaskResponse, page : Page){
//         const webDevice = getWebDevice(this.portId);
//         if(!webDevice){
//             return;
//         }
//         var url = `https://www.douyin.com/aweme/v1/web/commit/follow/user/?device_platform=webapp&aid=${webDevice.aid}&channel=${webDevice.channel}&pc_client_type=${webDevice.pcClientType}&pc_libra_divert=${webDevice.pcLibraDivert}&update_version_code=${webDevice.updateVersionCode}&support_h265=1&support_dash=1&version_code=${webDevice.versionCode}&version_name=${webDevice.versionName}&cookie_enabled=true&screen_width=${webDevice.screenWidth}&screen_height=${webDevice.screenHeight}&browser_language=${webDevice.browserLanguage}&browser_platform=${webDevice.browserPlatform}&browser_name=${webDevice.browserName}&browser_version=${webDevice.browserVersion}&browser_online=${webDevice.browserOnline}&engine_name=${webDevice.engineName}&engine_version=${webDevice.engineVersion}&os_name=${webDevice.osName}&os_version=${webDevice.osVersion}&cpu_core_num=${webDevice.cpuCoreNum}&device_memory=${webDevice.deviceMemory}&platform=${webDevice.platform}&downlink=${webDevice.downlink}&effective_type=${webDevice.effectiveType}&round_trip_time=${webDevice.roundTripTime}&webid=${webDevice.webid}`;
//         log.info("doClickFollow url is ", url);
//         const javascriptCode = `
//        (function(){
// 					var url = "${url}";
//                     var params = "type=1&user_id=${taskResponse.videoId}";
// 					var xhr = new XMLHttpRequest();
// 					xhr.open("POST", url, true);
// 					xhr.withCredentials = true;
// 					xhr.setRequestHeader("accept", "application/json, text/plain, */*");
// 					xhr.setRequestHeader("Accept-Language", "zh-CN,zh;q=0.9");
// 					xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
//                     xhr.addEventListener('loadend', function onLoadEnd(){
// 					    try { 
//                             window.followResponse = xhr.responseType === 'json' ? xhr.response : JSON.parse(xhr.responseText); 
//                         } catch(e){ 
//                             window.followResponse = { error: 'parse_error', responseText: xhr.responseText }; 
//                         }
// 					    xhr.removeEventListener('loadend', onLoadEnd);
// 				    });
//                     xhr.send(params);
//         })();
//         `
//         await page.evaluate(javascriptCode);
//     }


//     async doClickCollect(taskResponse: TaskResponse, page : Page){
//         const webDevice = getWebDevice(this.portId);
//         if(!webDevice){
//             return;
//         }
//         var url = `https://www.douyin.com/aweme/v1/web/aweme/collect/?device_platform=webapp&aid=${webDevice.aid}&channel=${webDevice.channel}&pc_client_type=${webDevice.pcClientType}&pc_libra_divert=${webDevice.pcLibraDivert}&update_version_code=${webDevice.updateVersionCode}&support_h265=1&support_dash=1&version_code=${webDevice.versionCode}&version_name=${webDevice.versionName}&cookie_enabled=true&screen_width=${webDevice.screenWidth}&screen_height=${webDevice.screenHeight}&browser_language=${webDevice.browserLanguage}&browser_platform=${webDevice.browserPlatform}&browser_name=${webDevice.browserName}&browser_version=${webDevice.browserVersion}&browser_online=${webDevice.browserOnline}&engine_name=${webDevice.engineName}&engine_version=${webDevice.engineVersion}&os_name=${webDevice.osName}&os_version=${webDevice.osVersion}&cpu_core_num=${webDevice.cpuCoreNum}&device_memory=${webDevice.deviceMemory}&platform=${webDevice.platform}&downlink=${webDevice.downlink}&effective_type=${webDevice.effectiveType}&round_trip_time=${webDevice.roundTripTime}&webid=${webDevice.webid}`;
//         log.info("doClickCollect url is ", url);
//         const javascriptCode = `
//        (function(){
// 					var url = "${url}";
//                     var params = "action=1&aweme_id=${taskResponse.videoId}&aweme_type=1";
// 					var xhr = new XMLHttpRequest();
// 					xhr.open("POST", url, true);
// 					xhr.withCredentials = true;
// 					xhr.setRequestHeader("accept", "application/json, text/plain, */*");
// 					xhr.setRequestHeader("Accept-Language", "zh-CN,zh;q=0.9");
// 					xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
//                     xhr.send(params);
//         })();
//         `
//         await page.evaluate(javascriptCode);
//     }

//     async actionClick(taskResponse: TaskResponse){
//         if(!this.page){
//             return;
//         }
//         if(taskResponse.taskType == TaskType.MI_PLAY || taskResponse.taskType == TaskType.MI_PLAY_NO_CK){
//             this.setTaskResponse(taskResponse);
//             await this.doClickPlay(taskResponse, this.page);
//             await sleep(2000);
//             return;
//         }else if(taskResponse.taskType == TaskType.COLLECT){
//             this.setTaskResponse(taskResponse);
//             await this.doClickCollect(taskResponse, this.page);
//             await sleep(2000);
//             return;
//         }else if(taskResponse.taskType == TaskType.FOLLOW){
//             const videoId = taskResponse.videoId;
//             if(!videoId || videoId == ""){  
//                 log.error("videoId is empty");
//                 await this.doCallback(taskResponse, {status_code: "3002335"});
//                 return;
//             }
//             this.setTaskResponse(taskResponse);
//             await this.doClickFollow(taskResponse, this.page);
//             await sleep(2000);
//             return;
//         }
//         const diggIcon = await this.page.locator("[data-e2e='video-player-digg']").first();
//         if(diggIcon){
//             log.info("diggIcon is found");
//             let num = 30;
//             let diggIconVisible = await diggIcon.isVisible();
//             while(num > 0 && !diggIconVisible){
//                 await sleep(1000);
//                 diggIconVisible = await diggIcon.isVisible();
//                 log.info("diggIcon is ", diggIconVisible);
//                 num--;
//             }
//             if(diggIconVisible){
//                 this.setTaskResponse(taskResponse);
//                 log.info(taskResponse.taskType," action click start");
//                 if(taskResponse.taskType == TaskType.DIGG){
//                     await diggIcon.click();
//                 }else if(taskResponse.taskType == TaskType.COLLECT){
//                     const collectIcon = await this.page.locator("[data-e2e='video-player-collect']").first();
//                     if(collectIcon){
//                         log.info("collectIcon is found");
//                         await collectIcon.click();
//                     }else{
//                         log.error("collectIcon not found");
//                     }
//                 }
//                 log.info(taskResponse.taskType," action click end");
//             }else{
//                 if(this.doCallback){
//                     log.error("diggIcon not visible");
//                     await this.doCallback(taskResponse, {status_code: 8});
//                 }
//             }
//         }
//     }

//     public async start(headless: boolean): Promise<boolean> {
//         headless = false;
//         log.info("diggMonitor start headless is ", headless);
//         this.headless = headless;
//         const engine = await getEngine(this.portId, headless);
//         let page = engine.getPage();
//         let isCachePage = false;
//         this.setLogRequest(false);
//         if(page){
//             if(page.isClosed()){
//                 log.info("page is closed");
//                 page = await engine.init("https://www.douyin.com/?recommend=1");
//             }else{
//                 const url = await page.url();
//                 log.info("page is not close url is ", url);
//                 if(url.includes("https://www.douyin.com/?recommend=1")){
//                     isCachePage = true;
//                 }else{
//                     await page.goto("https://www.douyin.com/?recommend=1");
//                     log.info("page goto end");
//                 }
//             }
//         }else{
//             page = await engine.init("https://www.douyin.com/?recommend=1");
//         }
//         if (!page) {
//             return false;
//         }
//         this.page = page;
//         const isLogin = await this.checkAndInit(engine, page);
//         if(!isLogin){
//             return false;
//         }
//         if(isCachePage){
//             log.info("isCachePage is true");
//             return true;
//         }
//         this.actionMonitor(page);
//         await this.stopVideo(page);
//         await sleep(5000);
//         this.startFlag = true;
//         return true;
//     }

//     async isLogin(page: Page){
//         const loginText = await page.locator("#douyin_login_comp_flat_panel").first();
//         if(loginText){
//             let num = 10;
//             let loginTextVisible = await loginText.isVisible();
//             while(num > 0 && !loginTextVisible){
//                 await sleep(1000);
//                 loginTextVisible = await loginText.isVisible();
//                 log.info("is need login ", loginTextVisible);
//                 if(loginTextVisible){
//                    return false;
//                 }
//                 num--;
//             }
//         }
//         return true;
//     }

//     async checkAndInit(engine: DyEngine<{}>, page: Page){
//         const isLogin = await this.isLogin(page);
//         if(isLogin){
//             log.info("isLogin is true");
//             return true;
//         }
//         const loginButton = page.locator("#douyin-login-new-id .VWgr3GWj").first();
//         if(loginButton){
//             log.info("loginButton is found");
//             let num = 30;
//             let loginButtonVisible = await loginButton.isVisible();
//             while(num > 0 && !loginButtonVisible){
//                 await sleep(1000);
//                 loginButtonVisible = await loginButton.isVisible();
//                 log.info("loginButton is ", loginButtonVisible);
//                 num--;
//             }
//             if(loginButtonVisible){
//                 const text = await loginButton.textContent();
//                 if(text && text.includes("一键登录")){
//                     log.info("one loginButton click start");
//                     await loginButton.click();
//                     await sleep(5000);
//                     log.info("one loginButton click end");
//                     engine.saveContextState();
//                     return true;
//                 }
//                 return false;
//             }else{
//                 log.error("loginButton not visible");
//             }
//         }
//         log.info("loginButton not need to login");
//         return false;
//     }

//     async stop(): Promise<void> {
//         this.startFlag = false;
//     }

//     async collectIntercept(route: Route, request: Request) {
//         if (!this.taskResponse) {
//             return;
//         }
//         const originalUrl = await request.url();
//         const headers = await request.headers();
//         try {
//             const body = await request.postData();
//             const params = new URLSearchParams(body || "");
//             // 将其转换为对象
//             const bodyJson = Object.fromEntries(params.entries());
//             bodyJson['aweme_id'] = this.taskResponse.videoId;
//             bodyJson['aweme_type'] = "0";
//             bodyJson['action'] = "0";
//             const bodyString = new URLSearchParams(bodyJson).toString();
//             const axiosResponse: any = await axios.post(originalUrl, bodyString, { headers: headers });
//             const axiosResponseData = await axiosResponse.data;
//             const axiosResponseDataString = JSON.stringify(axiosResponseData);
//             const axiosResponseHeaders = await axiosResponse.headers;
//             await route.fulfill({
//                 status: 200,
//                 headers: axiosResponseHeaders as any,
//                 contentType: 'application/json',
//                 body: axiosResponseDataString,
//             });
//             log.info("collectIntercept end ", axiosResponse.data, "taskResponse is ", this.taskResponse);
//             if(this.doCallback){
//                 await this.doCallback(this.taskResponse, axiosResponse.data);
//             }
//         } catch (e) {
//             await route.abort();
//             log.info("collectIntercept error", e);
//         }
//     }

//     async doRequest(url: string, body: any, headers: any, taskType : string) {
//         let axiosResponse: any = await axios.post(url, body, { headers: headers });
//         let axiosResponseData = await axiosResponse.data;
//         // if(taskType == TaskType.COLLECT){
//         //     if(axiosResponseData.status_code == 0 && axiosResponseData.collects_flag == undefined){
//         //         await sleep(3000 + Math.random() * 2000);
//         //         const params = new URLSearchParams(body || "");
//         //         const bodyJson = Object.fromEntries(params.entries());
//         //         bodyJson['action'] = "0";
//         //         const bodyString = new URLSearchParams(bodyJson).toString();
//         //         axiosResponse = await axios.post(url, bodyString, { headers: headers });
//         //         axiosResponseData = await axiosResponse.data;
//         //         axiosResponseData['collects_flag'] = true;
//         //         await sleep(3000 + Math.random() * 2000);
//         //     }
//         // }
//         const axiosResponseHeaders = await axiosResponse.headers;
//         return {
//             responseHeaders: axiosResponseHeaders as any,
//             responseBody: axiosResponseData
//         };
//     }

//     async doIntercept(route: Route, request: Request, taskType : string) {
//         if (!this.taskResponse) {
//             return;
//         }
//         const originalUrl = await request.url();
//         const headers = await request.headers();
//         try {
//             const body = await request.postData();
//             let {responseHeaders, responseBody} = await this.doRequest(originalUrl, body, headers, taskType);
//             const axiosResponseDataString = JSON.stringify(responseBody);
//             await route.fulfill({
//                 status: 200,
//                 headers: responseHeaders as any,
//                 contentType: 'application/json',
//                 body: axiosResponseDataString,
//             });
//             log.info("doIntercept end ", responseBody, "taskResponse is ", this.taskResponse);
//             if(this.doCallback){
//                 await this.doCallback(this.taskResponse, responseBody);
//             }
//         } catch (e) {
//             await route.abort();
//             log.info("doIntercept error", e);
//         }
//     }

//     async diggIntercept(route: Route, request: Request) {
//         if (!this.taskResponse) {
//             return;
//         }
//         const originalUrl = await request.url();
//         const headers = await request.headers();
//         try {
//             const body = await request.postData();
//             const params = new URLSearchParams(body || "");
//             // 将其转换为对象
//             const bodyJson = Object.fromEntries(params.entries());
//             bodyJson['aweme_id'] = this.taskResponse.videoId;
//             bodyJson['type'] = "1";
//             const bodyString = new URLSearchParams(bodyJson).toString();
//             const axiosResponse: any = await axios.post(originalUrl, bodyString, { headers: headers });
//             const axiosResponseData = await axiosResponse.data;
//             const axiosResponseDataString = JSON.stringify(axiosResponseData);
//             const axiosResponseHeaders = await axiosResponse.headers;
//             if(!this.logRequest){
//                 const dyUser = getDyUser(this.portId);
//                 if(dyUser){
//                     const sessionIdAndToken = await getSessionIdAndToken(headers);
//                     if(sessionIdAndToken){
//                         dyUser.sessionId = sessionIdAndToken.sessionId;
//                         dyUser.token = sessionIdAndToken.cookie;
//                     }
//                     const engine = await getEngine(this.portId, this.headless);
//                     const webDevice = buildWebDevice(originalUrl, headers, sessionIdAndToken?.cookie || "");
//                     setWebDevice(this.portId, webDevice);
//                     const sessionDir = await engine.getSessionPath();
//                     await requestLog(dyUser, webDevice, sessionDir, this.portId);
//                 }
//                 this.setLogRequest(true);
//             }
//             await route.fulfill({
//                 status: 200,
//                 headers: axiosResponseHeaders as any,
//                 contentType: 'application/json',
//                 body: axiosResponseDataString,
//             });
//             log.info("diggIntercept end ", axiosResponse.data, "taskResponse is ", this.taskResponse);
//             if(this.doCallback){
//                 await this.doCallback(this.taskResponse, axiosResponse.data);
//             }
//         } catch (e) {
//             await route.abort();
//             log.info("diggIntercept error", e);
//         }
//     }

//     async doCallback(taskResponse: TaskResponse, data: { [key: string]: any }){
//         await callbackDigg(taskResponse, data);
//     }
// }





// const diggMonitorManager = new Map<string, DiggMonitor>();

// export function getDiggMonitor(port: string, headless: boolean = true): DiggMonitor {
//     if (!diggMonitorManager.has(port)) {
//         diggMonitorManager.set(port, new DiggMonitor(port, headless));
//     }
//     return diggMonitorManager.get(port)!;
// }

// export function removeDiggMonitor(resourceId: string) {
//     diggMonitorManager.delete(resourceId);
// }