import { ResourceAccount, ResourcePoolStats } from './interfaces';
import { EventEmitter } from 'events';

/**
 * 资源池管理器
 * 负责管理所有的资源账号，提供动态分配和重新分配功能
 */
export class ResourcePool extends EventEmitter {
  private resources: Map<string, ResourceAccount> = new Map();
  private distributedResources: Map<string, string[]> = new Map(); // producerId -> resourceIds[]
  
  constructor() {
    super();
  }

  /**
   * 添加资源账号
   */
  addResource(resource: ResourceAccount): void {
    this.resources.set(resource.id, resource);
    this.emit('resource-added', resource);
  }

  /**
   * 批量添加资源账号
   */
  addResources(resources: ResourceAccount[]): void {
    resources.forEach(resource => {
      this.resources.set(resource.id, resource);
    });
    this.emit('resources-added', resources);
  }

  /**
   * 移除资源账号
   */
  removeResource(resourceId: string): boolean {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return false;
    }

    // 从分配记录中移除
    this.distributedResources.forEach((resourceIds, producerId) => {
      const index = resourceIds.indexOf(resourceId);
      if (index !== -1) {
        resourceIds.splice(index, 1);
        this.emit('resource-redistributed', producerId, resourceIds);
      }
    });

    this.resources.delete(resourceId);
    this.emit('resource-removed', resource);
    return true;
  }

  /**
   * 获取资源账号
   */
  getResource(resourceId: string): ResourceAccount | undefined {
    return this.resources.get(resourceId);
  }

  /**
   * 获取所有活跃的资源账号
   */
  getActiveResources(): ResourceAccount[] {
    return Array.from(this.resources.values()).filter(resource => resource.isActive);
  }

  /**
   * 获取所有资源账号
   */
  getAllResources(): ResourceAccount[] {
    return Array.from(this.resources.values());
  }

  /**
   * 更新资源账号状态
   */
  updateResourceStatus(resourceId: string, isActive: boolean): void {
    const resource = this.resources.get(resourceId);
    if (resource) {
      resource.isActive = isActive;
      this.emit('resource-updated', resource);
    }
  }

  /**
   * 平均分配资源到生产者
   */
  distributeResources(producerIds: string[], strategy: 'round-robin' | 'random' | 'even' = 'even'): Map<string, ResourceAccount[]> {
    const activeResources = this.getActiveResources();
    const distribution = new Map<string, ResourceAccount[]>();
    
    // 初始化分配结果
    producerIds.forEach(id => {
      distribution.set(id, []);
      this.distributedResources.set(id, []);
    });

    if (activeResources.length === 0 || producerIds.length === 0) {
      return distribution;
    }

    switch (strategy) {
      case 'even':
        this.distributeEvenly(activeResources, producerIds, distribution);
        break;
      case 'round-robin':
        this.distributeRoundRobin(activeResources, producerIds, distribution);
        break;
      case 'random':
        this.distributeRandomly(activeResources, producerIds, distribution);
        break;
    }

    // 更新分配记录
    distribution.forEach((resources, producerId) => {
      this.distributedResources.set(producerId, resources.map(r => r.id));
    });

    this.emit('resources-distributed', distribution);
    return distribution;
  }

  /**
   * 平均分配策略
   */
  private distributeEvenly(resources: ResourceAccount[], producerIds: string[], distribution: Map<string, ResourceAccount[]>): void {
    const resourcesPerProducer = Math.floor(resources.length / producerIds.length);
    const remainder = resources.length % producerIds.length;

    let resourceIndex = 0;
    
    producerIds.forEach((producerId, index) => {
      const count = resourcesPerProducer + (index < remainder ? 1 : 0);
      const assignedResources = resources.slice(resourceIndex, resourceIndex + count);
      distribution.set(producerId, assignedResources);
      resourceIndex += count;
    });
  }

  /**
   * 轮询分配策略
   */
  private distributeRoundRobin(resources: ResourceAccount[], producerIds: string[], distribution: Map<string, ResourceAccount[]>): void {
    resources.forEach((resource, index) => {
      const producerId = producerIds[index % producerIds.length];
      const existingResources = distribution.get(producerId) || [];
      existingResources.push(resource);
      distribution.set(producerId, existingResources);
    });
  }

  /**
   * 随机分配策略
   */
  private distributeRandomly(resources: ResourceAccount[], producerIds: string[], distribution: Map<string, ResourceAccount[]>): void {
    const shuffledResources = [...resources].sort(() => Math.random() - 0.5);
    this.distributeRoundRobin(shuffledResources, producerIds, distribution);
  }

  /**
   * 重新分配资源
   */
  redistributeResources(producerIds: string[], strategy: 'round-robin' | 'random' | 'even' = 'even'): Map<string, ResourceAccount[]> {
    return this.distributeResources(producerIds, strategy);
  }

  /**
   * 获取指定生产者的资源
   */
  getProducerResources(producerId: string): ResourceAccount[] {
    const resourceIds = this.distributedResources.get(producerId) || [];
    return resourceIds.map(id => this.resources.get(id)).filter(Boolean) as ResourceAccount[];
  }

  /**
   * 获取资源池统计信息
   */
  getStats(): ResourcePoolStats {
    const allResources = this.getAllResources();
    const activeResources = allResources.filter(r => r.isActive);
    const distributedResourceIds = new Set<string>();
    
    this.distributedResources.forEach(resourceIds => {
      resourceIds.forEach(id => distributedResourceIds.add(id));
    });

    return {
      totalResources: allResources.length,
      activeResources: activeResources.length,
      inactiveResources: allResources.length - activeResources.length,
      distributedResources: distributedResourceIds.size
    };
  }

  /**
   * 清空所有资源
   */
  clear(): void {
    this.resources.clear();
    this.distributedResources.clear();
    this.emit('resources-cleared');
  }
} 