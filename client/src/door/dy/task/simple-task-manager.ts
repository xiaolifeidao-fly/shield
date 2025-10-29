import { EventEmitter } from 'events';
import { ResourcePool } from './resource-pool';
import { MessageQueue } from './queue';
import {
  TaskManagerConfig,
  ResourceAccount,
  SystemStatus,
  QueueMessage,
  ActionResult,
  ProcessResult,
  ResourceType
} from './interfaces';
import log from 'electron-log';
import { getPlatformUserByApiKey, TaskHandler } from '@src/door/handler/task.handler';
import { TaskEntity, TaskResponse, TaskType } from '@model/task.entity';
import { AkTaskHandler } from '@src/door/handler/ak.task.handler';
import { XmTaskHandler } from '@src/door/handler/xm.task.handler';
import { getConsecutiveFailures, getDyUser, getDyUserStatistic, getDyUserTodayStatistic, getDyUserTodayStatisticByDate, getPlatformManger, getPlatformScale, getPlatformTypes, getPlatformUserByPort, getPlatformUserStatistic, increaseConsecutiveFailures, PlatformUser, resetConsecutiveFailures, setDyUser, setDyUserStatistic, setDyUserTodayStatistic, setPlatformUserStatistic } from '../store/dy.store';
import { sleep } from '@utils/index';
import { getWatchWait, PlatformConfigApiImpl } from '@src/impl/door/platform.api.impl';
import { getPortTaskTypeChoose, setStatusByPort } from '../store/port.store';
import { SycTaskHandler } from '@src/door/handler/syc.task.handler';
import { ShTaskHandler } from '@src/door/handler/sh.task.handler';
import { GuardConfigApiImpl } from '@src/impl/door/guard.config.api.impl';

import { GuardConfig, GuardCondition } from '@eleapi/door/guard.config.api';
import { DyUser } from '@model/dy.entity';
import { getPlayMonitor } from '../monitor/play/monitor';
import { NmTaskHandler } from '@src/door/handler/nm.task.handler';
import { getAbsMonitor, TaskResult } from '../monitor/digg/monitor.manager';



function getTaskHandler(type: string): TaskHandler | null {
  if (type == ResourceType.ak) {
    return new AkTaskHandler();
  }
  if (type == ResourceType.xm) {
    return new XmTaskHandler();
  }
  if (type == ResourceType.syc) {
    return new SycTaskHandler();
  }
  if(type == ResourceType.sh){
    return new ShTaskHandler();
  }
  if(type == ResourceType.nm){
    return new NmTaskHandler();
  }
  return null;
}

/**
 * 简化版任务管理器 - 不使用Worker Threads
 * 适用于解决Worker文件路径问题的场景
 */
const platformConfigApiImpl = new PlatformConfigApiImpl();
export class SimpleTaskManager extends EventEmitter {
  private config: TaskManagerConfig;
  private resourcePool: ResourcePool;
  private messageQueue: MessageQueue;
  private isRunning: boolean = false;
  private producers: SimpleProducer[] = [];
  private consumers: SimpleConsumer[] = [];

  constructor(config: TaskManagerConfig) {
    super();
    this.config = config;
    this.resourcePool = new ResourcePool();
    this.messageQueue = new MessageQueue(config.queueMaxSize);
    
    this.setupResourcePoolListeners();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      log.info('🚀 启动简化版任务管理器...');
      
      this.initializeProducers();
      this.initializeConsumers();
      
      this.redistributeResources();
      
      await this.startAllWorkers();
      
      this.isRunning = true;
      this.emit('started');
      log.info('✅ 简化版任务管理器启动成功');
    } catch (error) {
      log.error('❌ 简化版任务管理器启动失败:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      log.info('🛑 停止简化版任务管理器...');
      await this.stopAllWorkers();
      
      this.isRunning = false;
      this.emit('stopped');
      log.info('✅ 简化版任务管理器已停止');
    } catch (error) {
      log.error('❌ 停止简化版任务管理器失败:', error);
      throw error;
    }
  }

  addResource(resource: ResourceAccount): void {
    this.resourcePool.addResource(resource);
  }

  addResources(resources: ResourceAccount[]): void {
    resources.forEach(resource => {
      this.resourcePool.addResource(resource);
    });
  }

  removeResource(resourceId: string): void {
    log.info("removeResource ", resourceId);
    this.resourcePool.removeResource(resourceId);
    // this.redistributeResources();
  }

