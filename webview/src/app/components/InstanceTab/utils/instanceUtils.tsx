import React from 'react';
import { Tag } from 'antd';
import { PlayCircleOutlined, StopOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Instance, InstanceRunningStatus } from '../types';
import { Business } from '@model/business.entity';

// 获取运行状态标签
export const getRunningStatusTag = (status: string) => {
  if (status === 'running') {
    return (
      <Tag color="green" icon={<PlayCircleOutlined />}>
        运行中
      </Tag>
    );
  } else {
    return (
      <Tag color="default" icon={<StopOutlined />}>
        已停止
      </Tag>
    );
  }
};

// 获取登录状态标签
export const getLoginStatus = (status: Instance) => {
  if (status.isLogin === true) {
    return (
      <Tag color="green" icon={<PlayCircleOutlined />}>
        已登录
      </Tag>
    );
  } else {
    return (
      <Tag color="default" icon={<StopOutlined />}>
        未登录
      </Tag>
    );
  }
};

// 获取异常状态标签
export const getExceptionStatus = (status: Instance) => {
  if (status.isException === true) {
    return (
      <Tag color="red" icon={<StopOutlined />}>
         点赞异常
      </Tag>
    );
  }
  return <></>;
};

// 获取锁定状态标签
export const getLockStatus = (instance: Instance, businessList: Business[]) => {
  const lockStatusTags: JSX.Element[] = [];
  
  // 遍历所有业务类型，检查每个业务的锁定状态
  businessList.forEach(business => {
    const lockTime = instance.lockTimes?.get(business.code);
    
    if (lockTime && lockTime > 0) {
      const lockTimeDate = new Date(lockTime);
      const now = new Date();
      let lockTimeString = "";
      let lockTimeColor = "red";
      
      if (now.getTime() > lockTimeDate.getTime()) {
        lockTimeString = "已解封,请尝试运行任务";
        lockTimeColor = "orange";
      } else {
        const diffTime = Math.abs(now.getTime() - lockTimeDate.getTime());
        const hours = Math.floor(diffTime / (1000 * 60 * 60));
        const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
        const hoursString = hours.toString().padStart(2, '0');
        const minutesString = minutes.toString().padStart(2, '0');
        lockTimeString = `解封预计还有 ${hoursString}小时${minutesString}分`;
      }
      
      lockStatusTags.push(
        <Tag key={`lock-${business.code}`} color={lockTimeColor} icon={<StopOutlined />}>
          {business.name}封禁 {lockTimeString}
        </Tag>
      );
    }
  });
  
  return <>{lockStatusTags}</>;
};

// 休眠状态显示（增强版，支持实时倒计时）
export const getSleepStatus = (instance: Instance, businessList: Business[]) => {
  const sleepStatusTags: JSX.Element[] = [];
  
  // 遍历所有业务类型，检查每个业务的休眠状态
  businessList.forEach(business => {
    const sleepFlag = instance.sleepFlags?.get(business.code);
    const sleepTime = instance.sleepTimes?.get(business.code);
    
    if (sleepFlag === true && sleepTime) {
      const sleepEndTime = new Date(sleepTime);
      const now = new Date();
      
      if (now.getTime() < sleepEndTime.getTime()) {
        const diffTime = sleepEndTime.getTime() - now.getTime();
        const hours = Math.floor(diffTime / (1000 * 60 * 60));
        const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);
        
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        sleepStatusTags.push(
          <Tag key={`sleep-${business.code}`} color="purple" icon={<ClockCircleOutlined />}>
            😴 {business.name}休眠中 {timeString}
          </Tag>
        );
      } else {
        // 休眠时间已过，但标志位还是true，显示为休眠结束
        sleepStatusTags.push(
          <Tag key={`sleep-end-${business.code}`} color="orange" icon={<ClockCircleOutlined />}>
            {business.name}休眠结束，可以启动
          </Tag>
        );
      }
    }
  });
  
  return <>{sleepStatusTags}</>;
};

// 休眠理由显示
export const getSleepReason = (instance: Instance, businessList: Business[]) => {
  const sleepReasonAlerts: JSX.Element[] = [];
  
  // 遍历所有业务类型，显示每个业务的休眠理由
  businessList.forEach(business => {
    const sleepFlag = instance.sleepFlags?.get(business.code);
    const sleepReason = instance.sleepReasons?.get(business.code);
    
    if (sleepFlag === true && sleepReason) {
      sleepReasonAlerts.push(
        <div key={`sleep-reason-${business.code}`} style={{ marginTop: 4 }}>
          <div style={{
            padding: '8px 12px',
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#d46b08'
          }}>
            <strong>{business.name}休眠原因:</strong> {sleepReason}
          </div>
        </div>
      );
    }
  });
  
  return <>{sleepReasonAlerts}</>;
};

// 获取状态徽章
export const getStatusBadge = (instance: Instance) => {
  if (instance.uid) {
    return <span style={{ color: '#1890ff', cursor: 'pointer' }}>
      {instance.uid + "-" + instance.nickName}
    </span>;
  } else {
    return <span style={{ color: '#faad14' }}>未绑定uid</span>;
  }
};

// 格式化时间显示
export const formatTimeDisplay = (instance: Instance) => {
  if (instance.isLogin !== false) {
    return `创建: ${new Date(instance.createdAt).toLocaleString('zh-CN')}`;
  } else {
    return `最后更新: ${new Date(instance.lastActiveAt).toLocaleString('zh-CN')}`;
  }
};
