import React, { useState } from 'react';
import { Upload, Button, message, List } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { api } from '../utils/api';

const Documents: React.FC = () => {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/documents/', formData);
      message.success('File uploaded successfully');
      // Rafraîchir la liste des documents
    } catch (error) {
      message.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Document Management</h1>
      
      <Upload
        beforeUpload={(file) => {
          handleUpload(file);
          return false;
        }}
        fileList={fileList}
      >
        <Button icon={<UploadOutlined />} loading={uploading}>
          Upload Document
        </Button>
      </Upload>

      {/* Liste des documents */}
      <List
        className="mt-6"
        // ... configuration de la liste des documents
      />
    </div>
  );
};

export default Documents;