  sleepToTomorrow(groupCode: string, port: string, dyUser: DyUser, taskType: string): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    let sleepTimes = dyUser.sleepTimes;
    if(sleepTimes){
      sleepTimes[taskType] =  tomorrow.getTime();
    }else{
      sleepTimes = {};
      sleepTimes[taskType] = tomorrow.getTime();
    }
    dyUser.sleepTimes = sleepTimes;
    let sleepFlags = dyUser.sleepFlags;
    if(sleepFlags){
      sleepFlags[taskType] = true;
    }else{
      sleepFlags = {};
      sleepFlags[taskType] = true;
    }
    dyUser.sleepFlags = sleepFlags;
    let sleepReasons = dyUser.sleepReasons;
    if(sleepReasons){
      sleepReasons[taskType] = taskType + "当日已到上限," + taskType + "动作已休眠";
    }else{
      sleepReasons = {};
      sleepReasons[taskType] = taskType + "当日已到上限," + taskType + "动作已休眠";
    }
    dyUser.sleepReasons = sleepReasons;
    setDyUser(groupCode, port, dyUser);
  }

  public async doActionCallback(groupCode : string, taskResponse: TaskResponse, data: {[key: string]: any}, taskResult: TaskResult): Promise<void> {
    const taskHandler = getTaskHandler(taskResponse.type);
    if (!taskHandler) {
      return;
    }
    const dyUser = getDyUser(groupCode, taskResponse.port);
    if(!dyUser){
      return;
    }
    const taskType = taskResponse.taskType;
    if (taskResult == TaskResult.SUCCESS) {
      dyUser.isLock = false;
      setDyUser(groupCode, taskResponse.port, dyUser);
      await this.statistic(taskResponse, true);
      if(taskResponse.apiKey != taskResponse.oriApiKey){
        log.info("taskResponse.apiKey != taskResponse.oriApiKey by ", taskResponse.port);
      }
      log.info(taskResponse.taskType, " success ", taskResponse.videoId , " 5s with uid ", taskResponse.uid, " from ", taskResponse.type);
      await taskHandler.doSubmit(taskResponse.apiKey, taskResponse);
      log.info(taskResponse.taskType, "submit success ", taskResponse.videoId , " 5s with uid ", taskResponse.uid, " from ", taskResponse.type);
      resetConsecutiveFailures(taskResponse.port, taskType);
      return;
    }
    await this.statistic(taskResponse, false);
    if(taskResult == TaskResult.LOGIN_EXPIRED){
      log.info("digg fail ", taskResponse.uid, " login expired ", taskResponse.type, " data is ", data);
      const dyUser = getDyUser(groupCode, taskResponse.port);
      if(dyUser){
        dyUser.isLogin = false;
        setDyUser(groupCode, taskResponse.port, dyUser);
        log.info("login expired ", taskResponse.port, " dyUser is ", dyUser);
        this.resourcePool.removeResource(taskResponse.port);
      }
    }
    if(taskResult == TaskResult.LOCK){
      log.info("digg fail ", taskResponse.uid, " lock ", taskResponse.type, " data is ", data);
      const sleepTime = 1000 * 60 * 60 * 24 * 3 + 10000;
      if(taskType == TaskType.DIGG){
        dyUser.sleepTime = Date.now() + sleepTime;
        dyUser.sleepFlag = true;
      }else{
        let sleepTimes = dyUser.sleepTimes;
        if(sleepTimes){
          sleepTimes[taskType] = Date.now() + sleepTime;
        }else{
          sleepTimes = {};
          sleepTimes[taskType] = Date.now() + sleepTime;
        }
        dyUser.sleepTimes = sleepTimes;
        let sleepFlags = dyUser.sleepFlags;
        if(sleepFlags){
          sleepFlags[taskType] = true;
        }else{
          sleepFlags = {};
          sleepFlags[taskType] = true;
        }
        dyUser.sleepFlags = sleepFlags;
      }
      log.info("user lock ", taskResponse.port, " dyUser is ", dyUser, " sleepTime is ", sleepTime, " taskType is ", taskType);
      setDyUser(groupCode, taskResponse.port, dyUser);
    }
    if(taskResult == TaskResult.SLEEP){
      const loveFastRule = await this.getLoveFastRule(taskResponse);
      if(loveFastRule){
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        if(taskType == TaskType.DIGG){
          dyUser.sleepTime = tomorrow.getTime();
          dyUser.sleepFlag = true;
          dyUser.sleepReason = "当日达到上限，点赞进行休眠中";
        }else{
          let sleepTimes = dyUser.sleepTimes;
          if(sleepTimes){
            sleepTimes[taskType] =  tomorrow.getTime();
          }else{
            sleepTimes = {};
            sleepTimes[taskType] = tomorrow.getTime();
          }
          dyUser.sleepTimes = sleepTimes;
          let sleepFlags = dyUser.sleepFlags;
          if(sleepFlags){
            sleepFlags[taskType] = true;
          }else{
            sleepFlags = {};
            sleepFlags[taskType] = true;
          }
          dyUser.sleepFlags = sleepFlags;
          let sleepReasons = dyUser.sleepReasons;
          if(sleepReasons){
            sleepReasons[taskType] = taskType + "当日达到上限，" + taskType + "动作已休眠";
          }else{
            sleepReasons = {};
            sleepReasons[taskType] = taskType + "当日达到上限，" + taskType + "动作已休眠";
          }
          dyUser.sleepReasons = sleepReasons;
        }
        log.info("user sleep ", taskResponse.port, " dyUser is ", dyUser, " sleepTime is ", tomorrow.getTime(), " taskType is ", taskType);
        setDyUser(groupCode, taskResponse.port, dyUser);
        return;
      }
      this.sleepToTomorrow(groupCode,taskResponse.port, dyUser, taskType);
    }
    log.info("digg fail ", taskResponse.videoId , " 5s with uid ", taskResponse.uid, " from ", taskResponse.type, " data is ", data);
  }

  private async getLoveFastRule(taskResponse: TaskResponse): Promise<GuardCondition | null> {
    const guardConfigApiImpl = new GuardConfigApiImpl();
    const guardConfig = await guardConfigApiImpl.getGuardConfig(taskResponse.taskType);
    if(!guardConfig){
      return null;
    }
    if(!guardConfig.enabled){
      return null;
    }
    for(const condition of guardConfig.conditions){
      if(condition.enabled && condition.id == "like_too_fast"){
        return condition;
      }
    }
    return null;
  }

  private async statistic(taskResponse: TaskResponse, result: boolean): Promise<void> {
    try{
      const date = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
      const taskType = taskResponse.taskType;
      const dyUserStatistic = getDyUserStatistic(taskResponse.port, taskType);
      const dyUserTodayStatistic = getDyUserTodayStatisticByDate(taskResponse.port, date, taskType);
      log.info("dyUserTodayStatistic by ", date, " dyUserStatistic is ", dyUserTodayStatistic);
      dyUserStatistic.totalTaskNum++;
      dyUserTodayStatistic.totalTaskNum++;
      let platformUser = getPlatformUserByApiKey(taskResponse.type, taskResponse.oriApiKey);
      if(result){
        if(platformUser){
          let statistic = getPlatformUserStatistic(platformUser.username, taskResponse.type, taskResponse.port, taskType);
          statistic++;
          log.info("statistic ", platformUser.username, " ", taskResponse.type, " ", taskResponse.port, " ", statistic);
          setPlatformUserStatistic(platformUser.username, taskResponse.type, taskResponse.port, taskType, statistic);
          if(taskResponse.oriApiKey == taskResponse.apiKey){
              dyUserTodayStatistic.totalLoveNum++;
              dyUserStatistic.totalLoveNum++; 
          }  
        }
        if(!dyUserTodayStatistic.totalRealLoveNum){
          dyUserTodayStatistic.totalRealLoveNum = 1;
        }else{
          dyUserTodayStatistic.totalRealLoveNum++;
        }
      }else{
        increaseConsecutiveFailures(taskResponse.port, taskType);
        if(platformUser){
          let statistic = getPlatformUserStatistic(platformUser.username, taskResponse.type, taskResponse.port, taskType);
          statistic++;
          log.info("statistic ", platformUser.username, " ", taskResponse.type, " ", taskResponse.port, " ", statistic);
          setPlatformUserStatistic(platformUser.username, taskResponse.type, taskResponse.port, taskType, statistic);
          if(taskResponse.oriApiKey == taskResponse.apiKey){
              dyUserTodayStatistic.totalErrorNum++;
              dyUserStatistic.totalErrorNum++;
          }  
        }
      }

      setDyUserTodayStatistic(taskResponse.port, dyUserTodayStatistic, date, taskType);
      setDyUserStatistic(taskResponse.port, taskType, dyUserStatistic);
    }catch(error){
      log.error("statistic error ", error);
    }
  }

  getSystemStatus(): SystemStatus {
    return {
      producers: this.producers.map(p => ({
        id: p.getId(),
        status: p.isRunning ? 'running' as const : 'stopped' as const,
        resourceCount: p.getResourceCount(),
        lastAction: undefined
      })),
      consumers: this.consumers.map(c => ({
        id: c.getId(),
        status: c.isRunning ? 'running' as const : 'stopped' as const,
        processedCount: c.getProcessedCount(),
        lastProcess: undefined
      })),
      queue: {
        size: this.messageQueue.size(),
        maxSize: this.config.queueMaxSize || 10000
      },
      resourcePool: this.resourcePool.getStats()
    };
  }

  getQueueStats() {
    return this.messageQueue.getStats();
  }

  getResourcePoolStats() {
    return this.resourcePool.getStats();
  }

  private setupResourcePoolListeners(): void {
    this.resourcePool.on('resource-added', (resource) => {
      this.emit('resource-added', resource);
      this.redistributeResources();
    });

    this.resourcePool.on('resource-removed', (resource) => {
      // this.emit('resource-removed', resource);
      this.removeResourceById(resource);
    });
  }

  private removeResourceById(resource: ResourceAccount): void {
    try{
      this.resourcePool.removeResource(resource.id);
      // 如果没有活跃资源，清空所有生产者
      this.producers.forEach(producer => {
        const resources = producer.getCurrentResources();
        if(resources.length > 0){
            const newResources = resources.filter(r => r.id !== resource.id);
            producer.updateResources(newResources);
            setStatusByPort(resource.port, "stopped");
          }
        });
    }catch(error){
      log.error("removeResourceById error ", error);
    }
  }

  private initializeProducers(): void {
    for (let i = 0; i < this.config.producerCount; i++) {
      const producerId = `simple-producer-${i + 1}`;
      const producer = new SimpleProducer(producerId, this.messageQueue, this.resourcePool);
      this.producers.push(producer);
    }
  }

  private initializeConsumers(): void {
    for (let i = 0; i < this.config.consumerCount; i++) {
      const consumerId = `simple-consumer-${i + 1}`;
      const consumer = new SimpleConsumer(consumerId, this.messageQueue, this.resourcePool);
      this.consumers.push(consumer);
    }
  }

  private async startAllWorkers(): Promise<void> {
    const promises = [
      ...this.producers.map(p => p.start()),
      ...this.consumers.map(c => c.start())
    ];
    await Promise.all(promises);
  }

  private async stopAllWorkers(): Promise<void> {
    const promises = [
      ...this.producers.map(p => p.stop()),
      ...this.consumers.map(c => c.stop())
    ];
    await Promise.all(promises);
  }

  private redistributeResources(): void {
    const activeResources = this.resourcePool.getActiveResources();

    if (activeResources.length === 0 || this.producers.length === 0) {
      // 如果没有活跃资源，清空所有生产者
      this.producers.forEach(producer => {
        producer.updateResources([]);
      });
      return;
    }

    // 获取当前每个生产者的资源分配情况
    const currentDistribution = new Map<string, ResourceAccount[]>();
    this.producers.forEach(producer => {
      currentDistribution.set(producer.getId(), producer.getCurrentResources());
    });

    // 计算理想的平均分配
    const idealResourcesPerProducer = Math.floor(activeResources.length / this.producers.length);
    const remainder = activeResources.length % this.producers.length;

    // 创建活跃资源的映射，便于查找
    const activeResourcesMap = new Map<string, ResourceAccount>();
    activeResources.forEach(resource => {
      activeResourcesMap.set(resource.id, resource);
    });

    // 收集所有当前分配的资源，移除无效的资源
    const allCurrentResources: ResourceAccount[] = [];
    const validCurrentDistribution = new Map<string, ResourceAccount[]>();
    
    this.producers.forEach(producer => {
      const currentResources = producer.getCurrentResources();
      const validResources = currentResources.filter((resource: ResourceAccount) => 
        activeResourcesMap.has(resource.id)
      );
      validCurrentDistribution.set(producer.getId(), validResources);
      allCurrentResources.push(...validResources);
    });

    // 找出新增的资源（在activeResources中但不在当前分配中）
    const currentResourceIds = new Set(allCurrentResources.map(r => r.id));
    const newResources = activeResources.filter((resource: ResourceAccount) => 
      !currentResourceIds.has(resource.id)
    );

    // 计算每个生产者应有的资源数量
    const targetCounts = this.producers.map((_, index) => 
      idealResourcesPerProducer + (index < remainder ? 1 : 0)
    );

    // 准备新的分配结果
    const newDistribution = new Map<string, ResourceAccount[]>();
    this.producers.forEach((producer, index) => {
      newDistribution.set(producer.getId(), [...(validCurrentDistribution.get(producer.getId()) || [])]);
    });

    // 处理资源过多的生产者，移动多余资源到池中
    const excessResources: ResourceAccount[] = [];
    this.producers.forEach((producer, index) => {
      const producerId = producer.getId();
      const currentResources = newDistribution.get(producerId) || [];
      const targetCount = targetCounts[index];
      
      if (currentResources.length > targetCount) {
        const excess = currentResources.splice(targetCount);
        excessResources.push(...excess);
      }
    });

    // 将新增资源和多余资源合并到待分配池
    const resourcesToDistribute = [...newResources, ...excessResources];

    // 按生产者当前资源数量排序，优先给资源少的分配
    const producersSorted = this.producers
      .map((producer, index) => ({
        producer,
        index,
        currentCount: (newDistribution.get(producer.getId()) || []).length,
        targetCount: targetCounts[index]
      }))
      .sort((a, b) => a.currentCount - b.currentCount);

    // 分配待分配的资源
    let resourceIndex = 0;
    while (resourceIndex < resourcesToDistribute.length) {
      for (const { producer, currentCount, targetCount } of producersSorted) {
        if (resourceIndex >= resourcesToDistribute.length) break;
        
        const producerId = producer.getId();
        const currentResources = newDistribution.get(producerId) || [];
        
        if (currentResources.length < targetCount) {
          currentResources.push(resourcesToDistribute[resourceIndex]);
          resourceIndex++;
        }
      }
    }

    // 应用新的分配结果
    this.producers.forEach(producer => {
      const newResources = newDistribution.get(producer.getId()) || [];
      producer.updateResources(newResources);
      log.info(`Producer ${producer.getId()} updated with ${newResources.length} resources`);
    });
  }
}

