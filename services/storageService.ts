import { DocumentMetadata } from '../types';

const STORAGE_KEY = 'signflow_documents_v1';

export const getDocuments = (): DocumentMetadata[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load documents", e);
    return [];
  }
};

export const saveDocument = (doc: DocumentMetadata): void => {
  const docs = getDocuments();
  const existingIndex = docs.findIndex(d => d.id === doc.id);
  
  if (existingIndex >= 0) {
    docs[existingIndex] = doc;
  } else {
    docs.unshift(doc);
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.error("Storage quota exceeded probably", e);
    alert("Local storage full. Cannot save document.");
  }
};

export const deleteDocument = (id: string): void => {
  const docs = getDocuments().filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
};

export const getDocumentById = (id: string): DocumentMetadata | undefined => {
  return getDocuments().find(d => d.id === id);
};