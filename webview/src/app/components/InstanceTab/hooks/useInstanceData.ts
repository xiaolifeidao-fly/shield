import { useState, useEffect } from 'react';
import { message } from 'antd';
import { InstanceApi } from '@eleapi/door/instance.api';
import { PlatformConfigApi } from '@eleapi/door/platform.config.api';
import { Business } from '@model/business.entity';
import { Instance, InstanceStats, GlobalStats, BusinessStats, InstanceBusinessConfigs } from '../types';

// 日志函数
const log = (message: string, type: 'info' | 'error' | 'warning' = 'info') => {
  console.log(`[InstanceData] ${message}`);
  if ((window as any).addLogEntry) {
    (window as any).addLogEntry(`[实例管理] ${message}`, type);
  }
};

// 实例数据管理 Hook
export const useInstanceData = (groupCode: string) => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [filteredInstances, setFilteredInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<InstanceStats>({
    currentPort: 0,
    activeInstanceCount: 0,
    availableSlots: 100,
  });

  // 当groupCode变化时重新加载实例列表
  useEffect(() => {
    if (groupCode) {
      loadInstances();
    }
  }, [groupCode]);

  const loadInstances = async () => {
    const instanceApi = new InstanceApi();
    const result = await instanceApi.getAllInstances(groupCode);
    if(result.success){
      // 强制刷新：先清空数组，然后设置新数据，确保触发重新渲染
      setInstances([]);
      setInstances([...result.data]); // 使用扩展操作符创建新数组引用
      setStats((prev: InstanceStats) => ({
        ...prev,
        activeInstanceCount: result.data.length,
        availableSlots: 100 - result.data.length
      }));
    }else{
      setInstances([]);
    }
  };

  const handleRefreshInstances = async () => {
    setButtonLoading('refresh', true);
    try {
      await loadInstances();
      log('实例列表刷新成功', 'info');
      message.success('实例列表已刷新');
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log(`刷新实例列表失败: ${errorMsg}`, 'error');
      message.error(`刷新失败: ${errorMsg}`);
    } finally {
      setButtonLoading('refresh', false);
    }
  };

  const handleCreateNewInstance = async () => {
    setButtonLoading('create', true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const instanceApi = new InstanceApi();
      const result = await instanceApi.createNewInstance(groupCode);
      if(result.success){
        setInstances((prev: Instance[]) => [...prev, result.data]);
        log(`新实例创建成功 [端口 ${result.data.port}]`, 'info');
      }else{
        log('创建新实例失败: ', 'error');
      }
    } catch (error) {
      log('创建新实例失败: ' + error, 'error');
    } finally {
      setButtonLoading('create', false);
    }
  };

  const setButtonLoading = (key: string, isLoading: boolean) => {
    setLoading((prev: Record<string, boolean>) => ({ ...prev, [key]: isLoading }));
  };

  // 筛选实例
  const filterInstances = (instances: Instance[], uidFilter: string) => {
    if (!uidFilter.trim()) return instances;
    return instances.filter(instance => 
      instance.uid?.toString().toLowerCase().includes(uidFilter.toLowerCase()) ||
      instance.nickName?.toLowerCase().includes(uidFilter.toLowerCase())
    );
  };

  return {
    instances,
    filteredInstances,
    setFilteredInstances,
    loading,
    stats,
    loadInstances,
    handleRefreshInstances,
    handleCreateNewInstance,
    setButtonLoading,
    filterInstances,
    setInstances
  };
};

