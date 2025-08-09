import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dyb9cwe9p',
  api_key: process.env.CLOUDINARY_API_KEY || '731877583831933',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'TKkCCAmh3cmE3IZyPnTHuiKDc3g',
})

export { cloudinary }

// Helper function to upload file to Cloudinary
export async function uploadToCloudinary(
  file: Buffer | string,
  options: {
    folder?: string
    resource_type?: 'image' | 'video' | 'raw' | 'auto'
    public_id?: string
    transformation?: any[]
  } = {}
) {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: options.folder || 'study-rooms',
      resource_type: options.resource_type || 'auto',
      public_id: options.public_id,
      transformation: options.transformation,
    })

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}

// Helper function to delete file from Cloudinary
export async function deleteFromCloudinary(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    })

    return {
      success: result.result === 'ok',
      result: result.result,
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    }
  }
}

// Helper function to generate optimized image URLs
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number
    height?: number
    crop?: string
    quality?: string | number
    format?: string
  } = {}
) {
  return cloudinary.url(publicId, {
    width: options.width,
    height: options.height,
    crop: options.crop || 'fill',
    quality: options.quality || 'auto',
    format: options.format || 'auto',
    fetch_format: 'auto',
  })
}