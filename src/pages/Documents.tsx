import React, { useState, useEffect } from 'react';
import { Table, Tag } from 'antd';
import { FileText, FileImage, File } from 'lucide-react';
import axios from 'axios';

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'md' | 'txt';
  size: number;
  uploadDate: string;
}

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
  const fetchDocuments = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/documents/');
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      message.error('Failed to fetch documents');
    }
  };

  fetchDocuments();
}, []);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Document) => (
        <span className="flex items-center">
          {record.type === 'pdf' && <FileText size={16} className="mr-2 text-red-500" />}
          {record.type === 'md' && <FileImage size={16} className="mr-2 text-blue-500" />}
          {record.type === 'txt' && <File size={16} className="mr-2 text-green-500" />}
          {text}
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'pdf' ? 'red' : type === 'md' ? 'blue' : 'green'}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => `${(size / 1024).toFixed(2)} KB`,
    },
    {
      title: 'Upload Date',
      dataIndex: 'uploadDate',
      key: 'uploadDate',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Documents</h1>
      <Table columns={columns} dataSource={documents} rowKey="id" />
    </div>
  );
};

export default Documents;