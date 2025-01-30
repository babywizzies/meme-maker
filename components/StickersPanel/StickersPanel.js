import { Typography } from '@supabase/ui'
import Image from 'next/image'
import { useRef } from 'react'
import { Button } from '@supabase/ui'
import { IconImage } from '@supabase/ui'

const StickersPanel = ({ stickers, onStickerSelect, visible, onUploadSticker }) => {
  const fileInputRef = useRef(null)
  
  if (!visible) return null

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (file) {
      await onUploadSticker(file)
      // Clear the input value so the same file can be uploaded again
      event.target.value = ''
    }
  }

  return (
    <div className="border border-gray-500 rounded-lg mt-4 p-4 z-50 w-[800px] max-h-[500px] overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <Typography.Text>Stickers</Typography.Text>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <Button
            type="primary"
            icon={<IconImage />}
            onClick={handleUploadClick}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm"
          >
            Upload Sticker
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 overflow-y-auto pb-2 flex-1" role="list">
        {stickers?.map((sticker, index) => {
          return (
            <div
              key={index}
              className="aspect-square rounded-md cursor-pointer hover:border-gray-500 transition-colors flex items-center justify-center p-2"
              onClick={() => onStickerSelect(sticker)}
              role="listitem"
              aria-label={`Sticker ${sticker.name}`}
            >
              {sticker.url ? (
                <div className="relative w-full h-full">
                  <Image
                    src={sticker.url}
                    alt={sticker.name}
                    width={200}
                    height={200}
                    className="object-contain p-1"
                  />
                </div>
              ) : (
                <div className="text-xs text-gray-400">No image</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StickersPanel 