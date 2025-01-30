import 'tailwindcss/tailwind.css'
import '../styles/globals.css'
import Head from 'next/head'
import React, { useEffect, useState } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import * as Portal from '@radix-ui/react-portal'
import { IdProvider } from '@radix-ui/react-id'
import { IconGitHub, Typography } from '@supabase/ui'
import Header from '../components/Header/Header'
import ExpandMemeModal from '../components/ExpandMemeModal/ExpandMemeModal'


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
      <div className="relative bg-[url(/img/bg.png)] bg-cover bg-center">
        <Head>
          <title>Meme Maker | Supabase</title>
          <meta property="og:title" content="MLG Meme Maker" />
          <meta
            property="og:description"
            content="Create your best memes in seconds."
          />
          <meta
            property="og:image"
            content="https://bmtrdqbewjmochuaayqp.supabase.co/storage/v1/object/sign/memes/public/20ee5fda-4d7d-44df-a950-a0fe548e52bf-1738276101126.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJtZW1lcy9wdWJsaWMvMjBlZTVmZGEtNGQ3ZC00NGRmLWE5NTAtYTBmZTU0OGU1MmJmLTE3MzgyNzYxMDExMjYucG5nIiwiaWF0IjoxNzM4Mjc4MzU1LCJleHAiOjIwNTM2MzgzNTV9.ApDJcXo1DYYDEoOE5G6_P3xYxr9opWmqzoAjtOqrJf0"
          />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:creator" content="joshenlimek" />
          <meta name="twitter:title" content="Meme Maker | Powered by Supabase" />
          <meta
            name="twitter:description"
            content="Create your best memes in seconds."
          />
          <meta
            name="twitter:image"
            content="https://bmtrdqbewjmochuaayqp.supabase.co/storage/v1/object/sign/memes/public/20ee5fda-4d7d-44df-a950-a0fe548e52bf-1738276101126.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJtZW1lcy9wdWJsaWMvMjBlZTVmZGEtNGQ3ZC00NGRmLWE5NTAtYTBmZTU0OGU1MmJmLTE3MzgyNzYxMDExMjYucG5nIiwiaWF0IjoxNzM4Mjc4MzU1LCJleHAiOjIwNTM2MzgzNTV9.ApDJcXo1DYYDEoOE5G6_P3xYxr9opWmqzoAjtOqrJf0"
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
