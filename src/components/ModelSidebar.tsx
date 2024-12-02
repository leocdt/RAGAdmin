import React, { useEffect, useState } from 'react';
import { Select } from 'antd';
import axios from 'axios';
import { updateSettings, getOllamaModels } from '../services/api';
import { API_URL } from '../services/api';

interface ModelSidebarProps {
  currentModel: string;
  onModelChange: (model: string) => void;
}

const ModelSidebar: React.FC<ModelSidebarProps> = ({ currentModel, onModelChange }) => {
  const [models, setModels] = useState<{ value: string; label: string }[]>([]);

  const handleModelChange = async (value: string) => {
    try {
      await updateSettings(value);
      onModelChange(value);
    } catch (error) {
      console.error('Error updating model:', error);
      // You might want to add error handling UI here
    }
  };

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const modelNames = await getOllamaModels();
        const modelsList = modelNames.map((model: string) => ({
          value: model,
          label: formatModelName(model)
        }));
        setModels(modelsList);
      } catch (error) {
        console.error('Error fetching models:', error);
        setModels([
          { value: 'llama2', label: 'Llama 2' },
          { value: 'mistral', label: 'Mistral' },
        ]);
      }
    };

    fetchModels();
  }, []);

  // Helper function to format model names nicely
  const formatModelName = (modelId: string): string => {
    const [name, size] = modelId.split(':');
    const formattedName = name
      .split(/[._-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return size ? `${formattedName} (${size.toUpperCase()})` : formattedName;
  };

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
            onChange={handleModelChange}
            options={models}
            className="w-full"
            loading={models.length === 0}
          />
        </div>
      </div>
    </div>
  );
};

export default ModelSidebar;