class SimpleProducer {
  private id: string;
  private queue: MessageQueue;
  public isRunning: boolean = false;
  private timers?: NodeJS.Timeout[] = [];
  private resources: ResourceAccount[] = [];
  private currentResourceIndex: number = 0;
  private resourcePool: ResourcePool;

  constructor(id: string, queue: MessageQueue, resourcePool: ResourcePool) {
    this.id = id;
    this.queue = queue;
    this.resourcePool = resourcePool;
    this.timers = [];
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleAction();
    log.info(`${this.id} started`);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timers) {
      for(const timer of this.timers){
        clearTimeout(timer);
      }
    }
    log.info(`${this.id} stopped`);
  }

  updateResources(resources: ResourceAccount[]): void {
    this.resources = resources;
    this.currentResourceIndex = 0;
  }

  getCurrentResources(): ResourceAccount[] {
    return this.resources;
  }

  getResourceCount(): number {
    return this.resources.length;
  }

  getId(): string {
    return this.id;
  }

  private scheduleAction(): void {
    if (!this.isRunning) return;
    this.timers = [];

    const platformTypes = getPlatformTypes();
    for(const platformType of platformTypes){
      this.timers.push(this.scheduleActionByType(platformType));
    }
  }

  private scheduleActionByType(platformType: string): NodeJS.Timeout {
    return setTimeout(async () => {
      if (this.isRunning) {
        const platformUser = await this.getPlatformUsersByType(platformType);
        if(platformUser){
          if(platformUser.type == ResourceType.ak){
            await this.executeAction(platformUser, 7, true);
          }else{
            await this.executeAction(platformUser);
          }
        }
        this.scheduleActionByType(platformType);
      }
    }, 1000)
  }


  needForceGetByAk(resource: ResourceAccount, taskType: string) : boolean {
    const todayStatistic = getDyUserTodayStatistic(resource.port, taskType);
    const scale = getPlatformScale(ResourceType.ak);
    if(!scale || scale <= 0){
      return false;
    }
    if(todayStatistic.totalRealLoveNum % (1/scale) == 0 && todayStatistic.totalRealLoveNum > 0){
      return true;
    }
    return false;
  }

  private async getTaskResponse(platformUser: PlatformUser, resource: ResourceAccount, mustWait: boolean, taskType: string, retry = 3) : Promise<{taskResponse: TaskResponse | null, sleepTime: number}> {
    const guardConfigApiImpl = new GuardConfigApiImpl();
    const guardConfig = await guardConfigApiImpl.getGuardConfig(taskType);

    let taskResponse = resource.cacheTasks.get(platformUser.type)?.get(taskType);
    if(taskResponse){
      return {taskResponse: taskResponse, sleepTime: 0};
    }
    if(guardConfig && guardConfig.enabled){
      const isAllow = await this.validateRule(guardConfig, resource, taskType);
      if(!isAllow.result){
        return {taskResponse: null, sleepTime: isAllow.sleepTime};
      }
    }
    taskResponse = await this.doCustomAction(platformUser, resource, taskType, mustWait, retry);
    if(taskResponse){
      return {taskResponse: taskResponse, sleepTime: 0};
    }
    return {taskResponse: null, sleepTime: 0};
  }

  private async getTask(platformUser: PlatformUser, resource: ResourceAccount, mustWait: boolean = true, taskType: string, retry = 3){
   
    return await this.getTaskResponse(platformUser, resource, mustWait, taskType, retry);
  }

  private async getTaskFromCache(resource: ResourceAccount): Promise<TaskResponse | null> {
    const cacheTasks = resource.cacheTasks;
    const taskTypes = Array.from(cacheTasks.keys());
    const taskArr : TaskResponse[] = [];
    for(const taskType of taskTypes){
      const taskMap = cacheTasks.get(taskType);
      if(taskMap){
        for(const task of taskMap.values()){
          if(task){
            taskArr.push(task);
          }
        }
      }
    }
    if(taskArr.length == 0){
      log.info("getTaskFromCache taskArr is empty");
      return null;
    }

    taskArr.sort((taskA, taskB) => {
      //task不为空 优先排到最前面
      if(taskA && !taskB){
        return -1;
      }
      if(!taskA && taskB){
        return 1;
      }
      if(taskA && taskB){
        return taskA.taskTime - taskB.taskTime;
      }
      return 0;
    });
    const taskResponse = taskArr[0];
    if(taskResponse){
      for(const task of taskArr){
        log.info("task time is ", task.taskTime, " type is ", task.type, " taskType is ", task.taskType);
      }
      log.info("executeAction getTaskFromCache size is ", taskArr.length, " taskResponse is ", taskResponse);
    }
    const cacheTaskMap = resource.cacheTasks.get(taskResponse.type);
    if(cacheTaskMap){
      cacheTaskMap.set(taskResponse.taskType, null);
    }
    return taskResponse;
  }

  private async executeAction(platformUser: PlatformUser, retry = 3, isMain = false): Promise<void> {
    try {
      const resource = await this.selectResource(platformUser, retry, isMain);
      if (resource && isMain) {
        let taskResponse = await this.getTaskFromCache(resource);
        if(!taskResponse){
          const businessList = await platformConfigApiImpl.getActiveBusiness();
          if(businessList.length == 0){
            return;
          }
          for(const business of businessList){
            if(!business.main){
              continue;
            }
            if(!business.chose){
               continue;
            }
            const taskChose = getPortTaskTypeChoose(resource.port, business.code);
            if(!taskChose){
              continue;
            }
            const taskType = business.code;
            const {taskResponse, sleepTime} = await this.getTask(platformUser, resource, true, taskType, retry);
            if(taskResponse){
              await this.doHandler(resource, taskResponse);
              return;
            }
          }
        }else{
          await this.doHandler(resource, taskResponse);
        }
      }
    } catch (error) {
      log.error(`${this.id} action failed:`, error);
    }
  }

  private async doHandler(resource: ResourceAccount, taskResponse: TaskResponse){
    if(!(taskResponse.taskType == TaskType.MI_PLAY || taskResponse.taskType == TaskType.MI_PLAY_NO_CK)){
        resource.isRunning = true;
        resource.lastUsed = Date.now();
    }
    const result: ActionResult = {
      success: true,
      data: taskResponse,
      resourceId: resource.id,
      timestamp: new Date()
    };
    this.queue.enqueue({
      data: result,
      priority: 1
    });
    return;
  }

  private async selectResource(platformUser: PlatformUser, retry = 3, isMain = false): Promise<ResourceAccount | null> {
    if (this.resources.length === 0) {
      await sleep(2000);
      return null;
    }

    const resource = this.resources[this.currentResourceIndex];
    this.currentResourceIndex = (this.currentResourceIndex + 1) % this.resources.length;
    
    // 检查资源是否仍在资源池中（防止资源已被移除但本地列表未更新）
    if (!this.resourcePool.getResource(resource.id)) {
      log.info("resource has been removed from pool", resource.id);
      // 立即从本地资源列表中移除已被删除的资源
      this.resources = this.resources.filter(r => r.id !== resource.id);
      this.currentResourceIndex = 0; // 重置索引
      return null;
    }
    if(!isMain){
      if(this.isEmptyCacheTask(resource, platformUser.type)){
        await this.cacheTask(platformUser, resource, retry);
        return resource;
      }
    }
    if(resource.isRunning){
      const isAllow = await this.isAllowDigg(platformUser, resource, retry);
      if(!isAllow){
        return null;
      }
      if(isMain){
        resource.isRunning = false;
      }
      return resource;
    }
    return resource;
  }

  private isEmptyCacheTask(resource: ResourceAccount, type : string): boolean {
    const cacheTaskMap = resource.cacheTasks.get(type);
    if(cacheTaskMap){
      for(const task of cacheTaskMap.values()){
        if(task){
          return false;
        }
      }
    }
    return true;
  }

  private async cacheTask(platformUser: PlatformUser, resource: ResourceAccount, retry = 3){
    const businessList = await platformConfigApiImpl.getActiveBusiness();
    if(businessList.length == 0){
      return;
    }
    let minSleepTime = 99999999999;
    let fetchTaskResponse = null;
    for(const business of businessList){
      if(!business.main){
        continue;
     }
      if(!business.chose){
         continue;
      }
      const taskChose = getPortTaskTypeChoose(resource.port, business.code);
      if(!taskChose){
        continue;
      }
      const {taskResponse, sleepTime} = await this.getTask(platformUser, resource, false, business.code, retry);
      
      if(taskResponse){
          const cacheTasks = resource.cacheTasks.get(platformUser.type);
          if(cacheTasks){
            cacheTasks.set(business.code, taskResponse);
          }
          fetchTaskResponse = taskResponse;
      }
      if(sleepTime <= minSleepTime){
        minSleepTime = sleepTime;
      }
    }
    if(!fetchTaskResponse && (minSleepTime > 0 && minSleepTime < 99999999999)){
      // log.info(platformUser.type , " cacheTask is null and minSleepTime is ", minSleepTime);
      await sleep(1000);
    }
  }

  private async isAllowDigg(platformUser: PlatformUser, resource: ResourceAccount, retry = 3): Promise<boolean> {
    const isWait = await this.isWait(resource);
    if(isWait){
      await this.cacheTask(platformUser, resource, retry);
      return false;
    }
    return true;
  }

  private async validateRule(guardConfig: GuardConfig, resource: ResourceAccount, taskType: string): Promise<{result: boolean, sleepTime: number}> {
    // if(taskType == TaskType.MI_PLAY_NO_CK || taskType == TaskType.MI_PLAY){
    //   return {result: true, sleepTime: 0};
    // }
    const dyUser : DyUser | null = getDyUser(resource.groupCode, resource.port);
    if(!dyUser){
       return {result: false, sleepTime: 0};
    }
    if(taskType == TaskType.DIGG && dyUser.sleepFlag){
      if(dyUser.sleepTime){
        const now = Date.now();
        if(now < dyUser.sleepTime){
          return {result: false, sleepTime: dyUser.sleepTime - now};
        }
        dyUser.sleepFlag = false;
        dyUser.sleepTime = 0;
        resetConsecutiveFailures(resource.port, taskType);
        setDyUser(resource.groupCode, resource.port, dyUser);
        return {result: true, sleepTime: 0};
      }
      return {result: false, sleepTime: 0};
    }
   const sleepFlags = dyUser.sleepFlags;
   if(sleepFlags){
      const sleepFlag = sleepFlags[taskType];
      if(sleepFlag){
        const now = Date.now();
        const sleepTimes = dyUser.sleepTimes;
        if(sleepTimes){
          const sleepTime = sleepTimes[taskType];
          if(sleepTime){
            if(now < sleepTime){
              return {result: false, sleepTime: sleepTime - now};
            }
            sleepFlags[taskType] = false;
            dyUser.sleepTimes = sleepTimes;
            setDyUser(resource.groupCode, resource.port, dyUser);
            resetConsecutiveFailures(resource.port, taskType);
            return {result: true, sleepTime: 0};
          }
        }
        return {result: false, sleepTime: 0};
      }
    }
    const conditions = guardConfig.conditions;
    for(const condition of conditions){
      if(condition.enabled){
        const id = condition.id;
        if(id == 'consecutive_failures'){
          const consecutiveFailures = getConsecutiveFailures(resource.port, taskType);
          log.info("resource is sleeping ", taskType, " consecutiveFailures is ", consecutiveFailures);
          if(consecutiveFailures > condition.params.failureThreshold){
              const sleepTime = Date.now() + condition.sleepDuration * 60 * 1000;
              if(taskType == TaskType.DIGG){
                dyUser.sleepTime = sleepTime;
                dyUser.sleepFlag = true;
                dyUser.sleepReason = "点赞连续失败超过" + condition.params.failureThreshold + "次,点赞动作已休眠";
                setDyUser(resource.groupCode, resource.port, dyUser);
              }else{
                let sleepTimes = dyUser.sleepTimes;
                if(sleepTimes){
                  sleepTimes[taskType] = sleepTime;
                }else{
                  sleepTimes = {};
                  sleepTimes[taskType] = sleepTime;
                }
                dyUser.sleepTimes = sleepTimes;
                let sleepFlags = dyUser.sleepFlags;
                if(sleepFlags){
                    sleepFlags[taskType] = true;
                }else{
                  sleepFlags = {};
                  sleepFlags[taskType] = true;
                }
                dyUser.sleepFlags = sleepFlags;
                let sleepReasons = dyUser.sleepReasons;
                if(sleepReasons){
                  sleepReasons[taskType] = taskType + "连续失败超过" + condition.params.failureThreshold + "次，" + taskType + "动作已休眠";
                }else{
                  sleepReasons = {};
                  sleepReasons[taskType] = taskType + "连续失败超过" + condition.params.failureThreshold + "次，" + taskType + "动作已休眠";
                }
                dyUser.sleepReasons = sleepReasons;
                setDyUser(resource.groupCode, resource.port, dyUser);
              }
            return {result: false, sleepTime: 0};
          }
        }
        if(id == "total_success_num"){
          const date = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
          const totalSuccessNum = getDyUserTodayStatisticByDate(resource.port, date, taskType);
          const maxNum = condition?.params?.maxNum || 99999999;
          if(totalSuccessNum && totalSuccessNum.totalLoveNum >= maxNum){
            //获取第二天的凌晨
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const sleepTime = tomorrow.getTime();
            if(taskType == TaskType.DIGG){
              dyUser.sleepTime = sleepTime;
              dyUser.sleepFlag = true;
              dyUser.sleepReason = taskType + "当天最高成功次数超过" + maxNum + "次，" + taskType + "动作已休眠";
              return {result: false, sleepTime: sleepTime - Date.now()};
            }
            if(dyUser?.sleepFlags){
              dyUser.sleepFlags[taskType] = true;
            }
            if(dyUser?.sleepTimes){
              dyUser.sleepTimes[taskType] = sleepTime;
            }
            if(dyUser?.sleepReasons){
              dyUser.sleepReasons[taskType] = taskType + "当天最高成功次数超过" + maxNum + "次，" + taskType + "动作已休眠";
            }
            setDyUser(resource.groupCode, resource.port, dyUser);
            return {result: false, sleepTime: sleepTime - Date.now()};
          }
        }
        // if(id == "like_too_fast"){
        //   if(dyUser?.sleepFlag){
        //     dyUser.sleepTime = Date.now() + condition.sleepDuration * 60 * 1000;
        //     dyUser.sleepFlag = true;
        //     setDyUser(resource.port, dyUser);
        //     return false;
        //   }
        // }
      }
      }
    return {result: true, sleepTime: 0};
  }

  private async isWait(resource: ResourceAccount): Promise<boolean> {
    const now = Date.now();
    const lastUsed = resource.lastUsed;
    if(lastUsed){
      const diff = now - lastUsed;
      if(diff < getWatchWait()){
       await sleep(100);
       log.info("resource is running", resource.id, " waited ",  diff, " ms");
       return true;
      }
    }
    return false;
  }

  private async getPlatformUsersByType(type: string) : Promise<PlatformUser|null> {
    const platformConfig = await platformConfigApiImpl.loadPlatformConfig();
    if(!platformConfig.success) {
      return null;
    }
    const platformUsers = platformConfig.data;
    for(const platformUser of platformUsers) {
      if(platformUser.enabled && platformUser.key == type) {
          return new PlatformUser(platformUser.key, platformUser.user, platformUser.pass, platformUser.key);
      }
    }
    return null;
  }


  private async getPlatformUsers() : Promise<PlatformUser[]> {
    const platformConfig = await platformConfigApiImpl.loadPlatformConfig();
    if(!platformConfig.success) {
      return [];
    }
    const platformUsers = platformConfig.data;
    const result : PlatformUser[] = [];
    for(const platformUser of platformUsers) {
      if(platformUser.enabled && platformUser.key == ResourceType.ak) {
        result.push(new PlatformUser(platformUser.key, platformUser.user, platformUser.pass, platformUser.key));
      }
    }

    for(const platformUser of platformUsers) {
      if(platformUser.enabled && platformUser.key != ResourceType.ak) {
        result.push(new PlatformUser(platformUser.key, platformUser.user, platformUser.pass, platformUser.key));
      }
    }
    return result;
  }

  private containeAk(platformUsers: PlatformUser[]) : boolean {
    for(const platformUser of platformUsers){
      if(platformUser.type == ResourceType.ak){
        return true;
      }
    }
    return false;
  }


  private async getSubmitNum(port : string, platform : PlatformUser, taskType: string): Promise<number> {
    return getPlatformUserStatistic(platform.username, platform.type, port, taskType);
  }

  private async getRealPlatformUser(port : string, platformUser : PlatformUser, needRealPlatformUser: boolean, taskType: string): Promise<PlatformUser> {
    if(!needRealPlatformUser){
      return platformUser;
    }
    const scale = getPlatformScale(platformUser.type);
    if(!scale || scale <= 0){
      return platformUser;
    }
    const submitNum = await this.getSubmitNum(port, platformUser, taskType);
    if(submitNum <= 0){
      return platformUser;
    }
    const num = 1 /scale;
    if(submitNum % num == 0){
      const platformManger = getPlatformManger(platformUser.type);
      if(platformManger){
        return platformManger;
      }
    }
    return platformUser;
  }

  private async getTaskResponseByPlatformUser(taskHandler: TaskHandler, platformUser: PlatformUser, resource: ResourceAccount, needRealPlatformUser: boolean, taskType: string): Promise<TaskResponse | null> {
    const realPlatformUser = await this.getRealPlatformUser(resource.port, platformUser, needRealPlatformUser, taskType);
    const apiKey = await taskHandler.getApiKey(realPlatformUser);
    if (!apiKey) {
        return null;
    }
    let oriApiKey : string | null = apiKey;
    if(realPlatformUser.username != platformUser.username){
        oriApiKey = await taskHandler.getApiKey(platformUser);
        if(!oriApiKey){
          return null;
        }
    }
    const dyUser = resource.dyUser;
    if(!dyUser){
      return null;
    }
    const taskEntity = new TaskEntity(apiKey, oriApiKey, dyUser.secUid, dyUser.uid);
    const task = await taskHandler.getTask(resource.port, taskEntity, taskType);
    if (!task) {
      return null;
    }
    // log.info("task is  ", task, " from ", realPlatformUser.type);
    return task;
  }

  private async doCustomActionByAk(resource: ResourceAccount, taskType : string): Promise<TaskResponse | null> {
    try {
      let retryCount = 5;
      const platformUser = getPlatformManger(ResourceType.ak);
      if(!platformUser){
        return null;
      }
      const taskHandler = getTaskHandler(platformUser.type);
      if (!taskHandler) {
        return null;
      }
      if(!taskHandler.allowGetTask(taskType)){
        return null;
      }
      while(retryCount > 0){
        const taskResponse = await this.getTaskResponseByPlatformUser(taskHandler, platformUser, resource, false, taskType);
        if(taskResponse){
          return taskResponse;
        }
        await sleep(100);
        retryCount--;
      }
      return null;
    } catch (error) {
      log.error(`Custom action failed for resource ${resource.id}:`, error);
      return null;
    }
  }

  /**
   * 🎯 自定义业务逻辑 - 生产任务
   */
  private async doCustomAction(platformUser: PlatformUser, resource: ResourceAccount, taskType: string, mustWait: boolean = true, retry = 3): Promise<TaskResponse | null> {
    try {
      const taskHandler = getTaskHandler(platformUser.type);
      if (!taskHandler) {
        log.info("taskHandler is null ", taskType, " from ", platformUser.type);
        return null;
      }
      if(!taskHandler.allowGetTask(taskType)){
        return null;
      }
      while(retry > 0){
          const taskResponse = await this.getTaskResponseByPlatformUser(taskHandler, platformUser, resource, true, taskType);
          if(taskResponse){
            taskResponse.username = platformUser.username;
            return taskResponse;
          }
          // if(!mustWait){
          //   const isWait = await this.isWait(resource);
          //   if(!isWait){
          //     return null;
          //   }
          // }
          await sleep(100);
          retry--;
      }
      return null;
    } catch (error) {
      log.error(`Custom action failed for resource ${resource.id}:`, error);
      return null;
    }
  }
}

