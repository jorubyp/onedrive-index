import Head from 'next/head'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { PreviewContainer } from '../components/previews/Containers'
import Loading from '../components/Loading'
import { t } from 'i18next'
import FourOhFour from '../components/FourOhFour'
import { useProtectedSWRWatch } from '../utils/fetchWithSWR'
import { FC } from 'react'
import React from 'react'
import DownloadButtons from '../components/DownloadButtons'
import AudioPreview from '../components/previews/AudioPreview'
import DescriptionPreview from '../components/previews/DescriptionPreview'
import ReadmePreview from '../components/previews/ReadmePreview'
import VideoPreview from '../components/previews/VideoPreview'
import { EmbedData, OdFileObject } from '../types'

const EmbedHead: FC<{ embedData: EmbedData}> = ({embedData}) => (
  <Head>
    <meta name='title' content={embedData?.title}></meta>
    <meta name='description' content={embedData?.shortDescription}></meta>
    <meta property='og:title' content={embedData?.title}></meta>
    <meta property="og:type" content="video.movie" />
    <meta property='og:image' content={embedData?.thumb}></meta>
    <meta property='og:url' content={embedData?.url}></meta>
    <meta property='og:video' content={embedData?.video}></meta>
    <meta property='og:description' content={embedData?.description}></meta>
  </Head>
)
const AudioPlayer = React.memo<{ file: OdFileObject }>(function AudioPlayer({ file }) {
  return <AudioPreview file={file}/>;
});

const VideoPlayer = React.memo<{
  file: OdFileObject,
  thumbFile: OdFileObject | undefined,
  subsFile: OdFileObject | undefined,
}>(function VideoPlayer({ file, thumbFile, subsFile }) {
  return <VideoPreview file={file} thumbFile={thumbFile} subsFile={subsFile}/>;
});

const ReadMePreview = React.memo<{ file: OdFileObject }>(function ReadMePreview({ file }) {
  return <ReadmePreview file={file} />;
});

export default function Watch() {
  const router = useRouter()
  const { query } = router
  const { v: videoId = '' } = query
  let {
    isLoading,
    data: [ {
      path = null,
      watchFiles = null,
      embedData = null,
      error = null
    } = {} ] = [ ]
  } = useProtectedSWRWatch(videoId as string)
  if (path) {
    query.path = path.split('/')
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-900">
      {embedData && <EmbedHead embedData={embedData} />}
      <main className="flex w-full flex-1 flex-col bg-gray-50 dark:bg-gray-800">
        <Navbar />
        <div className="mx-auto w-full max-w-5xl py-4 sm:p-4">
            { isLoading
              ? <PreviewContainer><Loading loadingText={t('Loading ...')} /></PreviewContainer>
              : error ? <PreviewContainer><FourOhFour code={error.code} message={error.message} /></PreviewContainer>
              : <>
                  {watchFiles.video && <VideoPlayer file={watchFiles.video} thumbFile={watchFiles.thumb} subsFile={watchFiles.subs} />}
                  {!watchFiles.video && watchFiles.audio && <AudioPlayer file={watchFiles.audio} />}
                  <DownloadButtons files={watchFiles} />
                  {watchFiles.readme && <ReadMePreview file={watchFiles.readme} />}
                  {watchFiles.desc && <DescriptionPreview file={watchFiles.desc} />}
                </>
            }
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
