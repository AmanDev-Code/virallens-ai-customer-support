import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { HardDrive, Trash2, Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';

export default function MemoryModal({ isOpen, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [totalUsedBytes, setTotalUsedBytes] = useState(0);
  const [maxBytes, setMaxBytes] = useState(10 * 1024 * 1024);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen]);

  const fetchDocuments = async () => {
    try {
      const res = await apiRequest('/documents');
      setDocuments(res.documents || []);
      setTotalUsedBytes(res.totalUsedBytes || 0);
      setMaxBytes(res.maxBytes || 10 * 1024 * 1024);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('virallens_token');
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess(`Successfully uploaded and indexed "${file.name}" into vector memory.`);
      fetchDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleDelete = async (id) => {
    try {
      setError('');
      setSuccess('');
      const res = await apiRequest(`/documents/${id}`, { method: 'DELETE' });
      setDocuments(res.documents || []);
      setTotalUsedBytes(res.totalUsedBytes || 0);
      setSuccess('Document deleted and memory freed successfully.');
      fetchDocuments();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  const usedMB = (totalUsedBytes / (1024 * 1024)).toFixed(2);
  const maxMB = (maxBytes / (1024 * 1024)).toFixed(1);
  const percentage = Math.min(100, (totalUsedBytes / maxBytes) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#121726] border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0e121e]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-base">User Memory & Vector Documents</h2>
              <p className="text-xs text-slate-400">Manage uploaded files for semantic RAG search (10MB limit)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Storage Meter */}
          <div className="bg-[#0a0c14] border border-slate-800/80 p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Storage Quota Used</span>
              <span className="text-indigo-400">{usedMB} MB / {maxMB} MB ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  percentage > 85 ? 'bg-red-500' : percentage > 60 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Upload Button */}
          <div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-6 cursor-pointer bg-[#0a0c14]/50 hover:bg-[#0a0c14] transition-all group">
              <div className="p-3 rounded-full bg-indigo-600/10 text-indigo-400 group-hover:scale-110 transition-transform mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {uploading ? 'Processing & embedding into vector memory...' : 'Click to upload document (TXT, MD, PDF, JSON)'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Files are indexed for semantic search in your chat sessions</p>
              <input
                type="file"
                disabled={uploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Document List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Uploaded Documents ({documents.length})</h3>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No documents uploaded yet. Upload notes or specs to give your AI assistant custom context.
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between bg-[#0a0c14] border border-slate-800 p-3.5 rounded-xl">
                    <div className="flex items-center space-x-3 truncate">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-200 truncate">{doc.originalName}</p>
                        <p className="text-[10px] text-slate-400">{(doc.size / 1024).toFixed(1)} KB • {new Date(doc.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Delete document and free memory"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0e121e] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
