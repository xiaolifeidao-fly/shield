import { SimpleTaskManager } from './simple-task-manager';
import { ResourceAccount } from './interfaces';
import { getDyUser,  getPlatformTypes, getPlatformUserByPort, init, initDyUser, initPlatformManger, PlatformUser, setDyUser, setDyUserHeadless, setDyUserStatistic, setDyUserTodayStatistic, setPlatformUserByPort } from '../store/dy.store';
import log from 'electron-log'
import { createTaskManagerConfig, TaskUtils } from './index';
import { addNoCkInstance, getAllInstances, getNoCkPort, PortInstance, setAllNoCkInstances, setStatusByPort } from '../store/port.store';
import { TaskResponse, TaskType } from '@model/task.entity';
import { initWatchWait, PlatformConfigApiImpl } from '@src/impl/door/platform.api.impl';
import { getPlayMonitor } from '../monitor/play/monitor';
import { getPlayTaskManager, PlayTaskManager } from './play-task-manager';

// 使用简化版任务管理器，避免Worker Threads的问题
let taskManager : SimpleTaskManager | null = null;
const USE_SIMPLE_MANAGER = true; // 设置为true使用简化版，false使用Worker版本

/**
 * 自定义生产者-消费者系统使用示例
 * 
 * 这个示例展示了如何：
 * 1. 使用自定义生产者实现具体业务逻辑 (API调用、数据抓取、文件处理)
 * 2. 使用自定义消费者实现消息处理 (数据库存储、文件写入、通知发送)
 * 3. 整合到自定义任务管理器中
 */
export async function initTaskManager() {
  await initWatchWait();
  guardAssignConfigs();
  init();
  // 1. 创建自定义任务管理器配置
  const config = createTaskManagerConfig(
    50, // 2个自定义生产者
    50, // 2个自定义消费者
    {
      queueMaxSize: 5000,
      resourceDistributionStrategy: 'even'
    }
  );

  // 2. 创建任务管理器 - 根据配置选择版本
  log.info("使用简化版任务管理器（不依赖Worker Threads）");
  taskManager = new SimpleTaskManager(config);
  
  try {
    taskManager.start();
    await initAssignConfigs();
  } catch (error) {
    log.error("taskManager start error", error);
  }

  // 4. 设置事件监听
  // setupEventListeners(taskManager);
  // displaySystemStats(taskManager);
}


function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function initDyUserByPort(port : string, groupCode : string, headless: boolean = true){
  log.info("dyUser is init");
  const engine = await getEngine(port, groupCode, headless);
  const ckJson = await engine.getCkJson();
  if(ckJson){
    initDyUser(groupCode, port, ckJson);
  }
}

export async function runByPort(groupCode : string, port : string, headless: boolean = true) {
  log.info("runByPort start", port,  " headless is ", headless);
  const isLogin = await runStart(groupCode, port, headless);
  if(!isLogin){
    const dyUser = getDyUser(groupCode, port);
    if(dyUser){
      dyUser.isLogin = false;
      setDyUser(groupCode, port, dyUser);
    }
    log.error("isLogin is false");
    return false;
  }
  let dyUser = getDyUser(groupCode, port);
  if(dyUser) {
    if(!dyUser.uid || dyUser.uid == ""){
      await initDyUserByPort(port, groupCode, headless);
      dyUser = getDyUser(groupCode, port);
    }
  }else{
    await initDyUserByPort(port, groupCode, headless);
    dyUser = getDyUser(groupCode, port);
  }
  const cacheTasks = new Map<string, Map<string, TaskResponse | null>>();
  const platformTypes = getPlatformTypes();
  for(const platformType of platformTypes){
    cacheTasks.set(platformType, new Map<string, TaskResponse | null>());
  }
  const resourceAccount : ResourceAccount = {
    id : port,
    groupCode : groupCode,
    isActive : true,
    type : "ak",
    port : port,
    dyUser : dyUser,
    cacheTasks : cacheTasks
  };
  taskManager?.addResource(resourceAccount);
  const playTaskManager = getPlayTaskManager(BusinessType.MI_PLAY);
    if(playTaskManager && !playTaskManager.hasResource(port)){
        runPlayWithCkInstance(port, playTaskManager);
    }
  setStatusByPort(port, "running");
  return true;
}

