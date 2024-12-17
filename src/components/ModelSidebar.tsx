import React from 'react';
import { Select } from 'antd';

interface ModelSidebarProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  models: string[];
}

const ModelSidebar: React.FC<ModelSidebarProps> = ({ currentModel, onModelChange, models }) => {
  const modelOptions = models.length > 0
    ? models.map(model => ({ value: model, label: model }))
    : [
        { value: 'Failed to load models', label: 'Failed to load models' }
      ];

  return (
    <div className="w-64 bg-white border-l h-full p-4 container-model-sidebar">
      <h3 className="text-lg font-semibold mb-4 container-model-sidebar-title">Model Settings</h3>
      <div className="space-y-4">
        <div className='container-list-model'>
          <label className="block text-sm font-medium mb-2 ">
            LLM Model
          </label>
          <Select
            value={currentModel}
            onChange={onModelChange}
            options={modelOptions}
            className="w-full"
            loading={models.length === 0}
          />
        </div>
      </div>
    </div>
  );
};

export default ModelSidebar;