import React, { useState, useEffect } from 'react';
import { Card, InputNumber, Space } from 'antd';
import { LogEntry, StatusStats } from '@/app/types/index';

export const LogPanel: React.FC = () => {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [maxLogLines, setMaxLogLines] = useState<number>(50);
  const [statusStats, setStatusStats] = useState<StatusStats>({
    successCount: 0,
    invalidCount: 0,
    currentPort: 0,
  });



  // 初始化日志
  useEffect(() => {
    addLogEntry('系统初始化完成', 'info');
    addLogEntry('界面加载完成', 'info');
    addLogEntry('等待扫码...', 'info');
  }, []);

  // 暴露添加日志的方法到全局
  useEffect(() => {
    (window as any).addLogEntry = addLogEntry;
    return () => {
      delete (window as any).addLogEntry;
    };
  }, []);


    // 添加日志条目
    const addLogEntry = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
      const timestamp = new Date().toLocaleString('zh-CN');
      const logEntry: LogEntry = {
        timestamp,
        message,
        type,
      };
  
      setLogEntries((prev) => {
        const newEntries = [...prev, logEntry];
        // 限制日志条目数量
        if (newEntries.length > maxLogLines) {
          return newEntries.slice(-maxLogLines);
        }
        return newEntries;
      });
    };

  return (
    <Card 
      title="运行日志" 
      className="app-card"
      extra={
        <Space>
          <span>最大行数:</span>
          <InputNumber
            size="small"
            min={10}
            max={1000}
            value={maxLogLines}
            onChange={(value) => setMaxLogLines(value || 50)}
            style={{ width: 80 }}
          />
        </Space>
      }
    >
      <div className="log-container">
        {logEntries.map((entry, index) => (
          <div key={index} className={`log-entry ${entry.type}`}>
            [{entry.timestamp}]: {entry.message}
          </div>
        ))}
      </div>
      
      <div className="status-bar">
        <div className="status-item">
          <span>D赞成功:</span>
          <span className="status-value">{statusStats.successCount}</span>
        </div>
        <div className="status-item">
          <span>无效:</span>
          <span className="status-value">{statusStats.invalidCount}</span>
        </div>
        <div className="status-item">
          <span>端口:</span>
          <span className="status-value">{statusStats.currentPort}</span>
        </div>
      </div>
    </Card>
  );
}; 