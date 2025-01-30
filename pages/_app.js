import 'tailwindcss/tailwind.css'
import '../styles/globals.css'
import Head from 'next/head'
import React, { useEffect, useState } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import * as Portal from '@radix-ui/react-portal'
import { IdProvider } from '@radix-ui/react-id'

import Header from '../components/Header/Header'
import ExpandMemeModal from '../components/ExpandMemeModal/ExpandMemeModal'
import { IconGitHub, Typography } from '@supabase/ui'

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    document.body.className = 'dark'
  }, [])

  const [expandedMeme, setExpandedMeme] = useState(null)

  const onExpandMeme = (meme) => {
    setExpandedMeme(meme)
  }

  return (
    <IdProvider>
      <div className="bg-gray-800 relative">
        <Head>
          <title>Meme Maker | Supabase</title>
          <meta property="og:title" content="Meme Maker | Powered by Supabase" />
          <meta
            property="og:description"
            content="Create your best memes in seconds with this simple canvas editor."
          />
          <meta
            property="og:image"
            content="https://mfrkmguhoejspftfvgdz.supabase.in/storage/v1/object/public/og-assets/og-image.png"
          />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:creator" content="joshenlimek" />
          <meta name="twitter:title" content="Meme Maker | Powered by Supabase" />
          <meta
            name="twitter:description"
            content="Create your best memes in seconds with this simple canvas editor."
          />
          <meta
            name="twitter:image"
            content="https://mfrkmguhoejspftfvgdz.supabase.in/storage/v1/object/public/og-assets/og-image.png"
          />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Component {...pageProps} onExpandMeme={onExpandMeme} />
        <ExpandMemeModal
          visible={expandedMeme !== null}
          meme={expandedMeme}
          onCloseModal={() => setExpandedMeme(null)}
        />
        <Portal.Root className="portal--toast">
          <Toaster
            toastOptions={{
              className: 'dark:bg-bg-primary-dark dark:text-typography-body-strong-dark border border-gray-500',
              style: {
                padding: '8px',
                paddingLeft: '16px',
                paddingRight: '16px',
                fontSize: '0.875rem',
              },
            }}
          />
        </Portal.Root>
      </div>
    </IdProvider>
  )
}

export default MyApp
