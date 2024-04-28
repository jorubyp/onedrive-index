import Head from 'next/head'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import siteConfig from '../../config/site.config'
import Navbar from '../components/Navbar'
import FileListing from '../components/FileListing'
import Footer from '../components/Footer'
import useLocalStorage from '../utils/useLocalStorage'
import { useEffect } from 'react'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-900">
      <Head>
        <title>{siteConfig.title}</title>
      </Head>

      <main className="flex w-full flex-1 flex-col bg-gray-50 dark:bg-gray-800">
        <Navbar />
        <div className="mx-auto w-full max-w-5xl py-4 sm:p-4">
          <FileListing />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export async function getServerSideProps(ctx) {
  return {
    props: {
      referrer: ctx.res.getHeader('referrer') || '',
      ...(await serverSideTranslations(ctx.locale, ['common'])),
    },
  }
}
