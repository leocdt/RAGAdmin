import React from 'react';
import { Select } from 'antd';

interface ModelSidebarProps {
  currentModel: string;
  onModelChange: (model: string) => void;
}

const ModelSidebar: React.FC<ModelSidebarProps> = ({ currentModel, onModelChange }) => {
  const models = [
    { value: 'llama3.1:8b', label: 'Llama 3.1 (8B)' },
    { value: 'llama2:7b', label: 'Llama 2 (7B)' },
    { value: 'mistral:7b', label: 'Mistral (7B)' },
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
            options={models}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default ModelSidebar;