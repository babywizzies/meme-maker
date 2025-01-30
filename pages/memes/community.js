import { useState, useEffect } from 'react'
import { Button, Typography, IconLoader } from '@supabase/ui'
import Link from 'next/link'
import * as R from 'ramda'
import { splitIntoColumns } from '../../utils/layout'
import { getCommunityMemes } from '../../utils/supabaseClient'

const CommunityMemes = ({ onExpandMeme = () => {} }) => {
  const [loading, setLoading] = useState(true)
  const [memes, setMemes] = useState([])

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500

  useEffect(() => {
    getMemes()
  }, [])

  const getMemes = async () => {
    try {
      setLoading(true)
      const columns = isMobile ? 2 : 5
      const communityMemes = await getCommunityMemes()
      
      // Sort memes by creation date, newest first
      const sortedMemes = communityMemes.sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at)
      })
      
      const formattedMemes = splitIntoColumns(sortedMemes, columns)
      setMemes(formattedMemes)
    } catch (error) {
      console.error('Error fetching memes:', error)
      // You could add a toast notification here if you want to show errors to users
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative px-4 py-10 bg-hero-pattern min-h-screen font-doodle">
      <div className="max-w-screen-xl h-full mx-auto flex flex-col space-y-4">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
            <Typography>
              <IconLoader className="animate-spin" />
            </Typography>
            <Typography.Text>Loading memes</Typography.Text>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 mb-4">
              <div className="hidden sm:block" />
              <div className="flex items-center sm:justify-center col-span-2 sm:col-span-1">
                <Typography.Title level={3}>Community Memes</Typography.Title>
              </div>
              <div className="flex items-center justify-end">
                {R.pathOr([], [0], memes).length > 0 && (
                  <Button>
                    <Link href="/">
                      {isMobile ? 'Make memes!' : 'Make your own memes!'}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            <div className="overflow-y-auto">
              <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-5'} gap-6`}>
                {R.addIndex(R.map)(
                  (content, idx) => (
                    <div key={idx} className="space-y-6">
                      {R.map(
                        (meme) => (
                          <div key={meme.id} className="w-full relative group cursor-pointer">
                            <img
                              className="rounded-md w-full"
                              src={meme.url}
                              onClick={() => onExpandMeme(meme)}
                            />
                            {/* <div className="flex flex-col absolute top-2 right-2 transition opacity-0 group-hover:opacity-100 space-y-2">
                          <div
                            className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 cursor-pointer"
                            onClick={() => {}}
                          >
                            <IconHeart className="w-4" strokeWidth={2} />
                          </div>
                        </div> */}
                          </div>
                        ),
                        content
                      )}
                    </div>
                  ),
                  memes
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CommunityMemes
