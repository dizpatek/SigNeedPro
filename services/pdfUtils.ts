import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { SignatureLocation } from '../types';

// Set worker source to unpkg cdn for the specific version
// We use a fixed version to ensure compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Extract text for Gemini
export const extractTextFromFirstPage = async (base64Data: string): Promise<string> => {
  try {
    const pdfData = atob(base64Data.split(',')[1]);
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    return textContent.items.map((item: any) => item.str).join(' ');
  } catch (e) {
    console.error("Text extraction failed", e);
    return "";
  }
};

// Scan for "$signature" placeholder
export const scanForSignatures = async (base64Data: string): Promise<SignatureLocation[]> => {
  const signatureLocations: SignatureLocation[] = [];
  try {
    const pdfData = atob(base64Data.split(',')[1]);
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      // Look for items containing the marker
      // Note: PDF text can be fragmented. We assume "$signature" is a single string unit or close enough.
      // A robust system would reconstruct the line, but simple substring check works for many generated PDFs.
      for (const item of textContent.items as any[]) {
        if (item.str.includes('$signature')) {
           // PDF coordinates: origin is bottom-left
           // Viewport: origin is top-left usually
           // item.transform is [scaleX, skewX, skewY, scaleY, x, y]
           
           const tx = item.transform;
           const x = tx[4];
           const y = tx[5];
           
           // Height of text
           const h = item.height || 12; 
           const w = item.width || 100;

           // Normalize to 0-1 based on viewport dimensions
           // IMPORTANT: PDFJS y coordinate is from bottom.
           // We need to convert to top-left for standard HTML/Canvas rendering if not using PDF coordinates directly.
           // However, let's normalize everything relative to page width/height.
           
           // We want the box to be slightly larger than the text
           const boxWidth = 150; 
           const boxHeight = 60;
           
           // Calculate normalized position (assuming Bottom-Left origin from PDF)
           // The Y needs to be flipped for HTML rendering if we render blindly, 
           // but here we just store normalized PDF coords.
           // Let's store normalized "Top-Left" based coordinates for the UI to easily render absolute divs.
           
           // PDF y is from bottom.
           // Viewport height is total height.
           // Top-Left Y = viewport.height - pdfY - fontSize
           
           const pdfY = y;
           const uiY = viewport.height - pdfY - h; // Roughly top of the text
           
           signatureLocations.push({
             id: Math.random().toString(36).substr(2, 9),
             pageIndex: i - 1, // 0-based
             x: x / viewport.width,
             y: uiY / viewport.height,
             width: boxWidth / viewport.width,
             height: boxHeight / viewport.height,
           });
        }
      }
    }
  } catch (e) {
    console.error("Signature scan failed", e);
  }
  return signatureLocations;
};

export const embedSignatures = async (
  originalBase64: string,
  signatures: SignatureLocation[]
): Promise<string> => {
  const pdfDoc = await PDFDocument.load(originalBase64);
  const pages = pdfDoc.getPages();

  for (const sig of signatures) {
    if (!sig.value) continue; // Skip unsigned spots

    const page = pages[sig.pageIndex];
    const { width, height } = page.getSize();

    const pngImage = await pdfDoc.embedPng(sig.value);
    const pngDims = pngImage.scaleToFit(sig.width * width, sig.height * height);

    // Convert UI (Top-Left) Y to PDF (Bottom-Left) Y
    // sig.y is normalized from top.
    // pdfY = height - (sig.y * height) - imageHeight
    const xPos = sig.x * width;
    const yPos = height - (sig.y * height) - pngDims.height; 

    page.drawImage(pngImage, {
      x: xPos,
      y: yPos,
      width: pngDims.width,
      height: pngDims.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  
  // Convert Uint8Array to Base64
  let binary = '';
  const len = pdfBytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(pdfBytes[i]);
  }
  return `data:application/pdf;base64,${btoa(binary)}`;
};