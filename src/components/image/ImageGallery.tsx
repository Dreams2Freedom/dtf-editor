'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  Calendar,
  Clock,
  AlertCircle,
  Grid,
  List,
  Search,
  Filter
} from 'lucide-react';
import { toast } from '@/lib/toast';
import Image from 'next/image';

interface ProcessedImage {
  id: string;
  user_id: string;
  original_filename: string;
  processed_filename: string;
  operation_type: 'upscale' | 'background-removal' | 'vectorize' | 'generate';
  file_size: number;
  width?: number;
  height?: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  storage_url?: string;
  thumbnail_url?: string;
  expires_at?: string;
  created_at: string;
  metadata?: {
    credits_used?: number;
    processing_time_ms?: number;
    api_used?: string;
  };
}

export function ImageGallery() {
  const { user, profile } = useAuthStore();
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    if (user) {
      fetchImages();
    }
  }, [user, sortBy, filterType]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const supabase = createClientSupabaseClient();
      
      // Use RPC function to fetch images
      const { data, error } = await supabase.rpc('get_user_images', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching images:', error);
        toast.error('Failed to load images');
        return;
      }

      let images = data || [];
      
      // Apply client-side filtering
      if (filterType !== 'all') {
        images = images.filter(img => img.operation_type === filterType);
      }
      
      // Apply client-side sorting
      images.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
      });

      setImages(images);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (image: ProcessedImage) => {
    if (!image.storage_url) {
      toast.error('Image not available for download');
      return;
    }

    try {
      const response = await fetch(image.storage_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.processed_filename || image.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download image');
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      const supabase = createClientSupabaseClient();
      const { data: deleted, error } = await supabase.rpc('delete_processed_image', {
        p_image_id: imageId,
        p_user_id: user.id
      });

      if (error) {
        throw error;
      }

      if (deleted) {
        setImages(images.filter(img => img.id !== imageId));
        toast.success('Image deleted successfully');
      } else {
        toast.error('Image not found or already deleted');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete image');
    }
  };

  const getStorageInfo = () => {
    const plan = profile?.subscription_plan || 'free';
    const isPaidUser = plan !== 'free';
    const isPayAsYouGo = profile?.last_credit_purchase_at && !isPaidUser;

    if (isPaidUser) {
      return {
        text: 'Your images are stored permanently',
        icon: <ImageIcon className="w-4 h-4 text-green-600" />,
        color: 'text-green-600'
      };
    } else if (isPayAsYouGo) {
      return {
        text: 'Images stored for 90 days after last credit purchase',
        icon: <Clock className="w-4 h-4 text-amber-600" />,
        color: 'text-amber-600'
      };
    } else {
      return {
        text: 'Free plan: Images deleted after 48 hours',
        icon: <AlertCircle className="w-4 h-4 text-red-600" />,
        color: 'text-red-600'
      };
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getOperationLabel = (type: string) => {
    const labels: Record<string, string> = {
      'upscale': 'Upscaled',
      'background-removal': 'Background Removed',
      'vectorize': 'Vectorized',
      'generate': 'AI Generated'
    };
    return labels[type] || type;
  };

  const getOperationColor = (type: string) => {
    const colors: Record<string, string> = {
      'upscale': 'bg-blue-100 text-blue-800',
      'background-removal': 'bg-purple-100 text-purple-800',
      'vectorize': 'bg-orange-100 text-orange-800',
      'generate': 'bg-green-100 text-green-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const filteredImages = images.filter(img => 
    searchTerm === '' || 
    img.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    img.processed_filename?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const storageInfo = getStorageInfo();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>My Images</CardTitle>
            <div className={`flex items-center gap-2 mt-2 text-sm ${storageInfo.color}`}>
              {storageInfo.icon}
              <span>{storageInfo.text}</span>
            </div>
            {/* Version indicator - v2 with native buttons */}
            <div className="text-xs text-gray-400 mt-1">Gallery v2.2 - Fixed Aug 26 7:56PM</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            />
          </div>
          {/* Filters - responsive grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="upscale">Upscaled</option>
              <option value="background-removal">BG Removed</option>
              <option value="vectorize">Vectorized</option>
              <option value="generate">AI Generated</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Images */}
        {filteredImages.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No images found matching your search' : 'No processed images yet'}
            </p>
            <Button onClick={() => window.location.href = '/process'}>
              Process Your First Image
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredImages.map((image) => (
              <div key={image.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="aspect-square relative bg-gray-100">
                  {image.thumbnail_url ? (
                    <Image
                      src={image.thumbnail_url}
                      alt={image.original_filename}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {image.original_filename}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getOperationColor(image.operation_type)}`}>
                      {getOperationLabel(image.operation_type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(image.file_size)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(image.created_at).toLocaleDateString()}
                  </div>
                  {image.expires_at && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                      <Clock className="w-3 h-3" />
                      Expires {new Date(image.expires_at).toLocaleDateString()}
                    </div>
                  )}
                  {/* Action buttons - always visible using native HTML */}
                  <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleDownload(image)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100"
                      type="button"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-300 rounded hover:bg-red-50 active:bg-red-100"
                      type="button"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredImages.map((image) => (
              <div key={image.id} className="flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 relative bg-gray-100 rounded">
                    {image.thumbnail_url ? (
                      <Image
                        src={image.thumbnail_url}
                        alt={image.original_filename}
                        fill
                        className="object-cover rounded"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{image.original_filename}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getOperationColor(image.operation_type)}`}>
                        {getOperationLabel(image.operation_type)}
                      </span>
                      <span>{formatFileSize(image.file_size)}</span>
                      <span>{new Date(image.created_at).toLocaleDateString()}</span>
                      {image.expires_at && (
                        <span className="text-red-600">
                          Expires {new Date(image.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(image)}
                    className="flex items-center justify-center p-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100"
                    type="button"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(image.id)}
                    className="flex items-center justify-center p-2 text-red-600 bg-white border border-red-300 rounded hover:bg-red-50 active:bg-red-100"
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}