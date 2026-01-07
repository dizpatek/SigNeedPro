import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Trash2, ExternalLink, Calendar, CheckCircle, Clock } from 'lucide-react';
import { DocumentMetadata } from '../types';
import { getDocuments, deleteDocument } from '../services/storageService';

interface DashboardProps {
  onUploadClick: () => void;
  onOpenDocument: (doc: DocumentMetadata) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onUploadClick, onOpenDocument }) => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'signed' | 'unsigned'>('all');

  const refreshDocs = () => {
    setDocuments(getDocuments());
  };

  useEffect(() => {
    refreshDocs();
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this document?')) {
      deleteDocument(id);
      refreshDocs();
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || doc.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage and sign your company documents.</p>
        </div>
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all transform active:scale-95 font-medium"
        >
          <Plus size={20} />
          <span>Upload PDF</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'unsigned', 'signed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg capitalize font-medium transition-colors ${
                filter === f 
                  ? 'bg-brand-100 text-brand-700' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No documents found</h3>
          <p className="text-gray-500">Upload a new PDF to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onOpenDocument(doc)}
              className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-200 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${doc.status === 'signed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                  <FileText size={24} />
                </div>
                <div className="flex gap-2">
                   {doc.status === 'signed' ? (
                     <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                       <CheckCircle size={12} /> Signed
                     </span>
                   ) : (
                     <span className="flex items-center gap-1 text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                       <Clock size={12} /> Pending
                     </span>
                   )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{doc.title}</h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[2.5em]">{doc.summary}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {doc.tags?.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={(e) => handleDelete(e, doc.id)}
                  className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;