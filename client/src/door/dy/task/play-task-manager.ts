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
import { setStatusByPort } from '../store/port.store';
import { SycTaskHandler } from '@src/door/handler/syc.task.handler';
import { ShTaskHandler } from '@src/door/handler/sh.task.handler';
import { getDiggMonitor } from '../monitor/digg/monitor';
import { GuardConfigApiImpl } from '@src/impl/door/guard.config.api.impl';

import { GuardConfig, GuardCondition } from '@eleapi/door/guard.config.api';
import { DyUser } from '@model/dy.entity';
import { Business, BusinessType } from '@model/business.entity';
import { getPlayMonitor } from '../monitor/play/monitor';
import { createTaskManagerConfig } from '.';

/**
 * 简化版任务管理器 - 不使用Worker Threads
 * 适用于解决Worker文件路径问题的场景
 */
const platformConfigApiImpl = new PlatformConfigApiImpl();

const taskManager :Map<string, PlayTaskManager> = new Map<string, PlayTaskManager>();

export function getPlayTaskManager(taskType : string, consumerNum : number = 1): PlayTaskManager {
  if(!taskManager.has(taskType)){
    const config = createTaskManagerConfig(
      consumerNum, // 2个自定义生产者
      1, // 2个自定义消费者
      {
        queueMaxSize: 5000,
        resourceDistributionStrategy: 'even'
      }
    );
  
    // 2. 创建任务管理器 - 根据配置选择版本
    log.info("使用简化版任务管理器（不依赖Worker Threads）");
    const playTaskManager = new PlayTaskManager(config);
    
    try {
      playTaskManager.start();
    } catch (error) {
      log.error("taskManager start error", error);
    }
    taskManager.set(taskType, playTaskManager);
  }
  return taskManager.get(taskType)!;
}


export class PlayTaskManager extends EventEmitter {
  private config: TaskManagerConfig;
  public resourcePool: ResourcePool;
  private messageQueue: MessageQueue;
  private isRunning: boolean = false;
  private producers: SimpleProducer[] = [];

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

