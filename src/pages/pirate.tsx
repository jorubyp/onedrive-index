import Head from 'next/head'
import { useRouter } from "next/router"
import { useEffect } from "react"
import useLocalStorage from "../utils/useLocalStorage"

import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { PreviewContainer } from '../components/previews/Containers'
import Loading from '../components/Loading'
import { t } from 'i18next'

export default function Pirate() {
  const router = useRouter()
  const [readMembers, setReadMembers] = useLocalStorage('includeMembers', false)

  useEffect(() => {
    if (!readMembers) setReadMembers(true)
    router.push('/')
  }, [router, readMembers, setReadMembers])
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-900">
      <Head>
        <title>Redirecting</title>
      </Head>

      <main className="flex w-full flex-1 flex-col bg-gray-50 dark:bg-gray-800">
        <Navbar />
        <div className="mx-auto w-full max-w-5xl py-4 sm:p-4">
          <nav className="mb-4 flex items-center justify-between px-4 sm:px-0 sm:pl-1">
          </nav>
          <PreviewContainer>
            <Loading loadingText={''} />
          </PreviewContainer>
        </div>
      </main>

      <Footer />
    </div>
  )
}