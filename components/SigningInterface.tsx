import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Share2, PenTool, Mail, Copy, Check, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import SignatureCanvas from 'react-signature-canvas';
import { DocumentMetadata, SignatureLocation } from '../types';
import { embedSignatures } from '../services/pdfUtils';
import { saveDocument } from '../services/storageService';

interface SigningInterfaceProps {
  document: DocumentMetadata;
  onBack: () => void;
  onSave: () => void;
}

const SigningInterface: React.FC<SigningInterfaceProps> = ({ document, onBack, onSave }) => {
  const [currentDoc, setCurrentDoc] = useState<DocumentMetadata>(document);
  const [numPages, setNumPages] = useState(0);
  const [activeSignId, setActiveSignId] = useState<string | null>(null);
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const sigPadRef = useRef<SignatureCanvas>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Initialize PDF
  useEffect(() => {
    const loadPdf = async () => {
      const pdfData = atob(currentDoc.originalPdfData.split(',')[1]);
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      setNumPages(pdf.numPages);
      
      // Render all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const canvas = canvasRefs.current[i - 1];
        if (canvas) {
          const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better quality
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          const renderContext = {
            canvasContext: canvas.getContext('2d')!,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
        }
      }
    };
    loadPdf();
  }, [currentDoc.originalPdfData]);

  // Handle clicking a signature box
  const handleBoxClick = (sig: SignatureLocation) => {
    // Only allow changing if not signed yet (or allow overwrite)
    setActiveSignId(sig.id);
    setIsSigningModalOpen(true);
  };

  // Save Signature from Pad to State
  const confirmSignature = () => {
    if (sigPadRef.current && activeSignId) {
      if (sigPadRef.current.isEmpty()) {
        alert("Please draw a signature first");
        return;
      }
      const dataUrl = sigPadRef.current.getTrimmedCanvas().toDataURL('image/png');
      
      // Update local state
      const updatedSignatures = currentDoc.signatures.map(s => 
        s.id === activeSignId ? { ...s, value: dataUrl } : s
      );
      
      setCurrentDoc({ ...currentDoc, signatures: updatedSignatures });
      setIsSigningModalOpen(false);
      setActiveSignId(null);
    }
  };

  // Final Save: Embed into PDF
  const handleFinalSave = async () => {
    setIsSaving(true);
    try {
      const signedPdfBase64 = await embedSignatures(currentDoc.originalPdfData, currentDoc.signatures);
      
      const isFullySigned = currentDoc.signatures.every(s => s.value);
      
      const updatedDoc: DocumentMetadata = {
        ...currentDoc,
        status: isFullySigned ? 'signed' : 'unsigned',
        signedPdfData: signedPdfBase64
      };
      
      saveDocument(updatedDoc);
      alert("Document saved successfully!");
      setShowShareMenu(true);
    } catch (e) {
      console.error(e);
      alert("Error saving document.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async (method: 'native' | 'copy' | 'mail') => {
    if (!currentDoc.signedPdfData && !currentDoc.originalPdfData) return;
    
    // Prefer signed data if available
    const dataToShare = currentDoc.signedPdfData || currentDoc.originalPdfData;

    // Create a Blob
    const byteCharacters = atob(dataToShare.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const file = new File([blob], `${currentDoc.filename.replace('.pdf', '')}_signed.pdf`, { type: 'application/pdf' });

    if (method === 'native' && navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: currentDoc.title,
          text: 'Here is the signed document.',
        });
      } catch (err) {
        console.log("Share canceled or failed", err);
      }
    } else if (method === 'copy') {
      // It's hard to copy a file to clipboard directly in all browsers, so we copy a link or just metadata
      alert("File is ready. In a real app, this would copy a download link.");
    } else if (method === 'mail') {
        window.location.href = `mailto:?subject=${encodeURIComponent(currentDoc.title)}&body=Please find the attached document.`;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center z-20">
        <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="mr-2" size={20} />
          Back
        </button>
        <div className="text-center hidden md:block">
           <h2 className="font-bold text-gray-800">{currentDoc.title}</h2>
           <p className="text-xs text-gray-500">{currentDoc.signatures.filter(s => s.value).length} / {currentDoc.signatures.length} signatures</p>
        </div>
        <div className="flex gap-2">
          {showShareMenu ? (
             <div className="relative flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                 <button onClick={() => handleShare('native')} className="bg-blue-100 text-blue-700 p-2 rounded-lg"><Share2 size={20}/></button>
                 <button onClick={() => handleShare('mail')} className="bg-green-100 text-green-700 p-2 rounded-lg"><Mail size={20}/></button>
                 <button onClick={() => setShowShareMenu(false)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm">Close</button>
             </div>
          ) : (
            <button 
              onClick={handleFinalSave}
              disabled={isSaving}
              className="flex items-center bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg shadow-sm font-medium transition-all"
            >
              {isSaving ? <span className="animate-spin mr-2">⏳</span> : <Save className="mr-2" size={18} />}
              Save & Finish
            </button>
          )}
        </div>
      </div>

      {/* Main Content (Scrollable) */}
      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
        <div className="space-y-8 relative">
          {Array.from({ length: numPages }).map((_, pageIndex) => (
            <div key={pageIndex} className="relative shadow-xl">
              <canvas
                ref={el => canvasRefs.current[pageIndex] = el}
                className="block bg-white rounded-sm w-full h-auto max-w-[900px]"
              />
              {/* Overlay Signature Boxes */}
              {currentDoc.signatures
                .filter(s => s.pageIndex === pageIndex)
                .map(sig => (
                  <button
                    key={sig.id}
                    onClick={() => handleBoxClick(sig)}
                    style={{
                      position: 'absolute',
                      left: `${sig.x * 100}%`,
                      top: `${sig.y * 100}%`,
                      width: `${sig.width * 100}%`,
                      height: `${sig.height * 100}%`,
                    }}
                    className={`
                      border-2 rounded-md transition-all group flex items-center justify-center overflow-hidden
                      ${sig.value 
                        ? 'border-green-500 bg-white/0' 
                        : 'border-brand-500 bg-brand-500/10 hover:bg-brand-500/20'
                      }
                    `}
                  >
                    {sig.value ? (
                      <img src={sig.value} alt="Signature" className="w-full h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center text-brand-700">
                        <PenTool size={16} />
                        <span className="text-[10px] font-bold uppercase mt-1">Sign Here</span>
                      </div>
                    )}
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Signature Modal */}
      {isSigningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
             <div className="p-4 border-b flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-gray-800">Draw Your Signature</h3>
               <button onClick={() => setIsSigningModalOpen(false)}><X className="text-gray-500" /></button>
             </div>
             
             <div className="p-4 bg-gray-100 flex justify-center">
               <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg">
                 <SignatureCanvas 
                    ref={sigPadRef}
                    penColor="black"
                    canvasProps={{width: 400, height: 200, className: 'cursor-crosshair'}}
                 />
               </div>
             </div>

             <div className="p-4 flex gap-3 justify-end">
               <button 
                 onClick={() => sigPadRef.current?.clear()} 
                 className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
               >
                 Clear
               </button>
               <button 
                 onClick={confirmSignature}
                 className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium shadow-md"
               >
                 Apply Signature
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SigningInterface;