import { v4 } from 'uuid'
import * as R from 'ramda'
import { createClient } from '@supabase/supabase-js'

const MEMES_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_MEMES_BUCKET
const STICKERS_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STICKERS_BUCKET
const TEMPLATES_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_TEMPLATES_BUCKET
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const DEFAULT_LIMIT = 1000
const DEFAULT_EXPIRY = 10 * 365 * 24 * 60 * 60

// Add validation constants
const VALID_BUCKETS = [MEMES_BUCKET, STICKERS_BUCKET, TEMPLATES_BUCKET]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif']
const MAX_TEMPLATE_NAME_LENGTH = 100

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const uploadFile = async (file, user, bucket, folder = null) => {
  if (!file) throw new Error('File is required')
  if (!bucket) throw new Error('Bucket is required')

  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${v4()}-${Date.now()}.${fileExt}`
    const filePath = folder 
      ? `${folder}/${fileName}`
      : user 
        ? `${user.id}/${fileName}` 
        : fileName

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (uploadError) throw uploadError

    return filePath
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

export const getSignedUrl = async (bucket, prefix) => {
  if (!bucket || !prefix) {
    console.error('Both bucket and prefix are required for signed URLs')
    return ''
  }
  if (!VALID_BUCKETS.includes(bucket)) {
    console.error('Invalid bucket specified')
    return ''
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(prefix, DEFAULT_EXPIRY)
  if (error) {
    console.warn('Error', error)
    return ''
  }
  return data.signedURL
}

export const getStickers = async () => {
  try {
    const { data, error } = await supabase.from('stickers').select()
    
    if (error) {
      console.error('Error fetching stickers:', error)
      return []
    }
    
    if (!data || !Array.isArray(data)) {
      console.warn('No stickers found or invalid data format')
      return []
    }

    console.log('Raw stickers data:', data) // Debug log

    const res = await Promise.all(
      data.map(async (sticker) => {
        try {
          const signedUrl = await getSignedUrl(STICKERS_BUCKET, sticker.path)
          return { ...sticker, url: signedUrl }
        } catch (err) {
          console.error('Error getting signed URL for sticker:', sticker.id, err)
          return null
        }
      })
    )

    // Filter out any null results from failed URL signing
    return res.filter(Boolean)
  } catch (error) {
    console.error('Failed to get stickers:', error)
    return []
  }
}

export const getTemplates = async () => {
  try {
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_public', true)
    
    if (error) {
      console.error('Error fetching templates:', error)
      throw error
    }

    if (!templates) {
      return []
    }

    const templatesWithUrls = await Promise.all(
      templates.map(async (template) => {
        if (!template.path) return template

        const { data } = await supabase
          .storage
          .from(TEMPLATES_BUCKET)
          .createSignedUrl(template.path, 60 * 60)

        return {
          ...template,
          url: data?.signedUrl || null
        }
      })
    )

    return templatesWithUrls
  } catch (error) {
    console.error('Failed to get templates:', error)
    return []
  }
}

export const saveDefaultTemplate = async (name, json, path) => {
  try {
    if (!name || !json || !path) {
      throw new Error('Name, JSON, and path are required for saving template')
    }
    if (name.length > MAX_TEMPLATE_NAME_LENGTH) {
      throw new Error(`Template name must be less than ${MAX_TEMPLATE_NAME_LENGTH} characters`)
    }
    if (typeof json !== 'object') {
      throw new Error('Template JSON must be an object')
    }

    const cleanPath = path.replace(`${TEMPLATES_BUCKET}/`, '')
    
    const { data, error } = await supabase
      .from('templates')
      .insert([{ 
        name,
        json,
        path: cleanPath,
        is_public: true
      }])
      .select()
    
    if (error) {
      console.error('Save template error:', error)
      throw error
    }
    
    return data
  } catch (error) {
    console.error('saveTemplate', error)
    throw error
  }
}

export const getCommunityMemes = async () => {
  try {
    const { data, error } = await supabase
      .from('memes')
      .select()
      .is('is_public', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(DEFAULT_LIMIT)

    if (error) {
      console.error('Error fetching memes:', error)
      return []
    }

    if (!data) {
      return []
    }

    const memesWithUrls = await Promise.all(
      data.map(async (meme) => {
        try {
          const signedUrl = await getSignedUrl(MEMES_BUCKET, meme.path)
          return { ...meme, url: signedUrl }
        } catch (err) {
          console.error('Error getting signed URL for meme:', meme.id, err)
          return null
        }
      })
    )

    // Filter out any null results from failed URL signing
    return memesWithUrls.filter(Boolean)
  } catch (error) {
    console.error('Failed to get community memes:', error)
    return []
  }
}

export const resignTemplateUrls = async (template) => {
  if (!template?.json?.objects) {
    throw new Error('Invalid template format')
  }

  const templateObjects = await Promise.all(
    template.json.objects.map(async (object) => {
      if (R.hasPath(['src'], object)) {
        try {
          const urlParts = object.src.split('/sign/')
          if (urlParts.length !== 2) throw new Error('Invalid source URL format')
          
          const key = urlParts[1].split('?token')[0]
          const [bucket, ...prefixParts] = key.split('/')
          const prefix = prefixParts.join('/')
          
          if (!VALID_BUCKETS.includes(bucket)) {
            throw new Error('Invalid bucket in source URL')
          }
          
          const signedUrl = await getSignedUrl(bucket, prefix)
          return { ...object, src: signedUrl }
        } catch (error) {
          console.error('Error resigning URL:', error)
          return object // Return original object if signing fails
        }
      }
      return object
    })
  )

  return {
    ...template,
    json: {
      ...template.json,
      objects: templateObjects,
    },
  }
}

export const addTestStickers = async () => {
  const testStickers = [
    {
      name: 'Test Sticker 1',
      url: 'https://picsum.photos/200'  // Using a simpler test image
    }
  ]

  try {
    console.log('Starting test sticker upload...')
    
    for (const sticker of testStickers) {
      console.log('Fetching sticker image:', sticker.url)
      
      // Fetch the image
      const response = await fetch(sticker.url)
      const blob = await response.blob()
      
      // Create a File object
      const file = new File([blob], `${sticker.name}.png`, { type: 'image/png' })
      
      console.log('Created file object:', file)
      
      // Upload and create sticker
      const result = await createSticker(file, sticker.name)
      console.log('Sticker created successfully:', result)
    }
    
    console.log('All test stickers added successfully')
    return true
  } catch (error) {
    console.error('Error adding test stickers:', error)
    throw error
  }
}

export const createSticker = async (file, name) => {
  try {
    if (!file) throw new Error('File is required')
    
    console.log('Starting sticker creation with:', { fileName: file.name, name })

    // 1. Upload file to storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${v4()}-${Date.now()}.${fileExt}`
    const filePath = `public/${fileName}`

    console.log('Uploading to storage with path:', filePath)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STICKERS_BUCKET)
      .upload(filePath, file)

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw uploadError
    }

    console.log('File uploaded successfully:', uploadData)

    // 2. Create record in stickers table
    const { data: dbData, error: dbError } = await supabase
      .from('stickers')
      .insert([
        {
          name: name || file.name,
          path: filePath
        }
      ])
      .select()

    if (dbError) {
      console.error('Database insert error:', dbError)
      throw dbError
    }

    console.log('Database record created:', dbData)

    // 3. Get signed URL for immediate use
    const signedUrl = await getSignedUrl(STICKERS_BUCKET, filePath)
    
    const result = {
      ...dbData[0],
      url: signedUrl
    }

    console.log('Final sticker result:', result)
    return result

  } catch (error) {
    console.error('Error creating sticker:', error)
    throw error
  }
}
