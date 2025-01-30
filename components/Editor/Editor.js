import { fabric } from 'fabric'
import { v4 } from 'uuid'
import {
  Input,
  Button,
  IconType,
  Dropdown,
  IconChevronDown,
  IconSave,
  IconImage,
  IconArchive,
} from '@supabase/ui'
import { useEffect, useState, useRef } from 'react'
import * as R from 'ramda'
import confetti from 'canvas-confetti'
import { DEFAULT_SWATCHES, DEFAULT_FONTS } from './constants'
import {
  resizeImageToFitCanvas,
  resizeImageWithinCanvas,
  getCanvasJson,
  dataURLtoFile,
} from '../../utils/editor'
import {
  getSignedUrl,
  saveDefaultTemplate,
  saveUserTemplate,
  uploadFile,
} from '../../utils/supabaseClient'
import EmptyState from './EmptyState'
import {
  FontSize,
  FontFamily,
  LayerOrder,
  Remove,
  StickerSelection,
  TextAlign,
  TextFillColour,
  TextStrokeColour,
} from '../EditorControls'
import toast from 'react-hot-toast'
import { createClient } from '@supabase/supabase-js'

const TEMPLATES_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_TEMPLATES_BUCKET
const STICKERS_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STICKERS_BUCKET
const MEMES_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_MEMES_BUCKET

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const Editor = ({
  user,
  isMobile = false,
  isAdmin = false,
  stickers = [],
  selectedTemplate = null,
  uploadedFileUrl = '',
  uploading = false,
  onTemplateUpload = () => {},
  onSelectChangeTemplate = () => {},
}) => {
  const editorDimensions = {
    width: isMobile ? 400 : 800,
    height: isMobile ? 400 : 450,
  }

  const editorRef = useRef(null)
  const copiedObject = useRef(null)
  const uploadStickerButtonRef = useRef(null)

  const [name, setName] = useState('')
  const [selectedObject, setSelectedObject] = useState(null)
  const isCanvasEmpty = !(selectedTemplate || uploadedFileUrl)
  const isTextObjectSelected = R.hasPath(['fontSize'], selectedObject)

  // Add new state for uploaded image
  const [uploadedImage, setUploadedImage] = useState(null)

  // Add error state management
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const [showStickerPanel, setShowStickerPanel] = useState(false)
  const [bucketStickers, setBucketStickers] = useState([])
  const [loadingBucketStickers, setLoadingBucketStickers] = useState(false)

  useEffect(() => {
    try {
      const editor = new fabric.Canvas('editor', {
        preserveObjectStacking: true,
      })

      window.editor = {
        canvas: editor  // Store the canvas instance directly
      }
      editorRef.current = editor

      window.addEventListener('keydown', handleKeyPress)
      editor.on('selection:created', onSelectionCreated)
      editor.on('selection:updated', onSelectionUpdated)
      editor.on('selection:cleared', onSelectionCleared)
      editor.on('object:modified', onObjectModified)
      
      return () => {
        window.removeEventListener('keydown', handleKeyPress)
        if (editorRef.current) {
          editorRef.current.__eventListeners = {}
          editorRef.current.dispose()
        }
        window.editor = null
      }
    } catch (error) {
      console.error('Error initializing canvas:', error)
      setError('Failed to initialize editor')
    }
  }, [])

  useEffect(() => {
    if (uploadedFileUrl) {
      mountBackgroundImage(uploadedFileUrl)
    }
  }, [uploadedFileUrl])

  useEffect(() => {
    if (selectedTemplate) {
      console.log('Loading template:', selectedTemplate)
      // Remove all objects from canvas
      const objects = editorRef.current.getObjects()
      for (let i = objects.length - 1; i >= 0; i--) {
        editorRef.current.remove(objects[i])
      }
      
      (async () => {
        try {
          // First check if we have a direct URL or path
          let templateUrl = selectedTemplate.url
          if (!templateUrl && selectedTemplate.path) {
            templateUrl = await getSignedUrl(TEMPLATES_BUCKET, selectedTemplate.path)
          }

          // If we have a URL, use it
          if (templateUrl) {
            mountBackgroundImage(templateUrl)
            return
          }

          // If no URL but we have JSON with objects, use that
          if (selectedTemplate.json?.objects?.length) {
            editorRef.current.loadFromJSON(selectedTemplate.json, () => {
              const objects = editorRef.current.getObjects()
              console.log('Template objects:', objects)
              const backgroundObject = objects.filter((object) => object.isBackground)[0]

              if (!backgroundObject) {
                console.error('No background object found in template. Total objects:', objects.length)
                ;(async () => {
                  const templateUrl = selectedTemplate.url || (selectedTemplate.path && await getSignedUrl(TEMPLATES_BUCKET, selectedTemplate.path))
                  if (templateUrl) {
                    console.log('Attempting to load background from template URL')
                    mountBackgroundImage(templateUrl)
                  }
                })()
                return
              }

              if (isMobile) {
                if (backgroundObject.width >= backgroundObject.height) {
                  const zoomScale =
                    editorDimensions.width / (backgroundObject.width * backgroundObject.scaleX)
                  editorRef.current.setZoom(zoomScale)
                  editorRef.current.setHeight(
                    backgroundObject.height * backgroundObject.scaleY * zoomScale
                  )
                  editorRef.current.setWidth(editorDimensions.width)
                } else if (backgroundObject.width < backgroundObject.height) {
                  const zoomScale =
                    editorDimensions.height / (backgroundObject.height * backgroundObject.scaleY)
                  editorRef.current.setZoom(zoomScale)
                  editorRef.current.setHeight(editorDimensions.height)
                  editorRef.current.setWidth(backgroundObject.width * backgroundObject.scaleX * zoomScale)
                }
              } else {
                editorRef.current.setWidth(backgroundObject.width * backgroundObject.scaleX)
                editorRef.current.setHeight(backgroundObject.height * backgroundObject.scaleY)
              }

              editorRef.current.requestRenderAll()
            }, (err) => {
              console.error('Error loading template:', err)
            })
            return
          }

          // If we get here, we have no valid source
          console.error('No valid source found for template - needs either URL, path, or objects in JSON')
          console.log('Template JSON:', selectedTemplate.json)
          toast.error('Unable to load template')

        } catch (error) {
          console.error('Error loading template:', error)
          toast.error('Error loading template')
        }
      })()
    }
  }, [selectedTemplate])

  /* Event listeners */
  const handleKeyPress = (event) => {
    const { keyCode } = event
    const activeObject = editorRef.current.getActiveObject()
    const targetType = event.target.tagName.toUpperCase()

    if (activeObject && !activeObject.isEditing && targetType !== 'INPUT') {
      switch (keyCode) {
        case 8: {
          // Remove object
          editorRef.current.remove(activeObject)
          break
        }
        case 67: {
          if (event.metaKey) {
            copiedObject.current = activeObject
          }
          break
        }
      }
    }

    if (targetType !== 'INPUT') {
      switch (keyCode) {
        case 86: {
          if (event.metaKey && copiedObject.current) {
            const clonedObject = fabric.util.object.clone(copiedObject.current)
            clonedObject.set({ top: clonedObject.top + 10, left: clonedObject.left + 10 })
            editorRef.current.add(clonedObject)
          }
          break
        }
        case 90: {
          if (event.metaKey) {
            console.log('Undo')
          }
          break
        }
      }
    }
  }

  const onSelectionCreated = (event) => {
    const objectJSON = JSON.parse(JSON.stringify(event.target))
    setSelectedObject(objectJSON)
  }

  const onSelectionUpdated = (event) => {
    const objectJSON = JSON.parse(JSON.stringify(event.target))
    setSelectedObject(objectJSON)
  }

  const onSelectionCleared = () => {
    setSelectedObject(null)
  }

  const onObjectModified = (event) => {
    // Update fontSize when we scale textboxes
    if (event.action === 'scale' && R.hasPath(['fontSize'], event.target)) {
      event.target.fontSize *= event.target.scaleX
      event.target.fontSize = event.target.fontSize.toFixed(0)
      event.target.scaleX = 1
      event.target.scaleY = 1
      event.target._clearCache()
      updateTextAttribute({ fontSize: event.target.fontSize })
    }
  }

  /* Canvas interaction methods */
  const addNewText = () => {
    const text = new fabric.IText('New textbox', {
      left: editorRef.current.width / 2,
      top: editorRef.current.height / 2,
      originX: 'center',
      originY: 'center',
      fontSize: 30,
      fontFamily: 'Impact',
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 1,
      textAlign: 'center',
    })
    text.setControlsVisibility({
      mt: false,
      mr: false,
      mb: false,
      ml: false,
    })
    editorRef.current.add(text)
    editorRef.current.bringToFront(text)
    editorRef.current.setActiveObject(text)
  }

  const updateTextAttribute = (attribute) => {
    const textObject = editorRef.current.getActiveObject()
    textObject.set(attribute)
    editorRef.current.requestRenderAll()

    const updatedSelectedObject = {
      ...selectedObject,
      ...attribute,
    }
    setSelectedObject(updatedSelectedObject)
  }

  const addSticker = async (sticker) => {
    try {
      // Don't remove the 'public/' prefix - it's part of the path
      const stickerUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STICKERS_BUCKET}/${sticker.path}`
      
      fabric.Image.fromURL(
        stickerUrl,
        (img) => {
          const imageDimensions = { width: img.width, height: img.height }
          const editorDimensions = {
            width: editorRef.current.width,
            height: editorRef.current.height,
          }
          const scale = resizeImageWithinCanvas(imageDimensions, editorDimensions)
          img.set({
            left: editorRef.current.width / 2,
            top: editorRef.current.height / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
          })
          editorRef.current.add(img)
          editorRef.current.setActiveObject(img)
        },
        { crossOrigin: 'anonymous' }
      )
    } catch (error) {
      console.error('Error adding sticker:', error)
      toast.error('Failed to add sticker')
    }
  }

  const onSelectUploadSticker = () => {
    if (uploadStickerButtonRef.current) {
      uploadStickerButtonRef.current.click()
    }
  }

  const uploadSticker = async (event) => {
    try {
      event.persist()
      const files = event.target.files
      const path = await uploadFile(files[0], user, STICKERS_BUCKET)
      // Extract the path without the bucket name
      const formattedPath = path.replace(`${STICKERS_BUCKET}/`, '')
      await addSticker({ path: formattedPath })
      event.target.value = ''
    } catch (error) {
      console.error('Error uploading sticker:', error)
      toast.error('Failed to upload sticker')
    }
  }

  const removeObject = () => {
    const activeObject = editorRef.current.getActiveObject()
    editorRef.current.remove(activeObject)
  }

  const shiftObjectForward = () => {
    const activeObject = editorRef.current.getActiveObject()
    editorRef.current.bringForward(activeObject)
  }

  const shiftObjectBackward = () => {
    const activeObject = editorRef.current.getActiveObject()
    const objectIndex = editorRef.current.getObjects().indexOf(activeObject)
    if (objectIndex > 1) {
      editorRef.current.sendBackwards(activeObject)
    }
  }

  const mountBackgroundImage = async (url) => {
    if (!editorRef.current) {
      console.error('Canvas not initialized')
      return
    }

    setIsLoading(true)
    try {
      editorRef.current.remove(...editorRef.current.getObjects())
      
      return new Promise((resolve, reject) => {
        fabric.Image.fromURL(
          url,
          (img) => {
            if (!img) {
              reject(new Error('Failed to load image'))
              return
            }

            const imageDimensions = { width: img.width, height: img.height }
            const scale = resizeImageToFitCanvas(imageDimensions, editorDimensions)

            if (editorRef.current && scale > 0) {
              if (editorDimensions.width > img.width * scale) {
                editorRef.current.setWidth(img.width * scale)
              } else if (editorDimensions.height > img.height * scale) {
                editorRef.current.setHeight(img.height * scale)
              }
              editorRef.current.calcOffset()

              img.set({
                left: editorRef.current.width / 2,
                top: editorRef.current.height / 2,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                selectable: false,
                evented: false,
                isBackground: true,
              })
              editorRef.current.add(img)
              editorRef.current.sendToBack(img)
              resolve(img)
            } else {
              reject(new Error('Invalid scale or canvas not initialized'))
            }
          },
          {
            crossOrigin: 'anonymous',
            error: (err) => {
              reject(new Error(`Failed to load image: ${err.message}`))
            },
          }
        )
      })
    } catch (error) {
      console.error('Error mounting background:', error)
      toast.error('Failed to load image')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /* Misc methods */

  const onExportCanvas = () => {
    if (!editorRef.current) return

    try {
      const link = document.createElement('a')
      link.href = editorRef.current.toDataURL('image/png', 1.0)
      link.setAttribute('download', `meme-${Date.now()}.png`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min
      }

      confetti({
        spread: randomInRange(50, 70),
        particleCount: randomInRange(50, 100),
        origin: { y: 0.6 },
      })
      toast.success('Enjoy your meme!', { icon: '🥳' })
    } catch (error) {
      console.error('Error exporting canvas:', error)
      toast.error('Failed to export image')
    }
  }

  // Add new handler for file uploads
  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      // Validate file type
      if (!file.type.match(/^image\/(jpeg|png|gif)$/i)) {
        throw new Error('Invalid file type. Please upload an image file.')
      }

      // Validate file size (e.g., 5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size too large. Please upload an image smaller than 5MB.')
      }

      const imageUrl = URL.createObjectURL(file)
      setUploadedImage(imageUrl)
      await mountBackgroundImage(imageUrl)
    } catch (error) {
      console.error('Error handling file upload:', error)
      toast.error(error.message || 'Failed to upload image')
    }
  }

  const handleSelectBucketSticker = async () => {
    setShowStickerPanel(true)
    setLoadingBucketStickers(true)
    try {
      const { data, error } = await supabase
        .storage
        .from(STICKERS_BUCKET)
        .list('public') // List contents of the public folder
      
      if (error) throw error
      
      const stickersWithUrls = data
        .filter(file => !file.metadata) // Filter out folders
        .map(file => ({
          id: file.name,
          path: `public/${file.name}`, // Include 'public/' in the path
          name: file.name
        }))
      
      setBucketStickers(stickersWithUrls)
    } catch (error) {
      console.error('Error loading stickers:', error)
      toast.error('Failed to load stickers')
    } finally {
      setLoadingBucketStickers(false)
    }
  }

  const saveMemeToSupabase = async () => {
    if (!editorRef.current) return

    try {
      // Convert canvas to file
      const dataUrl = editorRef.current.toDataURL('image/png')
      const file = dataURLtoFile(dataUrl, `meme-${Date.now()}.png`)
      
      // Upload to Supabase storage in public folder
      const path = await uploadFile(file, user, MEMES_BUCKET, 'public')
      
      // Save metadata to database
      const { data, error } = await supabase
        .from('memes')
        .insert([
          {
            user_id: user?.id || null,
            path: path,
            json: getCanvasJson(editorRef.current),
            is_public: true,
            created_at: new Date().toISOString()
          }
        ])
        .select()

      if (error) {
        console.error('Database error:', error)
        throw error
      }
      
      toast.success('Meme saved successfully!')
    } catch (error) {
      console.error('Error saving meme:', error)
      toast.error(error.message || 'Failed to save meme')
    }
  }

  return (
    <div className="flex flex-col items-center space-y-3">
      {error && (
        <div className="w-full p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}

      <div className="hidden">
        <input
          ref={uploadStickerButtonRef}
          type="file"
          accept=".png, .jpg, .jpeg"
          onChange={uploadSticker}
        />
      </div>
      <div className="w-full flex flex-col sm:flex-row space-y-2 sm:space-y-0 items-center justify-between">
        {isTextObjectSelected ? (
          <div className="flex items-center space-x-2">
            <FontFamily
              fonts={DEFAULT_FONTS}
              selectedObject={selectedObject}
              updateTextAttribute={updateTextAttribute}
            />

            <FontSize selectedObject={selectedObject} updateTextAttribute={updateTextAttribute} />

            <div className="flex items-center space-x-1">
              <TextFillColour
                swatches={DEFAULT_SWATCHES}
                selectedObject={selectedObject}
                updateTextAttribute={updateTextAttribute}
              />

              <TextStrokeColour
                swatches={DEFAULT_SWATCHES}
                selectedObject={selectedObject}
                updateTextAttribute={updateTextAttribute}
              />

              <TextAlign
                selectedObject={selectedObject}
                updateTextAttribute={updateTextAttribute}
              />
            </div>
          </div>
        ) : (
          <div />
        )}

        {!isCanvasEmpty ? (
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-1">
              {!R.isNil(selectedObject) && (
                <LayerOrder
                  shiftObjectForward={shiftObjectForward}
                  shiftObjectBackward={shiftObjectBackward}
                />
              )}
              {!R.isNil(selectedObject) && <Remove onRemoveObject={removeObject} />}
              <StickerSelection
                stickers={stickers}
                onAddSticker={addSticker}
                onSelectUploadSticker={onSelectUploadSticker}
                onSelectBucketSticker={handleSelectBucketSticker}
              />
              <div className="h-10 flex">
                <Button
                  type="text"
                  icon={<IconType size="medium" strokeWidth={2} />}
                  onClick={addNewText}
                />
              </div>
            </div>
            <Button type="secondary" onClick={onSelectChangeTemplate}>
              Change template
            </Button>
          </div>
        ) : (
          <div className="h-[40px]" />
        )}
      </div>

      <div
        className="border border-gray-500 rounded-md flex items-center justify-center relative"
        style={{ width: editorDimensions.width }}
      >
        {isCanvasEmpty && (
          <EmptyState
            uploading={uploading}
            onFilesUpload={handleFileUpload}
            onSelectChangeTemplate={onSelectChangeTemplate}
          />
        )}
        <canvas id="editor" width={editorDimensions.width} height={editorDimensions.height} />
      </div>

      {!isCanvasEmpty && (
        <div className="w-full flex items-center justify-end space-x-2">
          <Button
            type="primary"
            icon={<IconImage />}
            onClick={onExportCanvas}
          >
            Export as PNG
          </Button>
          <Button
            type="default"
            icon={<IconSave />}
            onClick={saveMemeToSupabase}
          >
            Save Meme
          </Button>
        </div>
      )}
    </div>
  )
}

export default Editor
