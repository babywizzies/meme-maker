import { Button, IconLoader, Typography } from '@supabase/ui'
import { useRef, useCallback } from 'react'
import PropTypes from 'prop-types'

const EmptyState = ({
  uploading = false,
  onFilesUpload = () => {},
  onSelectChangeTemplate = () => {},
}) => {
  const uploadButtonRef = useRef(null)

  const onSelectUpload = useCallback(() => {
    if (!uploadButtonRef.current) {
      console.warn('Upload button reference not found')
      return
    }
    uploadButtonRef.current.click()
  }, [])

  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (PNG or JPEG)')
      event.target.value = '' // Reset input
      return
    }

    // Validate file size (e.g., max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      alert('File size must be less than 5MB')
      event.target.value = '' // Reset input
      return
    }

    onFilesUpload(event)
  }, [onFilesUpload])

  return (
    <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center space-y-4 z-10">
      {uploading ? (
        <>
          <IconLoader className="animate-spin" strokeWidth={2} />
          <Typography.Text>Uploading image</Typography.Text>
        </>
      ) : (
        <>
          <div className="hidden">
            <input
              ref={uploadButtonRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleFileChange}
              aria-label="Upload image"
            />
          </div>
          <Button type="primary" onClick={onSelectChangeTemplate}>
            Select a template
          </Button>
        </>
      )}
    </div>
  )
}

EmptyState.propTypes = {
  uploading: PropTypes.bool,
  onFilesUpload: PropTypes.func,
  onSelectChangeTemplate: PropTypes.func,
}

export default EmptyState