class SimpleConsumer {
  private id: string;
  private queue: MessageQueue;
  private resourcePool: ResourcePool;
  public isRunning: boolean = false;
  private timer?: NodeJS.Timeout;
  private processedCount: number = 0;

  constructor(id: string, queue: MessageQueue, resourcePool: ResourcePool) {
    this.id = id;
    this.queue = queue;
    this.resourcePool = resourcePool;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleProcess();
    log.info(`${this.id} started`);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    log.info(`${this.id} stopped`);
  }

  getProcessedCount(): number {
    return this.processedCount;
  }

  getId(): string {
    return this.id;
  }

  private scheduleProcess(): void {
    if (!this.isRunning) return;

    this.timer = setTimeout(async () => {
      if (this.isRunning) {
        await this.processMessages();
        this.scheduleProcess();
      }
    }, 3000);
  }

  private async processMessages(): Promise<void> {
    try {
      const messages = this.queue.dequeueBatch(5);
      if (messages.length > 0) {
        await this.processCustomMessageBatch(messages);
        this.processedCount += messages.length;
      }
    } catch (error) {
      log.error(`${this.id} process failed:`, error);
    }
  }

  /**
   * 🎯 自定义消息处理逻辑 - 批量处理
   */
  private async processCustomMessageBatch(messages: QueueMessage[]): Promise<ProcessResult> {
    let successCount = 0;
    let errors: string[] = [];

    log.info(`\n🏪 ${this.id} 开始处理 ${messages.length} 条消息`);

    for (const message of messages) {
      try {
        const success = await this.processCustomMessage(message);
        if (success) {
          successCount++;
        } else {
          errors.push(`Failed to process message ${message.id}`);
        }
      } catch (error) {
        errors.push(`Error processing message ${message.id}: ${error}`);
      }
    }

    // log.info(`${this.id} processed ${successCount}/${messages.length} messages successfully`);

    return {
      success: errors.length === 0,
      processedCount: successCount,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      timestamp: new Date()
    };
  }

