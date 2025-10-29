import React from 'react';
import { Checkbox } from 'antd';
import { Business } from '@model/business.entity';

interface BusinessTypeManagerProps {
  businessList: Business[];
  onBusinessChange: (checkedBusinessList: Business[]) => void;
}

export const BusinessTypeManager: React.FC<BusinessTypeManagerProps> = ({
  businessList,
  onBusinessChange
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 12px',
      background: 'rgba(255, 255, 255, 0.8)',
      borderRadius: '8px',
      border: '1px solid rgba(0, 0, 0, 0.1)'
    }}>
      <span style={{ 
        fontSize: '13px', 
        fontWeight: '600', 
        color: '#666',
        minWidth: '60px'
      }}>
        📋 业务类型:
      </span>
      <Checkbox.Group
        value={businessList.filter(b => b.chose).map(b => b.code)}
        onChange={(checkedValues: string[]) => {
          console.log('复选框变化:', checkedValues);
          const updatedBusinessList = businessList.map(business => ({
            ...business,
            chose: checkedValues.includes(business.code)
          }));
          console.log('更新后的业务列表:', updatedBusinessList);
          onBusinessChange(updatedBusinessList);
        }}
        style={{ display: 'flex', gap: '12px' }}
      >
        {businessList.map(business => (
          <Checkbox 
            key={business.code} 
            value={business.code}
          >
            {business.name}
          </Checkbox>
        ))}
      </Checkbox.Group>
    </div>
  );
};
