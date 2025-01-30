import { useEffect, useState } from 'react'
import { Typography } from '@supabase/ui'
import Image from 'next/image'
import { fabric } from 'fabric'

import Editor from '../components/Editor/Editor'
import TemplatesPanel from '../components/TemplatesPanel/TemplatesPanel'
import {
  uploadFile,
  getSignedUrl,
  getStickers,
  getTemplates,
  resignTemplateUrls,
  saveDefaultTemplate,
  addTestStickers,
  createSticker,
} from '../utils/supabaseClient'
import * as R from 'ramda'
import StickersPanel from '../components/StickersPanel/StickersPanel'

const TEMPLATES_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_TEMPLATES_BUCKET

const Home = ({ user }) => {
  const [templates, setTemplates] = useState([])
  const [stickers, setStickers] = useState([])

  const [loadingAssets, setLoadingAssets] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadedFileUrl, setUploadedFileUrl] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [loadAnimations, setLoadAnimations] = useState(false)
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false)

  // Add error state
  const [error, setError] = useState(null)

  // Add new state for stickers panel
  const [showStickersPanel, setShowStickersPanel] = useState(true)

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500
  const isAdmin = R.pathOr('', ['email'], user).includes('@supabase.io')

  useEffect(() => {
    const initAssets = async () => {
      try {
        setError(null)
        setLoadingAssets(true)
        
        const [stickersData, templatesData] = await Promise.all([
          getStickers(),
          getTemplates()
        ])

        console.log('Stickers loaded in Home:', stickersData)
        
        if (!Array.isArray(stickersData)) throw new Error('Invalid stickers data')
        if (!Array.isArray(templatesData)) throw new Error('Invalid templates data')

        setStickers(stickersData)
        setTemplates(templatesData)
      } catch (err) {
        console.error('Failed to initialize assets:', err)
        setError('Failed to load assets. Please refresh the page.')
      } finally {
        setLoadingAssets(false)
      }
    }

    initAssets()
    
    const animationTimer = setTimeout(() => {
      setLoadAnimations(true)
    }, 2000)

    return () => clearTimeout(animationTimer)
  }, [])

  const onSelectChangeTemplate = () => {
    setShowTemplatesPanel(true)
  }

  const onTemplateUpload = async (event) => {
    try {
      setError(null)
      setUploading(true)
      
      const file = event?.target?.files?.[0]
      
      if (!file) {
        throw new Error('No file selected')
      }

      // Validate file size (e.g., 5MB limit)
      const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 5MB limit')
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload JPEG, PNG, or GIF')
      }

      const path = await uploadFile(file, null, TEMPLATES_BUCKET)
      
      if (!path) {
        throw new Error('Upload failed - no path returned')
      }

      const template = {
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        json: {
          objects: [], 
          version: "5.3.0",
          background: "white"
        }
      }

      await saveDefaultTemplate(template.name, template.json, path)
      
      const updatedTemplates = await getTemplates()
      setTemplates(updatedTemplates)
      
    } catch (error) {
      console.error('Template upload failed:', error)
      setError(error.message || 'Failed to upload template')
    } finally {
      setUploading(false)
    }
  }

  const loadTemplate = async (template) => {
    try {
      setError(null)
      if (!template) throw new Error('No template selected')
      
      const formattedTemplate = await resignTemplateUrls(template)
      setSelectedTemplate(formattedTemplate)
      setShowTemplatesPanel(false)
    } catch (error) {
      console.error('Failed to load template:', error)
      setError('Failed to load template')
    }
  }

  // Update the onStickerSelect handler
  const onStickerSelect = (sticker) => {
    console.log('Sticker selected:', sticker)
    if (window.editor?.canvas) {
      fabric.Image.fromURL(sticker.url, (fabricImage) => {
        const canvas = window.editor.canvas
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        
        // Set image properties
        fabricImage.set({
          left: centerX,
          top: centerY,
          scaleX: 0.5,  // Scale down the image to 50%
          scaleY: 0.5,
          originX: 'center',
          originY: 'center'
        })
        
        // Add to canvas and make it the active object
        canvas.add(fabricImage)
        canvas.setActiveObject(fabricImage)
        canvas.renderAll()
      }, { crossOrigin: 'anonymous' }) // Enable cross-origin image loading
    } else {
      console.error('Editor canvas not initialized', { 
        editor: window.editor,
        canvas: window.editor?.canvas 
      })
    }
  }

  const handleStickerUpload = async (file) => {
    try {
      setError(null)
      
      // Validate file size (e.g., 5MB limit)
      const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 5MB limit')
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload JPEG, PNG, or GIF')
      }

      // Upload the sticker
      const result = await createSticker(file, file.name)
      
      // Update stickers list
      setStickers(prev => [...prev, result])
      
    } catch (error) {
      console.error('Failed to upload sticker:', error)
      setError(error.message || 'Failed to upload sticker')
    }
  }

  return (
    <>
      <div className="relative overflow-hidden flex min-h-screen p-8 ">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <div className="max-w-screen-xl mx-auto flex-grow flex flex-col">
          <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-20 text-center text-white">
            <div className="pt-4 mb-4 sm:pt-6 sm:mb-2">
              <Typography.Title
                className="hidden sm:block font-medium bg-center bg-no-repeat bg-cover"
                level={2}
              >
                Create your{' '}
                <span
                  className="bg-center bg-no-repeat bg-cover"
                  style={{
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    backgroundImage:
                      "url('https://i.giphy.com/media/2tNvsKkc0qFdNhJmKk/giphy.webp')",
                  }}
                >
                  best memes
                </span>{' '}
                within seconds
              </Typography.Title>
              <Typography.Title
                className="sm:hidden font-medium bg-center bg-no-repeat bg-cover"
                level={3}
              >
                Create your{' '}
                <span
                  className="bg-center bg-no-repeat bg-cover"
                  style={{
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    backgroundImage:
                      "url('https://i.giphy.com/media/2tNvsKkc0qFdNhJmKk/giphy.webp')",
                  }}
                >
                  best memes
                </span>{' '}
                <br />
                within seconds
              </Typography.Title>
            </div>
            <div className="pb-4 hidden sm:block">
              <Typography>
                Here at Supabase we love memes - and so here's a meme maker 💚
              </Typography>
            </div>
            {typeof window !== 'undefined' && (
              <Editor
                user={user}
                isMobile={isMobile}
                isAdmin={isAdmin}
                stickers={stickers}
                templates={templates}
                selectedTemplate={selectedTemplate}
                uploading={uploading}
                uploadedFileUrl={uploadedFileUrl}
                onTemplateUpload={onTemplateUpload}
                onSelectChangeTemplate={onSelectChangeTemplate}
                onStickerSelect={onStickerSelect}
              />
            )}
            <StickersPanel 
              stickers={stickers}
              onStickerSelect={onStickerSelect}
              visible={showStickersPanel && selectedTemplate !== null}
              onUploadSticker={handleStickerUpload}
            />
          </main>
        </div>
        <TemplatesPanel
          templates={templates}
          loadingAssets={loadingAssets}
          uploading={uploading}
          visible={showTemplatesPanel}
          loadTemplate={loadTemplate}
          onTemplateUpload={onTemplateUpload}
          hideTemplatesPanel={() => setShowTemplatesPanel(false)}
        />
      </div>
    </>
  )
}

export default Home
