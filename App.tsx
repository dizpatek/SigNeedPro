import React, { useState } from 'react';
import { AppView, DocumentMetadata } from './types';
import Dashboard from './components/Dashboard';
import UploadModal from './components/UploadModal';
import SigningInterface from './components/SigningInterface';

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [activeDocument, setActiveDocument] = useState<DocumentMetadata | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Navigation Handlers
  const handleOpenDocument = (doc: DocumentMetadata) => {
    setActiveDocument(doc);
    setCurrentView(AppView.SIGNING);
  };

  const handleBackToDashboard = () => {
    setActiveDocument(null);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleUploadComplete = () => {
    setIsUploadModalOpen(false);
    // Dashboard will auto-refresh due to its internal useEffect on localStorage, 
    // but in a real app using React Query/SWR would be better. 
    // For this simplified version, we force a re-render by toggling view slightly or relying on the Dashboard's mount.
    // Actually, passing a key to Dashboard or a refresh signal is cleaner.
    window.location.reload(); // Simple brute force refresh for this demo scope
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {currentView === AppView.DASHBOARD && (
        <Dashboard 
          onUploadClick={() => setIsUploadModalOpen(true)}
          onOpenDocument={handleOpenDocument}
        />
      )}

      {currentView === AppView.SIGNING && activeDocument && (
        <SigningInterface 
          document={activeDocument} 
          onBack={handleBackToDashboard}
          onSave={handleBackToDashboard}
        />
      )}

      {isUploadModalOpen && (
        <UploadModal 
          onClose={() => setIsUploadModalOpen(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}

export default App;