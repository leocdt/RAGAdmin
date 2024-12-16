import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Popconfirm, Modal, App } from 'antd';
import { FileText, FileImage, File, Trash2, Eye } from 'lucide-react';
import axios from 'axios';
import Paragraph from 'antd/es/typography/Paragraph';

interface Document {
  id: string;
  name: string;
  file_type: string;
  upload_date: string;
  chroma_id: string;
}

interface DocumentContent {
  content: string;
  name: string;
  file_type: string;
}

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/documents/`);
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
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}/`);
      message.success('Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      message.error('Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}/content/`);
      setSelectedDocument(response.data);
      setIsModalVisible(true);
    } catch (error) {
      console.error('Error fetching document content:', error);
      message.error('Failed to fetch document content');
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
        <div className="flex space-x-2">
          <Button
            type="text"
            icon={<Eye size={16} className="text-blue-500" />}
            onClick={() => handleView(record.id)}
            loading={loading}
          />
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
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Documents</h1>
      <Table columns={columns} dataSource={documents} rowKey="id" />
      
      <Modal
        title={selectedDocument?.name}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <Paragraph className="whitespace-pre-wrap">
            {selectedDocument?.content}
          </Paragraph>
        </div>
      </Modal>
    </div>
  );
};

export default Documents;