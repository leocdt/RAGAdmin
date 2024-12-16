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
        { value: 'llama3.1:8b', label: 'Llama 3.1 (8B)' },
        { value: 'llama3.1:13b', label: 'Llama 3.1 (13B)' },
        { value: 'llama3.1:70b', label: 'Llama 3.1 (70B)' },
      ];

  return (
    <div className="w-64 bg-white border-l h-full p-4">
      <h3 className="text-lg font-semibold mb-4">Model Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
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