// 业务数据管理 Hook
export const useBusinessData = (groupCode: string) => {
  const [businessList, setBusinessList] = useState<Business[]>([]);
  const [instanceBusinessConfigs, setInstanceBusinessConfigs] = useState<InstanceBusinessConfigs>({});

  // 当groupCode变化时重新加载业务列表
  useEffect(() => {
    if (groupCode) {
      loadBusinessList(groupCode);
    }
  }, [groupCode]);

  const loadBusinessList = async (group?: string) => {
    try {
      const platformConfigApi = new PlatformConfigApi();
      const targetGroup = group || groupCode;
      const result = await platformConfigApi.getBusinessListByGroup(targetGroup);
      if (result.success) {
        setBusinessList(result.data);
      }
    } catch (error) {
      console.error('加载业务类型列表失败:', error);
    }
  };

  const switchBusinessGroup = async (group: string) => {
    await loadBusinessList(group);
  };

  const loadAllInstanceBusinessConfigs = async (instances: Instance[]) => {
    try {
      const platformConfigApi = new PlatformConfigApi();
      const configs: InstanceBusinessConfigs = {};
      
      for (const instance of instances) {
        const result = await platformConfigApi.getInstanceBusinessConfig(String(instance.port));
        if (result.success) {
          configs[instance.port] = result.data;
        } else {
          // 如果获取失败，创建独立的默认配置（digg默认勾选，其他默认不勾选）
          configs[instance.port] = businessList.map(business => ({
            ...business
          }));
        }
      }
      
      setInstanceBusinessConfigs(configs);
    } catch (error) {
      console.error('加载实例业务类型配置失败:', error);
    }
  };

  const saveInstanceBusinessConfig = async (port: number, businessConfig: Business[]) => {
    try {
      const platformConfigApi = new PlatformConfigApi();
      const result = await platformConfigApi.saveInstanceBusinessConfig(String(port), businessConfig);
      
      if (result.success) {
        // 更新本地状态
        setInstanceBusinessConfigs((prev: InstanceBusinessConfigs) => ({
          ...prev,
          [port]: businessConfig
        }));
        message.success(`实例 ${port} 业务类型配置已更新`);
        log(`实例 ${port} 业务类型配置保存成功`, 'info');
      } else {
        message.error(`保存实例 ${port} 业务类型配置失败: ${result.message}`);
        log(`保存实例 ${port} 业务类型配置失败: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('保存实例业务类型配置异常:', error);
      message.error(`保存实例 ${port} 业务类型配置失败`);
      log(`保存实例 ${port} 业务类型配置异常: ${error}`, 'error');
    }
  };

  const handleBusinessChange = async (checkedBusinessList: Business[]) => {
    console.log('开始保存业务类型配置:', checkedBusinessList);
    
    // 立即更新UI状态
    setBusinessList(checkedBusinessList);
    
    try {
      const platformConfigApi = new PlatformConfigApi();
      const result = await platformConfigApi.saveBusinessList(checkedBusinessList);
      if (result.success) {
        console.log('业务类型配置保存成功');
        message.success('业务类型配置已更新');
      } else {
        console.error('保存业务类型配置失败:', result);
        // 如果保存失败，回滚状态
        loadBusinessList();
        message.error('保存业务类型配置失败');
      }
    } catch (error) {
      console.error('保存业务类型配置异常:', error);
      // 如果保存失败，回滚状态
      loadBusinessList();
      message.error('保存业务类型配置失败');
    }
  };

  return {
    businessList,
    setBusinessList,
    instanceBusinessConfigs,
    setInstanceBusinessConfigs,
    loadBusinessList,
    switchBusinessGroup,
    loadAllInstanceBusinessConfigs,
    saveInstanceBusinessConfig,
    handleBusinessChange
  };
};

// 统计数据管理 Hook
export const useStatsData = () => {
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalLikes: 0,
    todayLikes: 0,
    totalFailures: 0,
    todayFailures: 0
  });
  
  const [businessStats, setBusinessStats] = useState<BusinessStats>({});

  const updateGlobalStats = (instances: Instance[], businessList: Business[]) => {
    // 更新全局统计数据（保持原有逻辑以兼容旧版本）
    const totalLikes = instances.reduce((sum, inst) => sum + (inst.totalLikeCount || 0), 0);
    const todayLikes = instances.reduce((sum, inst) => sum + (inst.likeCount || 0), 0);
    // 从新的Map统计数据中计算总失败数
    let totalFailures = 0;
    let todayFailures = 0;
    instances.forEach(inst => {
      if (inst.statistic) {
        inst.statistic.forEach((stat: any) => {
          totalFailures += stat.totalErrorCount || 0;
          todayFailures += stat.todayErrorCount || 0;
        });
      }
    });
    
    setGlobalStats({
      totalLikes,
      todayLikes,
      totalFailures,
      todayFailures
    });
    
    // 更新按业务类型的统计数据
    const newBusinessStats: BusinessStats = {};
    
    businessList.forEach(business => {
      let totalCount = 0;
      let todayCount = 0;
      let totalErrorCount = 0;
      let todayErrorCount = 0;
      
      instances.forEach(instance => {
        const stat = instance.statistic?.get(business.code);
        if (stat) {
          totalCount += stat.totalCount || 0;
          todayCount += stat.todayCount || 0;
          totalErrorCount += stat.totalErrorCount || 0;
          todayErrorCount += stat.todayErrorCount || 0;
        }
      });
      
      newBusinessStats[business.code] = {
        totalCount,
        todayCount,
        totalErrorCount,
        todayErrorCount
      };
    });
    
    setBusinessStats(newBusinessStats);
  };

  return {
    globalStats,
    businessStats,
    updateGlobalStats
  };
};
