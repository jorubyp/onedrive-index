import Head from 'next/head'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import Navbar from '../components/Navbar'
import FileListing, { queryToPath } from '../components/FileListing'
import Footer from '../components/Footer'

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

export default function Folders() {
  const { query } = useRouter()
  const title = (query.path && Array.isArray(query.path) ? query.path[query.path.length - 1] : '')
  const formattedTitle = titleUnescape(title)

  const videoIdRegexp = /(?<path>\/.*\/)?\[(?<date>\d{8})\] (?<titlechannel>.+) \((?<videoId>[^\)]+)\)\/?$/
  const { videoId } = title.match(videoIdRegexp)?.groups || {}
  if (typeof window !== 'undefined' && videoId) {
    window.history.replaceState('', '', `/${videoId}`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-900">
      <Head>
        <title>{formattedTitle}</title>
      </Head>

      <main className="flex w-full flex-1 flex-col bg-gray-50 dark:bg-gray-800">
        <Navbar />
        <div className="mx-auto w-full max-w-5xl py-4 sm:p-4">
          <FileListing query={query} />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export async function getServerSideProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
