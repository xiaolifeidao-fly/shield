import React, { useState, useEffect } from 'react';
import { Card, Space, Row, Col, Badge, Tag, Input, message } from 'antd';
import { InstanceDetailModal } from './InstanceDetailModal';
import { InstanceApi } from '@eleapi/door/instance.api';
import { Business } from '@model/business.entity';

// 导入自定义 hooks
import { useInstanceData, useBusinessData, useStatsData } from './hooks/useInstanceData';

// 导入组件
import { InstanceStats } from './components/InstanceStats';
import { InstanceList } from './components/InstanceList';
import { BatchOperations } from './components/BatchOperations';
import { BusinessTypeManager } from './components/BusinessTypeManager';
import { QrLoginModal } from './components/QrLoginModal';
import { ClearSleepModal } from './components/ClearSleepModal';
import { LockTimeModal } from './components/LockTimeModal';
import { ProgressModal } from './components/ProgressModal';

// 导入类型
import { Instance, ProgressInfo } from './types';

interface InstanceTabProps {
  groupCode: string;
}

// 添加日志函数
const log = (message: string, type: 'info' | 'error' | 'warning' = 'info') => {
  console.log(`[InstanceTab] ${message}`);
  if ((window as any).addLogEntry) {
    (window as any).addLogEntry(`[实例管理] ${message}`, type);
  }
};

