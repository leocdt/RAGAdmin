import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Popconfirm, message } from 'antd';
import { FileText, FileImage, File, Trash2 } from 'lucide-react';
import axios from 'axios';

interface Document {
  id: string;
  name: string;
  file_type: string;
  upload_date: string;
  chroma_id: string;
}

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/documents/');
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      message.error('Failed to fetch documents');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await axios.delete(`http://localhost:8000/api/documents/${id}/`);
      message.success('Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      message.error('Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Document) => (
        <span className="flex items-center">
          {record.file_type === 'pdf' && <FileText size={16} className="mr-2 text-red-500" />}
          {record.file_type === 'md' && <FileImage size={16} className="mr-2 text-blue-500" />}
          {record.file_type === 'txt' && <File size={16} className="mr-2 text-green-500" />}
          {text}
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'file_type',
      key: 'file_type',
      render: (type: string) => (
        <Tag color={type === 'pdf' ? 'red' : type === 'md' ? 'blue' : 'green'}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Upload Date',
      dataIndex: 'upload_date',
      key: 'upload_date',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Document) => (
        <Popconfirm
          title="Delete Document"
          description="Are you sure you want to delete this document?"
          onConfirm={() => handleDelete(record.id)}
          okText="Yes"
          cancelText="No"
          okButtonProps={{ danger: true }}
        >
          <Button 
            type="text"
            danger
            icon={<Trash2 size={16} />}
            loading={loading}
            className="flex items-center hover:text-red-700"
          >
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Documents</h1>
      <Table 
        columns={columns} 
        dataSource={documents} 
        rowKey="id"
        loading={loading}
      />
    </div>
  );
};

export default Documents;