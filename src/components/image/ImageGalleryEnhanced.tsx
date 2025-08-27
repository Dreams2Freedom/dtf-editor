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
  Filter,
  CheckSquare,
  Square,
  FolderPlus,
  X,
  ChevronDown,
  Archive,
  MoreVertical
} from 'lucide-react';
import { toast } from '@/lib/toast';
import Image from 'next/image';
import { format, subDays, isAfter, isBefore } from 'date-fns';

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

interface Collection {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
}

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

export function ImageGalleryEnhanced() {
  const { user, profile } = useAuthStore();
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size' | 'name'>('newest');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchImages();
      fetchCollections();
    }
  }, [user, sortBy, filterType, dateFilter, customDateRange, selectedCollection]);

  const fetchCollections = async () => {
    try {
      const supabase = createClientSupabaseClient();
      // TODO: Create RPC function for collections
      // For now, just use a default collection
      const defaultCollection = {
        id: 'default',
        name: 'All Images',
        is_default: true
      };
      setCollections([defaultCollection]);
    } catch (error) {
      // Silently fail if collections not implemented yet
    }
  };

  const fetchImages = async () => {
    try {
      setLoading(true);
      const supabase = createClientSupabaseClient();
      
      // Use RPC function to fetch images (same as StorageManager)
      // This bypasses RLS issues and ensures consistency
      const { data, error } = await supabase.rpc('get_user_images', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching images:', error);
        // Don't show toast for this, just return empty array
        setImages([]);
        setLoading(false);
        return;
      }

      let images: ProcessedImage[] = data || [];
      
      // Generate signed URLs for each image
      const supabaseClient = createClientSupabaseClient();
      for (const image of images) {
        // Check if we need to generate a signed URL
        if (image.storage_url) {
          // If it's already a full URL (including signed URLs), extract the path
          if (image.storage_url.startsWith('http')) {
            try {
              const url = new URL(image.storage_url);
              // Extract path from URL if it's a Supabase storage URL
              if (url.pathname.includes('/storage/v1/object/public/images/')) {
                const path = url.pathname.replace('/storage/v1/object/public/images/', '');
                const cleanPath = path.split('?')[0]; // Remove query params
                
                // Generate a fresh signed URL
                const { data: signedUrlData } = await supabaseClient.storage
                  .from('images')
                  .createSignedUrl(cleanPath, 3600); // 1 hour expiry
                
                if (signedUrlData?.signedUrl) {
                  image.storage_url = signedUrlData.signedUrl;
                  image.thumbnail_url = signedUrlData.signedUrl;
                }
              }
              // If it's some other URL, leave it as is
            } catch (e) {
              console.error('Error parsing URL:', e);
            }
          } else {
            // It's just a storage path, generate a signed URL
            const { data: signedUrlData } = await supabaseClient.storage
              .from('images')
              .createSignedUrl(image.storage_url, 3600); // 1 hour expiry
            
            if (signedUrlData?.signedUrl) {
              image.storage_url = signedUrlData.signedUrl;
              image.thumbnail_url = signedUrlData.signedUrl;
            }
          }
        }
      }
      
      // Apply date filtering
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date | undefined;
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = subDays(now, 7);
            break;
          case 'month':
            startDate = subDays(now, 30);
            break;
          case 'custom':
            if (customDateRange.start && customDateRange.end) {
              const start = new Date(customDateRange.start);
              const end = new Date(customDateRange.end);
              images = images.filter((img: ProcessedImage) => {
                const imgDate = new Date(img.created_at);
                return isAfter(imgDate, start) && isBefore(imgDate, end);
              });
            }
            break;
        }
        
        if (dateFilter !== 'custom' && startDate) {
          images = images.filter((img: ProcessedImage) => isAfter(new Date(img.created_at), startDate));
        }
      }
      
      // Apply type filtering
      if (filterType !== 'all') {
        images = images.filter(img => img.operation_type === filterType);
      }
      
      // Apply sorting
      images.sort((a, b) => {
        switch (sortBy) {
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'size':
            return b.file_size - a.file_size;
          case 'name':
            return a.original_filename.localeCompare(b.original_filename);
          default:
            return 0;
        }
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

  const handleBulkDownload = async () => {
    const selectedImagesList = images.filter(img => selectedImages.has(img.id));
    
    if (selectedImagesList.length === 0) {
      toast.error('No images selected');
      return;
    }

    toast.info(`Downloading ${selectedImagesList.length} images...`);
    
    for (const image of selectedImagesList) {
      await handleDownload(image);
      // Add a small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setSelectedImages(new Set());
    setIsSelectionMode(false);
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

      if (error) throw error;

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

  const handleBulkDelete = async () => {
    const selectedImagesList = images.filter(img => selectedImages.has(img.id));
    
    if (selectedImagesList.length === 0) {
      toast.error('No images selected');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedImagesList.length} images?`)) {
      return;
    }

    try {
      const supabase = createClientSupabaseClient();
      let deletedCount = 0;

      for (const image of selectedImagesList) {
        const { data: deleted, error } = await supabase.rpc('delete_processed_image', {
          p_image_id: image.id,
          p_user_id: user.id
        });

        if (!error && deleted) {
          deletedCount++;
        }
      }

      setImages(images.filter(img => !selectedImages.has(img.id)));
      setSelectedImages(new Set());
      setIsSelectionMode(false);
      toast.success(`Deleted ${deletedCount} images`);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete some images');
    }
  };

  const toggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedImages(newSelection);
  };

  const selectAll = () => {
    const allImageIds = new Set(filteredImages.map(img => img.id));
    setSelectedImages(allImageIds);
  };

  const deselectAll = () => {
    setSelectedImages(new Set());
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

  // Apply search filter
  const searchFilteredImages = images.filter(img => {
    if (searchTerm === '') return true;
    const search = searchTerm.toLowerCase();
    return (
      img.original_filename.toLowerCase().includes(search) ||
      img.processed_filename?.toLowerCase().includes(search) ||
      getOperationLabel(img.operation_type).toLowerCase().includes(search)
    );
  });

  // Apply collection filter
  const filteredImages = selectedCollection === 'all' 
    ? searchFilteredImages
    : searchFilteredImages.filter((img: any) => 
        // For now, filter by primary_collection_id
        // TODO: Update when collection_items junction table is integrated
        img.primary_collection_id === selectedCollection
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
          </div>
          <div className="flex items-center gap-2">
            {isSelectionMode && (
              <>
                <span className="text-sm text-gray-600">
                  {selectedImages.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                >
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDownload}
                  disabled={selectedImages.size === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={selectedImages.size === 0}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedImages(new Set());
              }}
            >
              {isSelectionMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
              {isSelectionMode ? 'Cancel' : 'Select'}
            </Button>
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
        <div className="flex flex-col gap-4 mb-6">
          {/* Search and main filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search images..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="upscale">Upscaled</option>
                <option value="background-removal">Background Removed</option>
                <option value="vectorize">Vectorized</option>
                <option value="generate">AI Generated</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="size">Largest First</option>
                <option value="name">Name (A-Z)</option>
              </select>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  More Filters
                  <ChevronDown className="w-4 h-4" />
                </Button>
                {showFilterMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border p-4 z-10">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Date Range</label>
                        <select
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="all">All Time</option>
                          <option value="today">Today</option>
                          <option value="week">Last 7 Days</option>
                          <option value="month">Last 30 Days</option>
                          <option value="custom">Custom Range</option>
                        </select>
                      </div>
                      {dateFilter === 'custom' && (
                        <div className="space-y-2">
                          <input
                            type="date"
                            value={customDateRange.start}
                            onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          />
                          <input
                            type="date"
                            value={customDateRange.end}
                            onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Collection</label>
                        <select
                          value={selectedCollection}
                          onChange={(e) => setSelectedCollection(e.target.value)}
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="all">All Collections</option>
                          {collections.map(col => (
                            <option key={col.id} value={col.id}>
                              {col.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setShowFilterMenu(false)}
                        className="w-full"
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Active filters display */}
          {(dateFilter !== 'all' || filterType !== 'all' || searchTerm !== '' || selectedCollection !== 'all') && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Active filters:</span>
              {dateFilter !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  {dateFilter === 'custom' ? 'Custom Date' : dateFilter}
                  <button
                    onClick={() => setDateFilter('all')}
                    className="ml-1 hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterType !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  {getOperationLabel(filterType)}
                  <button
                    onClick={() => setFilterType('all')}
                    className="ml-1 hover:text-purple-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchTerm !== '' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 hover:text-gray-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedCollection !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  {collections.find(c => c.id === selectedCollection)?.name}
                  <button
                    onClick={() => setSelectedCollection('all')}
                    className="ml-1 hover:text-green-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-600 mb-4">
          {filteredImages.length} {filteredImages.length === 1 ? 'image' : 'images'} found
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
              <div key={image.id} className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {isSelectionMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <button
                      onClick={() => toggleImageSelection(image.id)}
                      className="bg-white rounded shadow-sm p-1"
                    >
                      {selectedImages.has(image.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                )}
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
                    {format(new Date(image.created_at), 'MMM dd, yyyy')}
                  </div>
                  {image.expires_at && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                      <Clock className="w-3 h-3" />
                      {(() => {
                        const expiresDate = new Date(image.expires_at);
                        const now = new Date();
                        const hoursLeft = Math.floor((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60));
                        
                        if (hoursLeft < 0) {
                          return 'Expired';
                        } else if (hoursLeft < 24) {
                          return `Expires in ${hoursLeft} hours`;
                        } else {
                          return `Expires ${format(expiresDate, 'MMM dd')}`;
                        }
                      })()}
                    </div>
                  )}
                  {!isSelectionMode && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleDownload(image)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        type="button"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => handleDelete(image.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredImages.map((image) => (
              <div key={image.id} className="flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  {isSelectionMode && (
                    <button
                      onClick={() => toggleImageSelection(image.id)}
                    >
                      {selectedImages.has(image.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  )}
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
                      <span>{format(new Date(image.created_at), 'MMM dd, yyyy')}</span>
                      {image.expires_at && (
                        <span className="text-red-600">
                          {(() => {
                            const expiresDate = new Date(image.expires_at);
                            const now = new Date();
                            const hoursLeft = Math.floor((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60));
                            
                            if (hoursLeft < 0) {
                              return 'Expired';
                            } else if (hoursLeft < 24) {
                              return `Expires in ${hoursLeft} hours`;
                            } else {
                              return `Expires ${format(expiresDate, 'MMM dd')}`;
                            }
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!isSelectionMode && (
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
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}