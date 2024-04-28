import Head from 'next/head'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import Navbar from '../components/Navbar'
import WatchPage from '../components/WatchPage'
import Footer from '../components/Footer'
import { PreviewContainer } from '../components/previews/Containers'
import Loading from '../components/Loading'
import { t } from 'i18next'
import FourOhFour from '../components/FourOhFour'
import { useProtectedSWRWatch } from '../utils/fetchWithSWR'
import useLocalStorage from '../utils/useLocalStorage'
import { useEffect } from 'react'

const escape_chars = [
  ["<", "＜"],
  [">", "＞"],
  [":", "："],
  ['"', '″'],
  ["/", "⧸"],
  ["\\", "⧹"],
  ["|", "｜"],
  ["?", "？"],
  ["*", "＊"],
]

const titleUnescape = (title: string) => {
  for (const [ to_char, from_char] of escape_chars)
    title = title.replaceAll(from_char, to_char)
  return title
}

export default function Watch() {
  const router = useRouter()
  const { query } = router
  const { v: videoId = '' } = query
  let {
    isLoading,
    data: [ { status = null, path = null, files = null, error: message = null } = {} ] = [ ],
    error = null
  } = useProtectedSWRWatch(videoId as string)

  if (status !== 200) {
    if (error) ({ status, message } = error)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-900">
        <Head>
          <title>{videoId}</title>
        </Head>

        <main className="flex w-full flex-1 flex-col bg-gray-50 dark:bg-gray-800">
          <Navbar />
          <div className="mx-auto w-full max-w-5xl py-4 sm:p-4">
            <PreviewContainer>
              { isLoading ? <Loading loadingText={t('Loading ...')} /> : <FourOhFour code={status} message={message} />}
            </PreviewContainer>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  query.path = path.split('/')
  const title = (query.path && Array.isArray(query.path) ? query.path[query.path.length - 1] : '')
  const formattedTitle = titleUnescape(title)
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-900">
      <Head>
        <title>{formattedTitle}</title>
      </Head>

      <main className="flex w-full flex-1 flex-col bg-gray-50 dark:bg-gray-800">
        <Navbar />
        <div className="mx-auto w-full max-w-5xl py-4 sm:p-4">
          <WatchPage query={query} files={files} />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export async function getServerSideProps(ctx) {
  return {
    props: {
      ...(await serverSideTranslations(ctx.locale, ['common'])),
    },
  }
}
