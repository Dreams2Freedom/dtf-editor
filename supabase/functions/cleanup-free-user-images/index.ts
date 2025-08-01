import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting free user image cleanup...')

    // Get all images that should be deleted:
    // 1. User is on free plan (subscription_plan = 'free')
    // 2. User has no active subscription (subscription_status != 'active')
    // 3. User has no recent credit purchase (last_credit_purchase_at is null or > 90 days ago)
    // 4. Image was created more than 48 hours ago
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - 48)

    const { data: imagesToDelete, error: fetchError } = await supabase
      .from('processed_images')
      .select(`
        id,
        user_id,
        storage_url,
        thumbnail_url,
        original_filename,
        created_at,
        profiles!inner(
          subscription_plan,
          subscription_status,
          last_credit_purchase_at
        )
      `)
      .eq('profiles.subscription_plan', 'free')
      .neq('profiles.subscription_status', 'active')
      .lt('created_at', cutoffDate.toISOString())

    if (fetchError) {
      console.error('Error fetching images:', fetchError)
      throw fetchError
    }

    console.log(`Found ${imagesToDelete?.length || 0} images to check for deletion`)

    let deletedCount = 0
    let skippedCount = 0
    const errors: any[] = []

    // Process each image
    for (const image of imagesToDelete || []) {
      try {
        // Check if user has recent credit purchase (within 90 days)
        const profile = image.profiles
        if (profile.last_credit_purchase_at) {
          const purchaseDate = new Date(profile.last_credit_purchase_at)
          const daysSincePurchase = (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
          
          if (daysSincePurchase <= 90) {
            console.log(`Skipping image ${image.id} - user has recent credit purchase`)
            skippedCount++
            continue
          }
        }

        // Delete from storage
        if (image.storage_url) {
          // Extract path from storage URL
          const urlParts = image.storage_url.split('/storage/v1/object/public/')
          if (urlParts.length > 1) {
            const [bucket, ...pathParts] = urlParts[1].split('/')
            const path = pathParts.join('/')
            
            const { error: storageError } = await supabase.storage
              .from(bucket)
              .remove([path])
            
            if (storageError) {
              console.error(`Error deleting storage for ${image.id}:`, storageError)
              errors.push({ imageId: image.id, error: storageError })
            }
          }
        }

        // Delete thumbnail from storage
        if (image.thumbnail_url) {
          const urlParts = image.thumbnail_url.split('/storage/v1/object/public/')
          if (urlParts.length > 1) {
            const [bucket, ...pathParts] = urlParts[1].split('/')
            const path = pathParts.join('/')
            
            const { error: thumbnailError } = await supabase.storage
              .from(bucket)
              .remove([path])
            
            if (thumbnailError) {
              console.error(`Error deleting thumbnail for ${image.id}:`, thumbnailError)
            }
          }
        }

        // Delete database record
        const { error: dbError } = await supabase
          .from('processed_images')
          .delete()
          .eq('id', image.id)

        if (dbError) {
          console.error(`Error deleting database record for ${image.id}:`, dbError)
          errors.push({ imageId: image.id, error: dbError })
        } else {
          deletedCount++
          console.log(`Deleted image ${image.id} (${image.original_filename})`)
        }

      } catch (error) {
        console.error(`Error processing image ${image.id}:`, error)
        errors.push({ imageId: image.id, error })
      }
    }

    const response = {
      success: true,
      processed: imagesToDelete?.length || 0,
      deleted: deletedCount,
      skipped: skippedCount,
      errors: errors.length,
      message: `Cleanup completed. Deleted ${deletedCount} images, skipped ${skippedCount}, ${errors.length} errors.`
    }

    console.log('Cleanup completed:', response)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in cleanup function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500 
      }
    )
  }
})