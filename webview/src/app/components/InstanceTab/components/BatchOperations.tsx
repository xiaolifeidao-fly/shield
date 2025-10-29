import React from 'react';
import { Button, Space } from 'antd';
import { 
  PlusOutlined, 
  ReloadOutlined, 
  ThunderboltOutlined, 
  PauseCircleOutlined 
} from '@ant-design/icons';
import { Instance } from './types';

interface BatchOperationsProps {
  loading: Record<string, boolean>;
  onCreateNewInstance: () => void;
  onRefreshInstances: () => void;
  onBatchStart: () => void;
  onBatchStop: () => void;
}

export const BatchOperations: React.FC<BatchOperationsProps> = ({
  loading,
  onCreateNewInstance,
  onRefreshInstances,
  onBatchStart,
  onBatchStop
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      gap: '12px', 
      flexWrap: 'wrap', 
      marginTop: 16,
      padding: '16px',
      background: 'rgba(255, 255, 255, 0.3)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.5)'
    }}>
      <Button
        type="primary"
        className="gradient-btn"
        icon={<PlusOutlined />}
        loading={loading.create}
        onClick={onCreateNewInstance}
        style={{ 
          minWidth: '120px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
          fontSize: '13px',
          fontWeight: 'bold'
        }}
      >
        🎆 创建新实例
      </Button>
      <Button
        icon={<ReloadOutlined />}
        loading={loading.refresh}
        onClick={onRefreshInstances}
        style={{ 
          minWidth: '120px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
          border: 'none',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(116, 185, 255, 0.3)',
          fontSize: '13px',
          fontWeight: 'bold'
        }}
      >
        🔄 刷新全部
      </Button>
      <Button
        icon={<ThunderboltOutlined />}
        loading={loading.batchStart}
        onClick={onBatchStart}
        style={{ 
          minWidth: '120px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #55a3ff 0%, #003d82 100%)',
          border: 'none',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(82, 196, 26, 0.3)',
          fontSize: '13px',
          fontWeight: 'bold'
        }}
      >
        ⚡ 一键启动
      </Button>
      <Button
        danger
        icon={<PauseCircleOutlined />}
        loading={loading.batchStop}
        onClick={onBatchStop}
        style={{ 
          minWidth: '120px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #ff7675 0%, #d63031 100%)',
          border: 'none',
          boxShadow: '0 2px 8px rgba(255, 118, 117, 0.3)',
          fontSize: '13px',
          fontWeight: 'bold'
        }}
      >
        ⏸️ 一键暂停
      </Button>
    </div>
  );
};
