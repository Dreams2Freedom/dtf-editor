'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Trash2,
  Download,
  FolderOpen,
  CheckSquare,
  Square,
  AlertTriangle,
  Info,
  Archive,
  FileImage,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';

interface ProcessedImage {
  id: string;
  user_id: string;
  original_filename: string;
  operation_type: string;
  file_size: number;
  storage_url?: string;
  expires_at?: string;
  created_at: string;
}

interface StorageManagerProps {
  onStorageUpdate?: () => void;
}

export function StorageManager({ onStorageUpdate }: StorageManagerProps) {
  const { user } = useAuthStore();
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'selected' | 'expired' | 'all'>(
    'selected'
  );
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchImages();
    }
  }, [user]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const supabase = createClientSupabaseClient();

      // Use RPC function to fetch images
      const { data, error } = await supabase.rpc('get_user_images', {
        p_user_id: user.id,
      });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const selectAll = () => {
    setSelectedImages(new Set(images.map(img => img.id)));
  };

  const clearSelection = () => {
    setSelectedImages(new Set());
  };

  const getExpiredImages = () => {
    return images.filter(img => {
      if (!img.expires_at) return false;
      return new Date(img.expires_at) < new Date();
    });
  };

  const getExpiringImages = () => {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    return images.filter(img => {
      if (!img.expires_at) return false;
      const expiryDate = new Date(img.expires_at);
      return expiryDate > new Date() && expiryDate < threeDaysFromNow;
    });
  };

  const handleBulkDelete = async () => {
    setProcessing(true);
    const supabase = createClientSupabaseClient();

    try {
      let imagesToDelete: string[] = [];

      switch (deleteType) {
        case 'selected':
          imagesToDelete = Array.from(selectedImages);
          break;
        case 'expired':
          imagesToDelete = getExpiredImages().map(img => img.id);
          break;
        case 'all':
          imagesToDelete = images.map(img => img.id);
          break;
      }

      if (imagesToDelete.length === 0) {
        toast.error('No images to delete');
        return;
      }

      // Delete from database
      // Use RPC function to delete images
      for (const imageId of imagesToDelete) {
        await supabase.rpc('delete_processed_image', {
          p_image_id: imageId,
          p_user_id: user.id,
        });
      }

      // Update local state
      setImages(prev => prev.filter(img => !imagesToDelete.includes(img.id)));
      setSelectedImages(new Set());

      toast.success(
        `Deleted ${imagesToDelete.length} image${imagesToDelete.length > 1 ? 's' : ''}`
      );

      // Notify parent to update storage stats
      if (onStorageUpdate) {
        onStorageUpdate();
      }
    } catch (error) {
      console.error('Error deleting images:', error);
      toast.error('Failed to delete images');
    } finally {
      setProcessing(false);
      setShowDeleteModal(false);
    }
  };

  const handleBulkDownload = async () => {
    const imagesToDownload = images.filter(
      img => selectedImages.has(img.id) && img.storage_url
    );

    if (imagesToDownload.length === 0) {
      toast.error('No images selected for download');
      return;
    }

    // Download each image
    for (const image of imagesToDownload) {
      if (image.storage_url) {
        try {
          const response = await fetch(image.storage_url);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = image.original_filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch (error) {
          console.error('Error downloading image:', error);
          toast.error(`Failed to download ${image.original_filename}`);
        }
      }
    }
  };

  const expiredCount = getExpiredImages().length;
  const expiringCount = getExpiringImages().length;
  const totalSize = images.reduce((sum, img) => sum + (img.file_size || 0), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Storage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Storage Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileImage className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Total Images</span>
              </div>
              <p className="text-2xl font-bold">{images.length}</p>
              <p className="text-xs text-gray-500">{formatBytes(totalSize)}</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium">Expiring Soon</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700">
                {expiringCount}
              </p>
              <p className="text-xs text-yellow-600">Within 3 days</p>
            </div>

            <div className="bg-red-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium">Expired</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{expiredCount}</p>
              <p className="text-xs text-red-600">Ready to delete</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Selected</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {selectedImages.size}
              </p>
              <p className="text-xs text-blue-600">Images selected</p>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={selectAll}
              disabled={images.length === 0}
            >
              <CheckSquare className="w-4 h-4 mr-1" />
              Select All
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={clearSelection}
              disabled={selectedImages.size === 0}
            >
              <Square className="w-4 h-4 mr-1" />
              Clear Selection
            </Button>

            <div className="flex-1" />

            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkDownload}
              disabled={selectedImages.size === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              Download Selected
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setDeleteType('selected');
                setShowDeleteModal(true);
              }}
              disabled={selectedImages.size === 0}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Selected
            </Button>

            {expiredCount > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setDeleteType('expired');
                  setShowDeleteModal(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete Expired ({expiredCount})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {expiringCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900">
                  Images Expiring Soon
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  {expiringCount} image{expiringCount > 1 ? 's are' : ' is'}{' '}
                  expiring within 3 days. Free tier images are automatically
                  deleted after 48 hours.
                </p>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => (window.location.href = '/pricing')}
                >
                  Upgrade to Keep Images
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium">
                {deleteType === 'selected' &&
                  `Delete ${selectedImages.size} selected image${selectedImages.size > 1 ? 's' : ''}?`}
                {deleteType === 'expired' &&
                  `Delete ${expiredCount} expired image${expiredCount > 1 ? 's' : ''}?`}
                {deleteType === 'all' &&
                  `Delete all ${images.length} image${images.length > 1 ? 's' : ''}?`}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                This action cannot be undone. The images will be permanently
                removed.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={processing}
            >
              {processing ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
