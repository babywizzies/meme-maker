import { Button, IconLoader, SidePanel, Typography } from '@supabase/ui'
import { useRef, useState } from 'react'
import PropTypes from 'prop-types'
import * as R from 'ramda'

const TemplatesPanel = ({
  templates = [],
  loadingAssets = false,
  uploading = false,
  visible = false,
  loadTemplate = () => {},
  onTemplateUpload = () => {},
  hideTemplatesPanel = () => {},
}) => {
  const uploadButtonRef = useRef(null)
  const [error, setError] = useState(null)
  const [failedTemplates, setFailedTemplates] = useState({})

  const onSelectUpload = () => {
    setError(null)
    if (uploadButtonRef.current) {
      uploadButtonRef.current.click()
    }
  }

  const handleTemplateUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError('File size must be less than 5MB')
      return
    }

    onTemplateUpload(event)
  }

  const handleTemplateLoad = (template) => {
    try {
      loadTemplate(template)
    } catch (err) {
      setFailedTemplates((prev) => ({ ...prev, [template.id]: true }))
      console.error(`Failed to load template: ${template.id}`, err)
    }
  }

  return (
    <SidePanel
      hideFooter
      title="Select a template"
      description="Choose from our list of templates or upload your own!"
      visible={visible}
      onCancel={hideTemplatesPanel}
    >
      <div className="flex flex-col h-full">
        <div className="hidden">
          <input
            ref={uploadButtonRef}
            type="file"
            accept=".png, .jpg, .jpeg"
            onChange={handleTemplateUpload}
            aria-label="Upload template image"
          />
        </div>
        <Button 
          block 
          loading={uploading} 
          onClick={onSelectUpload}
          aria-label={!uploading ? 'Upload template' : 'Uploading template'}
        >
          {!uploading ? 'Upload your own template' : 'Uploading template'}
        </Button>

        {error && (
          <Typography.Text type="danger" className="mt-2">
            {error}
          </Typography.Text>
        )}

        <div className="mt-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 190px)' }}>
          {loadingAssets ? (
            <div
              className="space-y-2 flex flex-col items-center justify-center"
              style={{ height: 'calc(100vh - 190px)' }}
            >
              <IconLoader className="text-white animate-spin" />
              <Typography.Text small>Loading templates</Typography.Text>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3" role="list">
              {R.map(
                (template) => (
                  <div
                    key={template.id}
                    className={`h-32 bg-center bg-no-repeat bg-cover rounded-md cursor-pointer border 
                      ${failedTemplates[template.id] ? 'border-red-400' : 'border-gray-400'}`}
                    style={{ 
                      backgroundImage: template.path ? `url('${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${template.path}')` : 'none',
                      backgroundColor: '#2a2a2a'
                    }}
                    onClick={() => handleTemplateLoad(template)}
                    role="listitem"
                    aria-label={`Template ${template.id}`}
                  >
                    <div className="p-2 text-xs text-white">
                      {failedTemplates[template.id] && 'Failed to load'}
                    </div>
                  </div>
                ),
                templates
              )}
            </div>
          )}
        </div>

        {/* Probably add some search or something */}
      </div>
    </SidePanel>
  )
}

TemplatesPanel.propTypes = {
  templates: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      path: PropTypes.string
    })
  ),
  loadingAssets: PropTypes.bool,
  uploading: PropTypes.bool,
  visible: PropTypes.bool,
  loadTemplate: PropTypes.func,
  onTemplateUpload: PropTypes.func,
  hideTemplatesPanel: PropTypes.func
}

export default TemplatesPanel