export function stopByPort(groupCode : string, port : string) {
  taskManager?.removeResource(port);
  setStatusByPort(port, "stopped");
}


export async function doActionCallback(groupCode : string, taskResponse: TaskResponse, data: {[key: string]: any}, taskResult: TaskResult){
  taskManager?.doActionCallback(groupCode, taskResponse, data, taskResult);
}

export async function callbackPlay(taskResponse: TaskResponse, data: {[key: string]: any}, successNum: number) {
  const playTaskManager = getPlayTaskManager(TaskType.MI_PLAY);
  playTaskManager?.doActionCallback(taskResponse, data, successNum);
}

export async function runStart(groupCode : string, port : string, headless: boolean) {
  log.info("runByPort start", port);
  const monitor = getAbsMonitor(groupCode, port, headless);
  if(monitor){
    return await monitor.start(headless);
  }
  return false;
}

export async function runPlay(port : string, headless: boolean = true, needLogin: boolean = true) {
  try{
    log.info("runByPort start", port);
    const diggMonitor = getPlayMonitor(port, headless, needLogin);
    return await diggMonitor.start();
  }catch(error){
    log.error("runPlay error", error);
    return false;
  }
}

import { DyUser } from '@model/dy.entity';
import { BusinessGroup, BusinessType } from '@model/business.entity';
import { getEngineLegacy as getEngineLegacy, getEngine, hasEngine } from '../manager';
import { guardAssignConfigs, initAssignConfigs } from '../store/sys.store';
import { get } from 'http';
import { getAbsMonitor, TaskResult } from '../monitor/digg/monitor.manager';


export async function runPalyByPort() {
  log.info("runPalyByPort start");
  // await runPlayWithNoCk();
  // await runPlayWithCk();
}



export async function runPlayWithNoCk() {
  const playTaskManager = getPlayTaskManager(BusinessType.MI_PLAY_NO_CK);
  for(let i = 0; i < 3; i++){
    const uid = getNoCkPort(i);
    const port = uid;
    await runPlay(port, true, false);
    const dyUser = new DyUser(port, "", true, "");
    dyUser.uid = uid;
    dyUser.secUid = uid;
    setDyUser(BusinessGroup.DY, port, dyUser);
    addNoCkInstance(new PortInstance(port, uid, new Date().toISOString(), "running", 0, 0));
    const resourceAccount : ResourceAccount = {
      id : port,
      isActive : true,
      groupCode : BusinessGroup.DY,
      type : "ak",
      port : port,
      dyUser : dyUser,
      cacheTasks : new Map<string, Map<string, TaskResponse | null>>(),
      taskType : BusinessType.MI_PLAY_NO_CK
    };
    playTaskManager?.addResource(resourceAccount);
    log.info("MI_PLAY add resource account ", resourceAccount);
  }
}

export async function runPlayWithCk() {
  const instanceData = await getAllInstances(BusinessGroup.DY);
  const playTaskManager = getPlayTaskManager(BusinessType.MI_PLAY, 1);
  for(const instance of instanceData){
    const isSuccess = await runPlayWithCkInstance(instance.port, playTaskManager);
    if(!isSuccess){
       continue;
    }
    return true;
  }
  return true;
}

async function runPlayWithCkInstance(port : string, playTaskManager : PlayTaskManager) { 
  const dyUser = getDyUser(BusinessGroup.DY, port);
  if(!dyUser){
    return false;
  }
  if(!dyUser.isLogin){
    return false;
  } 
  const isLogin = await runPlay(port, false, true);
  if(!isLogin){
    log.error(port, " isLogin is false");
    return false;
  }
  const resourceAccount : ResourceAccount = {
    id : port,
    isActive : true,
    groupCode : BusinessGroup.DY,
    type : "ak",
    port : port,
    dyUser : dyUser,
    cacheTasks : new Map<string, Map<string, TaskResponse | null>>(),
    taskType : BusinessType.MI_PLAY_NO_CK
  };
  playTaskManager.addResource(resourceAccount);
  return true;
}