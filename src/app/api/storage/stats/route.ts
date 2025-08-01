import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface StorageStats {
  totalImages: number;
  totalSize: number;
  usedStorage: number;
  storageLimit: number;
  percentageUsed: number;
  imagesByType: {
    upscale: number;
    'background-removal': number;
    vectorize: number;
    generate: number;
  };
  expiringImages: number;
  permanentImages: number;
}

// Storage limits by plan (in bytes)
const STORAGE_LIMITS = {
  free: 100 * 1024 * 1024,        // 100 MB
  basic: 1024 * 1024 * 1024,      // 1 GB
  starter: 5 * 1024 * 1024 * 1024, // 5 GB
  professional: 10 * 1024 * 1024 * 1024 // 10 GB
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile to determine plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', user.id)
      .single();

    const userPlan = profile?.subscription_plan || 'free';
    const storageLimit = STORAGE_LIMITS[userPlan as keyof typeof STORAGE_LIMITS] || STORAGE_LIMITS.free;

    // Get all user's images
    const { data: images, error: imagesError } = await supabase
      .from('processed_images')
      .select('*')
      .eq('user_id', user.id)
      .eq('processing_status', 'completed');

    if (imagesError) {
      throw imagesError;
    }

    // Calculate statistics
    const totalImages = images?.length || 0;
    const totalSize = images?.reduce((sum, img) => sum + (img.file_size || 0), 0) || 0;
    
    // Count images by type
    const imagesByType = {
      upscale: 0,
      'background-removal': 0,
      vectorize: 0,
      generate: 0
    };

    let expiringImages = 0;
    let permanentImages = 0;

    images?.forEach(img => {
      // Count by type
      if (img.operation_type in imagesByType) {
        imagesByType[img.operation_type as keyof typeof imagesByType]++;
      }

      // Count expiring vs permanent
      if (img.expires_at) {
        expiringImages++;
      } else {
        permanentImages++;
      }
    });

    const percentageUsed = storageLimit > 0 ? (totalSize / storageLimit) * 100 : 0;

    const stats: StorageStats = {
      totalImages,
      totalSize,
      usedStorage: totalSize,
      storageLimit,
      percentageUsed: Math.min(percentageUsed, 100), // Cap at 100%
      imagesByType,
      expiringImages,
      permanentImages
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching storage stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch storage statistics' },
      { status: 500 }
    );
  }
}