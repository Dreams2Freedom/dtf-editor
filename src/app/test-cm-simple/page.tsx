'use client';

import { useState } from 'react';

export default function TestCMSimple() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setError(null);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/clippingmagic/upload-large', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('Upload response:', result);

      if (result.success) {
        setUploadResult(result.image);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const openEditor = () => {
    if (!uploadResult) return;

    // Open test editor page with image info
    const url = `/test-cm-editor?id=${uploadResult.id}&secret=${uploadResult.secret}`;
    window.open(url, '_blank', 'width=1200,height=800');
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Simple ClippingMagic Test</h1>

      <div className="space-y-6">
        {/* File Selection */}
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Step 1: Select Image</h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="mb-2"
          />
          {imageFile && (
            <p className="text-sm text-gray-600">Selected: {imageFile.name}</p>
          )}
        </div>

        {/* Upload */}
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">
            Step 2: Upload to ClippingMagic
          </h2>
          <button
            onClick={uploadImage}
            disabled={!imageFile || isUploading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>

          {uploadResult && (
            <div className="mt-2 p-2 bg-green-100 rounded text-sm">
              <p>✓ Upload successful!</p>
              <p>ID: {uploadResult.id}</p>
              <p>Secret: {uploadResult.secret.substring(0, 10)}...</p>
            </div>
          )}
        </div>

        {/* Open Editor */}
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Step 3: Open Editor</h2>
          <button
            onClick={openEditor}
            disabled={!uploadResult}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
          >
            Open ClippingMagic Editor
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {/* Debug Info */}
        <div className="border rounded p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">Debug Info</h3>
          <div className="text-xs font-mono">
            <p>File selected: {imageFile ? 'Yes' : 'No'}</p>
            <p>Upload result: {uploadResult ? 'Success' : 'None'}</p>
            <p>API endpoint: /api/clippingmagic/upload-large</p>
          </div>
        </div>
      </div>
    </div>
  );
}
