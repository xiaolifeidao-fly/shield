import React, { useState, useEffect } from 'react';
import { InputNumber, Typography, Space, notification, Switch, Avatar, Spin, Card, Row, Col, Divider, Tabs, Button } from 'antd';
import { SafetyCertificateOutlined, ClockCircleOutlined, WarningOutlined, PoweroffOutlined, ThunderboltOutlined, SaveOutlined } from '@ant-design/icons';
import { GuardConfig, GuardCondition, GuardConfigApi, getLoveConditions } from '@eleapi/door/guard.config.api';
import { PlatformConfigApi } from '@eleapi/door/platform.config.api';
import { Business } from '@model/business.entity';

const { Title, Text } = Typography;

// 添加日志函数
const log = (message: string, type: 'info' | 'error' | 'warning' = 'info') => {
  console.log(`[GuardSettings] ${message}`);
  if ((window as any).addLogEntry) {
    (window as any).addLogEntry(`[守护设置] ${message}`, type);
  }
};


interface GuardSettingsProps {
  groupCode: string;
}

export const GuardSettings: React.FC<GuardSettingsProps> = ({ groupCode }) => {
  const [config, setConfig] = useState<GuardConfig>({
    enabled: false,
    conditions: []
  });
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [businessList, setBusinessList] = useState<Business[]>([]);
  const [activeBusinessType, setActiveBusinessType] = useState<string>('digg'); // 默认选中digg
  const [saving, setSaving] = useState(false);

  // 加载业务列表和守护配置
  useEffect(() => {
    if (groupCode) {
      loadBusinessList();
    }
  }, [groupCode]);

  // 当activeBusinessType变化时重新加载配置
  useEffect(() => {
    if (businessList.length > 0 && activeBusinessType) {
      loadGuardConfig();
    }
  }, [activeBusinessType, businessList]);

  // 自动保存逻辑
  useEffect(() => {
    if (initialized) {
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [config, initialized]);

  // 加载业务类型列表
  const loadBusinessList = async () => {
    try {
      const platformConfigApi = new PlatformConfigApi();
      const result = await platformConfigApi.getBusinessListByGroup(groupCode);
      if (result.success && result.data) {
        setBusinessList(result.data);
        // 如果digg存在，确保它是默认选中的；否则选择第一个
        const diggExists = result.data.some((business: Business) => business.code === 'digg');
        if (diggExists) {
          setActiveBusinessType('digg');
        } else if (result.data.length > 0) {
          setActiveBusinessType(result.data[0].code);
        }
        log('业务类型列表加载成功', 'info');
      }
    } catch (error) {
      log(`加载业务类型列表失败: ${error}`, 'error');
    }
  };

  const loadGuardConfig = async () => {
    if (!activeBusinessType) {
      log('没有选中的业务类型，跳过加载配置', 'warning');
      return;
    }

    setLoading(true);
    const currentBusiness = businessList.find(b => b.code === activeBusinessType);
    const businessName = currentBusiness ? currentBusiness.name : activeBusinessType;
    log(`正在加载业务类型 [${businessName}] 的守护配置...`);
    
    try {
      if (typeof GuardConfigApi === 'undefined') {
        log('GuardConfigApi 未初始化，使用默认配置', 'warning');
        // 获取当前业务类型的名称
        const currentBusiness = businessList.find(b => b.code === activeBusinessType);
        const businessName = currentBusiness ? currentBusiness.name : '点赞';
        
        setConfig({
          enabled: false,
          conditions: []
        });
        setInitialized(true);
        return;
      }

      const guardConfigApi = new GuardConfigApi();
      const result = await guardConfigApi.getGuardConfig(activeBusinessType);
      log(`加载业务类型 [${businessName}] 配置结果: ${JSON.stringify(result)}`);
      
      if (result && typeof result === 'object' && result.conditions) {
        // 获取当前业务类型的名称
        const currentBusiness = businessList.find(b => b.code === activeBusinessType);
        const businessName = currentBusiness ? currentBusiness.name : '点赞';
        
        setConfig({
          enabled: result.enabled || false,
          conditions: result.conditions.length > 0 ? result.conditions : []
        });
        log(`业务类型 [${businessName}] 守护配置加载成功`, 'info');
        notification.success({
          message: '配置加载成功',
          description: `${businessName}业务守护配置已加载`,
          placement: 'topRight',
          duration: 2
        });
      } else {
        // 获取当前业务类型的名称
        const currentBusiness = businessList.find(b => b.code === activeBusinessType);
        const businessName = currentBusiness ? currentBusiness.name : '点赞';
        
        setConfig({
          enabled: false,
          conditions: []
        });
      }
      setInitialized(true);
    } catch (error) {
      log(`加载业务类型 守护配置失败: ${error}`, 'error');
      notification.error({
        message: '配置加载失败',
        description: `无法加载 业务守护配置，使用默认配置`,
        placement: 'topRight'
      });
      // 获取当前业务类型的名称
      const currentBusiness = businessList.find(b => b.code === activeBusinessType);
      const businessName = currentBusiness ? currentBusiness.name : '点赞';
      
      setConfig({
        enabled: false,
        conditions: []
      });
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSave = async () => {
    if (!activeBusinessType) {
      log('没有选中的业务类型，跳过保存', 'warning');
      return;
    }

    const currentBusiness = businessList.find(b => b.code === activeBusinessType);
    const businessName = currentBusiness ? currentBusiness.name : activeBusinessType;
    log(`自动保存业务类型 [${businessName}] 的守护配置...`);
    
    try {
      log(`准备保存的配置数据: ${JSON.stringify(config)}`);

      if (typeof GuardConfigApi === 'undefined') {
        log('GuardConfigApi 未初始化，使用模拟保存', 'warning');
        await new Promise(resolve => setTimeout(resolve, 500));
        log(`业务类型 [${businessName}] 守护配置自动保存成功 (模拟)`, 'info');
        return;
      }
      
      const guardConfigApi = new GuardConfigApi();
      await guardConfigApi.setGuardConfig(config, activeBusinessType);
      log(`业务类型 [${businessName}] 守护配置自动保存成功`, 'info');
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log(`业务类型 [${businessName}] 守护配置自动保存异常: ${errorMsg}`, 'error');
    }
  };

  // 手动保存配置（用于tab切换时）
  const handleManualSave = async () => {
    if (!activeBusinessType) {
      log('没有选中的业务类型，跳过手动保存', 'warning');
      return;
    }

    const currentBusiness = businessList.find(b => b.code === activeBusinessType);
    const businessName = currentBusiness ? currentBusiness.name : activeBusinessType;
    log(`手动保存业务类型 [${businessName}] 的守护配置...`);
    
    try {
      if (typeof GuardConfigApi === 'undefined') {
        log('GuardConfigApi 未初始化，跳过手动保存', 'warning');
        return;
      }
      
      const guardConfigApi = new GuardConfigApi();
      await guardConfigApi.setGuardConfig(config, activeBusinessType);
      log(`业务类型 [${businessName}] 守护配置手动保存成功`, 'info');
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log(`业务类型 [${businessName}] 守护配置手动保存异常: ${errorMsg}`, 'error');
    }
  };

  // 立即保存配置
  const handleSaveNow = async () => {
    if (!activeBusinessType) {
      notification.warning({
        message: '无法保存',
        description: '没有选中的业务类型',
        placement: 'topRight',
        duration: 2
      });
      return;
    }

    setSaving(true);
    const currentBusiness = businessList.find(b => b.code === activeBusinessType);
    const businessName = currentBusiness ? currentBusiness.name : activeBusinessType;
    
    try {
      if (typeof GuardConfigApi === 'undefined') {
        log('GuardConfigApi 未初始化，使用模拟保存', 'warning');
        await new Promise(resolve => setTimeout(resolve, 800));
        log(`业务类型 [${businessName}] 守护配置保存成功 (模拟)`, 'info');
        notification.success({
          message: '保存成功',
          description: `${businessName}业务守护配置已保存`,
          placement: 'topRight',
          duration: 2
        });
        return;
      }
      
      const guardConfigApi = new GuardConfigApi();
      await guardConfigApi.setGuardConfig(config, activeBusinessType);
      log(`业务类型 [${businessName}] 守护配置保存成功`, 'info');
      notification.success({
        message: '保存成功',
        description: `${businessName}业务守护配置已保存`,
        placement: 'topRight',
        duration: 2
      });
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log(`业务类型 [${businessName}] 守护配置保存异常: ${errorMsg}`, 'error');
      notification.error({
        message: '保存失败',
        description: `${businessName}业务守护配置保存失败: ${errorMsg}`,
        placement: 'topRight',
        duration: 3
      });
    } finally {
      setSaving(false);
    }
  };

  const updateGlobalEnabled = (enabled: boolean) => {
    setConfig(prev => ({ ...prev, enabled }));
  };

  const updateCondition = (conditionId: string, updates: Partial<GuardCondition>) => {
    setConfig(prev => ({
      ...prev,
      conditions: prev.conditions.map(condition => 
        condition.id === conditionId 
          ? { ...condition, ...updates }
          : condition
      )
    }));
  };

  const updateConditionParam = (conditionId: string, paramKey: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      conditions: prev.conditions.map(condition => 
        condition.id === conditionId 
          ? { ...condition, params: { ...condition.params, [paramKey]: value } }
          : condition
      )
    }));
  };

  // 处理tab切换 - 在切换前先保存当前tab的配置
  const handleTabChange = async (businessType: string) => {
    // 如果当前有活动的业务类型且已初始化，先保存当前配置
    if (activeBusinessType && initialized && activeBusinessType !== businessType) {
      const currentBusiness = businessList.find(b => b.code === activeBusinessType);
      const currentBusinessName = currentBusiness ? currentBusiness.name : activeBusinessType;
      log(`切换前保存当前业务类型 [${currentBusinessName}] 的配置`);
      await handleManualSave();
    }
    
    const newBusiness = businessList.find(b => b.code === businessType);
    const newBusinessName = newBusiness ? newBusiness.name : businessType;
    log(`切换到业务类型: ${newBusinessName}`);
    setActiveBusinessType(businessType);
    setInitialized(false); // 重置初始化状态，触发重新加载
  };

  const getMaxNum = () => {
    if(activeBusinessType === 'digg'){
      return 5000;
    }
    if(activeBusinessType === 'collect'){
      return 200;
    }
    return 5000;
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '300px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Spin size="large" />
        <Text type="secondary">正在加载守护配置...</Text>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 固定区域：配置头部 + Tab */}
      <div style={{ 
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#fff',
        padding: '16px 16px 16px 16px',
        marginTop: '-16px',
        marginLeft: '-16px',
        marginRight: '-16px',
        borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        {/* 配置头部 */}
        <div style={{ 
          marginBottom: '20px',
          padding: '14px',
          background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%)',
          borderRadius: '10px',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={5} style={{ color: '#fff', margin: 0, fontSize: '16px' }}>
                守护配置
              </Title>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                智能处理异常情况
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PoweroffOutlined />
              <Switch 
                checked={config.enabled}
                onChange={updateGlobalEnabled}
                checkedChildren="启用"
                unCheckedChildren="禁用"
              />
            </div>
          </div>
        </div>

        {/* 业务类型Tab切换 */}
        {businessList.length > 0 && (
          <div>
            <Tabs
              activeKey={activeBusinessType}
              onChange={handleTabChange}
              type="card"
              style={{
                background: '#f8f9fa',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
              items={businessList.map(business => ({
                key: business.code,
                label: (
                  <span style={{
                    fontSize: '13px',
                    color: '#333', // 固定为黑色
                    fontWeight: 'normal', // 移除动态字重变化
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {business.code === 'digg' && '🎯'}
                    {business.code === 'collect' && '💖'}
                    {business.name}业务
                    {business.code === activeBusinessType && (
                      <span style={{ 
                        background: '#52c41a', 
                        color: '#fff', 
                        fontSize: '10px', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        marginLeft: '4px'
                      }}>
                        当前
                      </span>
                    )}
                  </span>
                )
              }))}
            />
          </div>
        )}
      </div>

      {/* 可滚动内容区域 */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        padding: '30px',
        backgroundColor: '#fff'
      }}>

      {/* 守护条件列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {config.conditions.map((condition, index) => (
          <div
            key={condition.id}
            style={{
              border: condition.enabled ? '1px solid #52c41a' : '1px solid #d9d9d9',
              borderRadius: '4px',
              padding: '12px',
              backgroundColor: condition.enabled ? '#f6ffed' : '#fafafa',
              opacity: condition.enabled ? 1 : 0.6
            }}
          >
            {/* 条件头部 - 简化为单行 */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '11px', 
                  color: '#999',
                  minWidth: '16px'
                }}>
                  {index + 1}
                </span>
                <Text strong style={{ fontSize: '12px', color: '#333' }}>
                  {condition.name}
                </Text>
              </div>
              <Switch 
                checked={condition.enabled}
                onChange={(checked) => updateCondition(condition.id, { enabled: checked })}
                size="small"
              />
            </div>

            {/* 条件配置 - 简化为单行布局 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              fontSize: '11px'
            }}>
              {/* 触发条件配置 */}
              {condition.id === 'consecutive_failures' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: '11px', minWidth: '60px' }}>
                    失败阈值:
                  </Text>
                  <InputNumber
                    min={1}
                    max={999999}
                    step={1}
                    value={condition.params.failureThreshold}
                    onChange={(value) => updateConditionParam(condition.id, 'failureThreshold', value || 1)}
                    size="small"
                    style={{ width: '120px', fontSize: '11px' }}
                    addonAfter="次"
                  />
                </div>
              )}

              {condition.id === 'like_too_fast' && (
                <div style={{ flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    系统自动检测{businessList.find(b => b.code === activeBusinessType)?.name}过快
                  </Text>
                </div>
              )}

              {condition.id === 'total_success_num' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: '11px', minWidth: '40px' }}>
                    日限:
                  </Text>
                  <InputNumber
                    min={0}
                    max={999999}
                    step={1}
                    value={condition.params.maxNum}
                    onChange={(value) => updateConditionParam(condition.id, 'maxNum', value || 0)}
                    size="small"
                    style={{ width: '120px', fontSize: '11px' }}
                    addonAfter="次"
                  />
                </div>
              )}
              
              {/* 执行动作 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {condition.sleepDuration === -1 ? (
                  <Text style={{ fontSize: '11px', color: '#52c41a' }}>
                    → 休眠至次日凌晨
                  </Text>
                ) : (
                  <>
                    <Text type="secondary" style={{ fontSize: '11px', minWidth: '40px' }}>
                      休眠:
                    </Text>
                    <InputNumber
                      min={1}
                      max={999999}
                      step={1}
                      value={condition.sleepDuration}
                      onChange={(value) => updateCondition(condition.id, { sleepDuration: value || 1 })}
                      size="small"
                      style={{ width: '120px', fontSize: '11px' }}
                      addonAfter="分钟"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部状态信息 */}
      <div style={{ 
        marginTop: '16px',
        padding: '6px 8px',
        background: '#f5f5f5',
        borderRadius: '3px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Text type="secondary" style={{ fontSize: '10px' }}>
          守护状态: {config.enabled ? '启用' : '禁用'}
        </Text>
        <Text type="secondary" style={{ fontSize: '10px' }}>
          激活条件: {config.conditions.filter(c => c.enabled).length}/{config.conditions.length}
        </Text>
      </div>

      {/* 保存按钮 */}
      <div style={{ 
        marginTop: '16px',
        textAlign: 'center'
      }}>
        <Button
          icon={<SaveOutlined />}
          type="primary"
          loading={saving}
          onClick={handleSaveNow}
          style={{ fontSize: '12px' }}
        >
          保存配置
        </Button>
      </div>
      </div>
    </div>
  );
};