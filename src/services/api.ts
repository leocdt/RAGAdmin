import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface ChatResponse {
    response: string;
    sources?: any[];
    error?: string;
}

interface OllamaModelsResponse {
    models: string[];
}

export const getOllamaModels = async (): Promise<string[]> => {
    try {
        const response = await axios.get(`${API_URL}/models/`);
        return response.data.models;
    } catch (error) {
        console.error('Error fetching Ollama models:', error);
        return [];
    }
};

export const sendMessage = async (
    message: string, 
    chatId: string, 
    selectedModel: string
): Promise<ChatResponse> => {
    try {
        const response = await axios.post(`${API_URL}/chat/`, {
            message,
            chat_id: chatId,
            model: selectedModel
        });
        return response.data;
    } catch (error) {
        console.error('Error sending message:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error || 'Failed to send message');
        }
        throw new Error('Failed to send message');
    }
};

export const updateSettings = async (model: string): Promise<void> => {
    try {
        await axios.post(`${API_URL}/settings/update/`, {
            model
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
};