export const InstanceTab: React.FC<InstanceTabProps> = ({ groupCode }) => {
  // 使用自定义 hooks
  const {
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
  } = useInstanceData(groupCode);

  const {
    businessList,
    setBusinessList,
    instanceBusinessConfigs,
    loadBusinessList,
    switchBusinessGroup,
    loadAllInstanceBusinessConfigs,
    handleBusinessChange
  } = useBusinessData(groupCode);

  const {
    globalStats,
    businessStats,
    updateGlobalStats
  } = useStatsData();

  // 筛选条件状态
  const [uidFilter, setUidFilter] = useState<string>('');
  
  // 详情弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  
  // 封禁时间设置弹窗状态
  const [lockTimeModalVisible, setLockTimeModalVisible] = useState(false);
  const [lockTimeSelectedInstance, setLockTimeSelectedInstance] = useState<Instance | null>(null);
  
  // 扫码+日志弹窗状态
  const [qrLogModalVisible, setQrLogModalVisible] = useState(false);
  const [selectedQrInstance, setSelectedQrInstance] = useState<Instance | null>(null);
  
  // 批量操作进度弹窗状态
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [progressInfo, setProgressInfo] = useState<ProgressInfo>({
    type: 'start',
    total: 0,
    current: 0,
    currentInstance: null,
    completed: 0,
    failed: 0,
    logs: []
  });
  
  // 清除休眠弹窗状态
  const [clearSleepModalVisible, setClearSleepModalVisible] = useState(false);
  const [clearSleepSelectedInstance, setClearSleepSelectedInstance] = useState<Instance | null>(null);

  // 添加进度日志
  const addProgressLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setProgressInfo(prev => ({
      ...prev,
      logs: [...prev.logs, {
        time: new Date().toLocaleTimeString(),
        message,
        type
      }].slice(-20) // 保留最新20条
    }));
  };

  // 带返回值的启动函数，用于批量启动统计
  const handleStartWithResult = async (instance: Instance): Promise<boolean> => {
    try {
      const instanceApi = new InstanceApi();
      const result = await instanceApi.runInstance(groupCode, String(instance.port));
      
      if (result.success) {
        setInstances((prev: Instance[]) => prev.map((item: Instance) => 
          item.port === instance.port 
            ? { ...item, runningStatus: 'running', lastActiveAt: new Date().toISOString() }
            : item
        ));
        log(`实例 ${instance.port}[${instance.uid || '未知UID'}] 启动成功`, 'info');
        return true;
      } else {
        log(`启动实例${instance.port}失败: ${result.message}`, 'error');
        return false;
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log(`启动实例${instance.port}失败: ${errorMsg}`, 'error');
      return false;
    }
  };

  // 带返回值的停止函数，用于批量停止统计
  const handleStopWithResult = async (instance: Instance): Promise<boolean> => {
    try {
      const instanceApi = new InstanceApi();
      const result = await instanceApi.stopInstance(groupCode, String(instance.port));
      
      if (result.success) {
        setInstances((prev: Instance[]) => prev.map((item: Instance) => 
          item.port === instance.port 
            ? { ...item, runningStatus: 'stopped', lastActiveAt: new Date().toISOString() }
            : item
        ));
        log(`实例 ${instance.port}[${instance.uid || '未知UID'}] 已停止`, 'info');
        return true;
      } else {
        log(`停止实例${instance.port}失败: ${result.message}`, 'error');
        return false;
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log(`停止实例${instance.port}失败: ${errorMsg}`, 'error');
      return false;
    }
  };

  // 一键启动功能（只启动已登录且未运行的实例）
  const handleBatchStart = async () => {
    setButtonLoading('batchStart', true);
    // 过滤条件：已停止 + 已登录 + 不在休眠中（检查所有业务类型）
    const availableInstances = instances.filter(inst => {
      if(inst.isLogin == false || inst.runningStatus !== 'stopped'){
        return false;
      }
      return true;
    });
    
    if (availableInstances.length === 0) {
      message.warning('没有可启动的实例（需要已登录且未运行的实例）');
      setButtonLoading('batchStart', false);
      return;
    }
    
    // 初始化进度弹窗
    setProgressInfo({
      type: 'start',
      total: availableInstances.length,
      current: 0,
      currentInstance: null,
      completed: 0,
      failed: 0,
      logs: []
    });
    setProgressModalVisible(true);
    addProgressLog(`开始批量启动，共需启动 ${availableInstances.length} 个实例`);
    
    try {
      let successCount = 0;
      const successUIDs: string[] = [];
      
      for (let i = 0; i < availableInstances.length; i++) {
        const instance = availableInstances[i];
        
        // 更新当前处理实例
        setProgressInfo(prev => ({
          ...prev,
          current: i + 1,
          currentInstance: instance
        }));
        
        const uidInfo = instance.uid ? `${instance.uid}${instance.nickName ? '-' + instance.nickName : ''}` : instance.port;
        addProgressLog(`正在启动实例 ${instance.port} [${uidInfo}]...`);
        
        const result = await handleStartWithResult(instance);
        
        if (result) {
          successCount++;
          if (instance.uid) {
            successUIDs.push(`${instance.uid}${instance.nickName ? '-' + instance.nickName : ''}`);
          }
          addProgressLog(`✅ 实例 ${instance.port} [${uidInfo}] 启动成功`, 'success');
          setProgressInfo(prev => ({ ...prev, completed: prev.completed + 1 }));
        } else {
          addProgressLog(`❌ 实例 ${instance.port} [${uidInfo}] 启动失败`, 'error');
          setProgressInfo(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
        
        // 添加小延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 完成总结
      const uidMessage = successUIDs.length > 0 ? `已启动的UID: ${successUIDs.join(', ')}` : '';
      const summaryMessage = `批量启动完成！成功: ${successCount}/${availableInstances.length}`;
      addProgressLog(summaryMessage, successCount > 0 ? 'success' : 'error');
      
      if (successCount > 0) {
        message.success(`${summaryMessage}。${uidMessage}`);
      } else {
        message.error('所有实例启动失败');
      }
    } catch (error) {
      addProgressLog('批量启动过程中发生异常', 'error');
      message.error('批量启动失败');
    } finally {
      setButtonLoading('batchStart', false);
      // 3秒后自动关闭进度弹窗
      setTimeout(() => {
        setProgressModalVisible(false);
      }, 3000);
    }
  };

  // 一键暂停功能
  const handleBatchStop = async () => {
    setButtonLoading('batchStop', true);
    const runningInstances = instances.filter(inst => inst.runningStatus === 'running');
    
    if (runningInstances.length === 0) {
      message.warning('没有正在运行的实例需要停止');
      setButtonLoading('batchStop', false);
      return;
    }
    
    // 初始化进度弹窗
    setProgressInfo({
      type: 'stop',
      total: runningInstances.length,
      current: 0,
      currentInstance: null,
      completed: 0,
      failed: 0,
      logs: []
    });
    setProgressModalVisible(true);
    addProgressLog(`开始批量停止，共需停止 ${runningInstances.length} 个实例`);
    
    try {
      let successCount = 0;
      const successUIDs: string[] = [];
      
      for (let i = 0; i < runningInstances.length; i++) {
        const instance = runningInstances[i];
        
        // 更新当前处理实例
        setProgressInfo(prev => ({
          ...prev,
          current: i + 1,
          currentInstance: instance
        }));
        
        const uidInfo = instance.uid ? `${instance.uid}${instance.nickName ? '-' + instance.nickName : ''}` : instance.port;
        addProgressLog(`正在停止实例 ${instance.port} [${uidInfo}]...`);
        
        const result = await handleStopWithResult(instance);
        
        if (result) {
          successCount++;
          if (instance.uid) {
            successUIDs.push(`${instance.uid}${instance.nickName ? '-' + instance.nickName : ''}`);
          }
          addProgressLog(`✅ 实例 ${instance.port} [${uidInfo}] 停止成功`, 'success');
          setProgressInfo(prev => ({ ...prev, completed: prev.completed + 1 }));
        } else {
          addProgressLog(`❌ 实例 ${instance.port} [${uidInfo}] 停止失败`, 'error');
          setProgressInfo(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
        
        // 添加小延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 完成总结
      const uidMessage = successUIDs.length > 0 ? `已停止的UID: ${successUIDs.join(', ')}` : '';
      const summaryMessage = `批量停止完成！成功: ${successCount}/${runningInstances.length}`;
      addProgressLog(summaryMessage, successCount > 0 ? 'success' : 'error');
      
      if (successCount > 0) {
        message.success(`${summaryMessage}。${uidMessage}`);
      } else {
        message.error('所有实例停止失败');
      }
    } catch (error) {
      addProgressLog('批量停止过程中发生异常', 'error');
      message.error('批量停止失败');
    } finally {
      setButtonLoading('batchStop', false);
      // 3秒后自动关闭进度弹窗
      setTimeout(() => {
        setProgressModalVisible(false);
      }, 3000);
    }
  };

  const handleStart = async (instance: Instance) => {
    const key = `start-${instance.port}`;
    setButtonLoading(key, true);
    try {
      const success = await handleStartWithResult(instance);
      if (success) {
        const uidInfo = instance.uid ? `[${instance.uid}${instance.nickName ? '-' + instance.nickName : ''}]` : '';
        message.success(`实例 ${instance.port}${uidInfo} 启动成功`);
      } else {
        message.error(`实例 ${instance.port} 启动失败`);
      }
    } finally {
      setButtonLoading(key, false);
    }
  };

  const handleStop = async (instance: Instance) => {
    const key = `stop-${instance.port}`;
    setButtonLoading(key, true);
    try {
      const success = await handleStopWithResult(instance);
      if (success) {
        const uidInfo = instance.uid ? `[${instance.uid}${instance.nickName ? '-' + instance.nickName : ''}]` : '';
        message.success(`实例 ${instance.port}${uidInfo} 已停止`);
      } else {
        message.error(`实例 ${instance.port} 停止失败`);
      }
    } finally {
      setButtonLoading(key, false);
    }
  };

  const handleDelete = async (instance: Instance) => {
    try {
      const instanceApi = new InstanceApi();
      const result = await instanceApi.deleteByPort(groupCode, String(instance.port));
      if(result.success){
        await loadInstances();
        message.success('实例删除成功');
      }else{
        message.error(`删除失败: ${result.message}`);
      }
    } catch (error) {
      console.error('删除实例失败:', error);
    }
  };

  const handleShowQrLogModal = (instance: Instance) => {
    setSelectedQrInstance(instance);
    setQrLogModalVisible(true);
  };

  const handleCloseQrLogModal = () => {
    setQrLogModalVisible(false);
    setSelectedQrInstance(null);
    // 关闭后刷新实例列表
    loadInstances();
  };

  const handleQrLoginSuccess = (instance: Instance) => {
    setInstances(prev => prev.map(item => 
      item.port === instance.port 
        ? { ...item, isLogin: true, lastActiveAt: new Date().toISOString() }
        : item
    ));
    message.success('扫码登录成功');
  };

  const handleShowLockTimeModal = (instance: Instance) => {
    setLockTimeSelectedInstance(instance);
    setLockTimeModalVisible(true);
  };

  const handleCloseLockTimeModal = () => {
    setLockTimeModalVisible(false);
    setLockTimeSelectedInstance(null);
  };

  const handleSetLockTimeSuccess = (instance: Instance, timestamp: number) => {
    setInstances((prev: Instance[]) => prev.map(item => 
      item.port === instance.port 
        ? { ...item, lockTime: timestamp }
        : item
    ));
    log(`实例 ${instance.port} 封禁时间设置成功`, 'info');
    message.success('封禁时间设置成功');
  };

  const handleShowClearSleepModal = (instance: Instance) => {
    setClearSleepSelectedInstance(instance);
    setClearSleepModalVisible(true);
  };

  const handleCloseClearSleepModal = () => {
    setClearSleepModalVisible(false);
    setClearSleepSelectedInstance(null);
  };

  const handleClearSleepSuccess = () => {
    loadInstances();
  };

  const handleUpdateInstanceBusiness = async (instance: Instance, businessCode: string, checked: boolean) => {
    try {
      const instanceApi = new InstanceApi();
      const result = await instanceApi.setTaskTypeChoose(
        String(instance.port),
        businessCode,
        checked
      );
      
      if (result.success) {
        // 更新本地状态
        setInstances((prev: Instance[]) => prev.map(inst => 
          inst.port === instance.port 
            ? {
                ...inst,
                statistic: new Map(inst.statistic).set(businessCode, {
                  totalCount: inst.statistic?.get(businessCode)?.totalCount || 0,
                  todayCount: inst.statistic?.get(businessCode)?.todayCount || 0,
                  totalErrorCount: inst.statistic?.get(businessCode)?.totalErrorCount || 0,
                  todayErrorCount: inst.statistic?.get(businessCode)?.todayErrorCount || 0,
                  chose: checked
                })
              }
            : inst
        ));
        
        const businessName = businessList.find(b => b.code === businessCode)?.name || businessCode;
        message.success(`实例 ${instance.port} 的 ${businessName} 业务类型选择已更新`);
        log(`实例 ${instance.port} 的 ${businessName} 业务类型选择已更新为: ${checked ? '启用' : '禁用'}`, 'info');
      } else {
        message.error(`更新失败: ${result.message}`);
        log(`更新实例 ${instance.port} 的 ${businessCode} 业务类型选择失败: ${result.message}`, 'error');
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      message.error(`更新失败: ${errorMsg}`);
      log(`更新实例 ${instance.port} 的 ${businessCode} 业务类型选择异常: ${errorMsg}`, 'error');
    }
  };

  // 初始化加载数据
  useEffect(() => {
    const initializeData = async () => {
      await loadInstances();
    };
    
    initializeData();
    
    // 设置定时器，每2秒自动刷新实例列表
    const refreshInterval = setInterval(() => {
      loadInstances();
    }, 2000);
    
    // 清理定时器
    return () => {
      clearInterval(refreshInterval);
    };
  }, [groupCode]); // 添加groupCode依赖，当groupCode变化时重新设置定时器

  // 当实例列表变化时，加载实例业务配置
  useEffect(() => {
    if (instances.length > 0 && businessList.length > 0) {
      loadAllInstanceBusinessConfigs(instances);
    }
  }, [instances, businessList]);

  // 当实例或筛选条件变化时更新筛选结果和统计数据
  useEffect(() => {
    const filtered = filterInstances(instances, uidFilter);
    // 按创建时间倒序排序（最新创建的在前面）
    const sorted = filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // 倒序排列
    });
    setFilteredInstances(sorted);
    updateGlobalStats(instances, businessList); // 统计数据基于全部实例
  }, [instances, uidFilter, businessList]);

  return (
    <>
      <div style={{ 
        width: '1500px', 
        margin: '0 auto',
        padding: '24px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        minHeight: '100vh'
      }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <Card 
            className="app-card" 
            style={{ 
              minHeight: '1000px',
              width: '100%',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* 筛选条件 + 操作按钮模块 */}
              <Card 
                size="small" 
                style={{ 
                  marginBottom: 24, 
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  borderRadius: '12px',
                  border: '1px solid #e1f5fe',
                  boxShadow: '0 2px 8px rgba(33, 150, 243, 0.1)'
                }}
              >
                <Row gutter={[24, 16]} align="middle">
                  <Col span={10}>
                    <Space size="large">
                      <span style={{ 
                        fontWeight: 600, 
                        color: '#1565c0',
                        fontSize: '14px'
                      }}>
                        🔍 UID筛选:
                      </span>
                      <Input
                        placeholder="输入UID或昵称筛选…"
                        value={uidFilter}
                        onChange={(e) => setUidFilter(e.target.value)}
                        allowClear
                        style={{ 
                          width: 280,
                          borderRadius: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                        prefix={<span style={{ color: '#1890ff' }}>🔍</span>}
                      />
                    </Space>
                  </Col>
                  <Col span={14}>
                    <div style={{ textAlign: 'right' }}>
                      <Space size="small">
                        <Badge 
                          count={filteredInstances.length} 
                          style={{ backgroundColor: '#52c41a' }}
                        />
                        <span style={{ color: '#666', fontSize: '14px' }}>
                          / {instances.length} 个实例
                        </span>
                        {uidFilter && (
                          <Tag color="blue" style={{ marginLeft: 8 }}>
                            筛选中
                          </Tag>
                        )}
                      </Space>
                    </div>
                  </Col>
                </Row>
                
                {/* 操作按钮组 */}
                <BatchOperations
                  loading={loading}
                  onCreateNewInstance={handleCreateNewInstance}
                  onRefreshInstances={handleRefreshInstances}
                  onBatchStart={handleBatchStart}
                  onBatchStop={handleBatchStop}
                />
                
                {/* 业务类型选择 */}
                <BusinessTypeManager
                  businessList={businessList}
                  onBusinessChange={handleBusinessChange}
                />
              </Card>

              {/* 统计仪表盘 */}
              <InstanceStats
                businessList={businessList}
                businessStats={businessStats}
              />

              {/* 实例列表 */}
              <InstanceList
                instances={filteredInstances}
                businessList={businessList}
                loading={loading}
                onStart={handleStart}
                onStop={handleStop}
                onShowQrLogModal={handleShowQrLogModal}
                onShowLockTimeModal={handleShowLockTimeModal}
                onShowClearSleepModal={handleShowClearSleepModal}
                onDelete={handleDelete}
                onUpdateInstanceBusiness={handleUpdateInstanceBusiness}
              />
            </Space>
          </Card>
        </div>
      </div>

      {/* 详情弹框 */}
      <InstanceDetailModal 
        visible={detailModalVisible}
        instance={selectedInstance as any}
        groupCode={groupCode}
        onClose={() => setDetailModalVisible(false)}
      />

      {/* 封禁时间设置弹框 */}
      <LockTimeModal
        visible={lockTimeModalVisible}
        instance={lockTimeSelectedInstance}
        groupCode={groupCode}
        loading={loading}
        onClose={handleCloseLockTimeModal}
        onSuccess={handleSetLockTimeSuccess}
      />
      
      {/* 清除休眠弹框 */}
      <ClearSleepModal
        visible={clearSleepModalVisible}
        instance={clearSleepSelectedInstance}
        groupCode={groupCode}
        businessList={businessList}
        loading={loading}
        onClose={handleCloseClearSleepModal}
        onSuccess={handleClearSleepSuccess}
      />
      
      {/* 扫码+日志弹窗 */}
      <QrLoginModal
        visible={qrLogModalVisible}
        instance={selectedQrInstance}
        groupCode={groupCode}
        onClose={handleCloseQrLogModal}
        onLoginSuccess={handleQrLoginSuccess}
      />
      
      {/* 批量操作进度弹窗 */}
      <ProgressModal
        visible={progressModalVisible}
        progressInfo={progressInfo}
        onClose={() => setProgressModalVisible(false)}
      />
    </>
  );
};