  /**
   * 🎯 自定义单个消息处理逻辑
   */
  private async processCustomMessage(message: QueueMessage): Promise<boolean> {
    const actionResult = message.data as ActionResult;
    try {
      if (!actionResult.success || !actionResult.data || !actionResult.resourceId) {
        return false;
      }
      const resource = this.resourcePool.getResource(actionResult.resourceId);
      if(!resource){
        return false;
      }
      const taskResponse = actionResult.data as TaskResponse;
      log.info(`  📝 start digg ${taskResponse.videoId} with uid ${taskResponse.uid} from ${taskResponse.type}`);
      await this.doDigg(taskResponse, resource.groupCode);
      return true;

    } catch (error) {
      log.error(`  ❌ 消息 ${message.id} 处理失败:`, error);
      return false;
    }finally{
      log.info("resource is done ", actionResult.resourceId);
      if(!actionResult.resourceId){
        return false;
      }
      const resource = this.resourcePool.getResource(actionResult.resourceId);
      if(!resource){
        return false;
      }
    }
  }

  private async doDigg(taskResponse: TaskResponse, groupCode: string): Promise<void> {
    try {
      const diggMonitor = getAbsMonitor(groupCode, taskResponse.port, false);
      if(!diggMonitor){
        return;
      }
      await diggMonitor.actionClick(taskResponse);
    }catch(error){
      log.error("doDigg error", error);
      this.resourcePool.removeResource(taskResponse.port);
    }
  }


} 
