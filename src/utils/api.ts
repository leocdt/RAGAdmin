const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Token ${token}` : '',
  };
};

export const api = {
  get: async (url: string) => {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api${url}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  },

  post: async (url: string, data: any) => {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api${url}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  },

  delete: async (url: string) => {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api${url}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return response;
  },
}; 