  hasResource(resourceId: string): boolean {
    return this.resourcePool.getResource(resourceId) !== undefined;
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

  private async getTaskHandler(type: string): Promise<TaskHandler | null> {
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
    return null;
  }

  public async doActionCallback(taskResponse: TaskResponse, data: {[key: string]: any}, successNum: number): Promise<void> {
    const taskHandler = await this.getTaskHandler(taskResponse.type);
    if (!taskHandler) {
      return;
    }
    const resourceAccount = this.resourcePool.getResource(taskResponse.port);
    if(!resourceAccount){
      return;
    }

    resourceAccount.isRunning = false;
    await this.statistic(taskResponse, successNum);
    await taskHandler.doSubmit(taskResponse.apiKey, taskResponse);
  }

  private async statistic(taskResponse: TaskResponse, successNum: number): Promise<void> {
    try{
      const date = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
      const taskType = taskResponse.taskType;
      const dyUserStatistic = getDyUserStatistic(taskResponse.port, taskType);
      const dyUserTodayStatistic = getDyUserTodayStatisticByDate(taskResponse.port, date, taskType);
      log.info("dyUserTodayStatistic by ", date, " dyUserStatistic is ", dyUserTodayStatistic);
      dyUserStatistic.totalTaskNum += successNum;
      dyUserTodayStatistic.totalTaskNum += successNum;
      dyUserTodayStatistic.totalLoveNum += successNum ;
      dyUserStatistic.totalLoveNum += successNum; 
      const errorNum = taskResponse.totalNum - successNum;
      dyUserTodayStatistic.totalErrorNum += errorNum;
      dyUserStatistic.totalErrorNum += errorNum;
      setDyUserTodayStatistic(taskResponse.port, dyUserTodayStatistic, date, taskType);
      setDyUserStatistic(taskResponse.port, taskType, dyUserStatistic);
    }catch(error){
      log.error("statistic error ", error);
    }
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

  private async startAllWorkers(): Promise<void> {
    const promises = [
      ...this.producers.map(p => p.start()),
    ];
    await Promise.all(promises);
  }

  private async stopAllWorkers(): Promise<void> {
    const promises = [
      ...this.producers.map(p => p.stop()),
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
    this.scheduleActionByType();
  }

  private scheduleActionByType(): NodeJS.Timeout {
    return setTimeout(async () => {
      if (this.isRunning) {
        const platformUser =  new PlatformUser("ak", "guanli", "guanli_123456", "ak");
        await this.executeAction(platformUser, 5);
        this.scheduleActionByType();
      }
    }, 1000)
  }


  private async getTaskResponse(platformUser: PlatformUser, resource: ResourceAccount, mustWait: boolean, taskType: string, retry = 3) : Promise<TaskResponse | null> {
    return await this.doCustomAction(platformUser, resource, taskType, mustWait, retry);
  }

  private async getTask(platformUser: PlatformUser, resource: ResourceAccount, mustWait: boolean = true, taskType: string, retry = 3){
   
    return await this.getTaskResponse(platformUser, resource, mustWait, taskType, retry);
  }



  private async executeAction(platformUser: PlatformUser, retry = 3): Promise<void> {
    try {
      const resource = await this.selectResource(platformUser, retry);
      if (resource) {
          const taskType = resource.taskType;
          if(!taskType){
            return;
          }
          const taskResponse = await this.getTask(platformUser, resource, true, taskType as string, retry);
          if(taskResponse){
              resource.isRunning = true;
              resource.lastUsed = Date.now();
              await this.doHandler(resource, taskResponse);
              return;
          }
      }
    } catch (error) {
      log.error(`${this.id} action failed:`, error);
    }
  }

  private async doHandler(resource: ResourceAccount, taskResponse: TaskResponse){
      await this.doPlay(taskResponse);
      return true;
  }

  private async doPlay(taskResponse: TaskResponse): Promise<void> {
    try {
      const diggMonitor = getPlayMonitor(taskResponse.port);
      await diggMonitor.actionClick(taskResponse);
    }catch(error){
      log.error("doplay error", error);
    }
  }

  private async selectResource(platformUser: PlatformUser, retry = 3): Promise<ResourceAccount | null> {
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
    if(resource.isRunning){
      const isMoreThanMaxWait = await this.isMoreThanMaxWait(resource);
      if(isMoreThanMaxWait){
        return resource;
      }
      return null;
    }
    return resource;
  }

  private async isMoreThanMaxWait(resource: ResourceAccount): Promise<boolean> {
    const now = Date.now();
    const maxWait = 10000;
    const lastUsed = resource.lastUsed;
    if(lastUsed){
      const diff = now - lastUsed;
      if(diff > maxWait){
       resource.isRunning = false;
       log.info("resource is more than max wait", resource.id, " waited ",  diff, " ms");
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


  private async getTaskResponseByPlatformUser(taskHandler: TaskHandler, platformUser: PlatformUser, resource: ResourceAccount, needRealPlatformUser: boolean, taskType: string): Promise<TaskResponse | null> {
    const apiKey = await taskHandler.getApiKey(platformUser);
    if (!apiKey) {
        return null;
    }
    let oriApiKey : string | null = apiKey;
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


  /**
   * 🎯 自定义业务逻辑 - 生产任务
   */
  private async doCustomAction(platformUser: PlatformUser, resource: ResourceAccount, taskType: string, mustWait: boolean = true, retry = 3): Promise<TaskResponse | null> {
    try {
      const taskHandler = await this.getTaskHandler(platformUser.type);
      if (!taskHandler) {
        log.info("taskHandler is null ", taskType, " from ", platformUser.type);
        return null;
      }
      while(retry > 0){
          const taskResponse = await this.getTaskResponseByPlatformUser(taskHandler, platformUser, resource, true, taskType);
          if(taskResponse){
            taskResponse.username = platformUser.username;
            return taskResponse;
          }
          await sleep(100);
          retry--;
      }
      return null;
    } catch (error) {
      log.error(`Custom action failed for resource ${resource.id}:`, error);
      return null;
    }
  }

  private async getTaskHandler(type: string): Promise<TaskHandler | null> {
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
    return null;
  }
}

