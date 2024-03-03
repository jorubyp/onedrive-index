import type { OdFileObject } from '../../types'

import { FC, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import axios from 'axios'
import Plyr from 'plyr-react'
import { useAsync } from 'react-async-hook'

import { getExtension } from '../../utils/getFileIcon'
import { getStoredToken } from '../../utils/protectedRouteHandler'

import FourOhFour from '../FourOhFour'
import Loading from '../Loading'

import 'plyr-react/plyr.css'

function PreviewContainer({ children }): JSX.Element {
  return <div className="rounded-t bg-white p-3 shadow-sm dark:bg-gray-900 dark:text-white">{children}</div>
}

const VideoPlayer: FC<{
  videoName: string
  videoUrl: string
  width?: number
  height?: number
  thumbnail: string
  subtitle: string
  isFlv: boolean
  mpegts: any
}> = ({ videoName, videoUrl, width, height, thumbnail, subtitle, isFlv, mpegts }) => {
  useEffect(() => {
    // Really really hacky way to inject subtitles as file blobs into the video element
    axios
      .get(subtitle, { responseType: 'blob' })
      .then(resp => {
        const track = document.querySelector('track')
        track?.setAttribute('src', URL.createObjectURL(resp.data))
      })
      .catch(() => {
        console.log('Could not load subtitle.')
      })

    if (isFlv) {
      const loadFlv = () => {
        // Really hacky way to get the exposed video element from Plyr
        const video = document.getElementById('plyr')
        const flv = mpegts.createPlayer({ url: videoUrl, type: 'flv' })
        flv.attachMediaElement(video)
        flv.load()
      }
      loadFlv()
    }
  }, [videoUrl, isFlv, mpegts, subtitle])

  // Common plyr configs, including the video source and plyr options
  const plyrSource = {
    type: 'video',
    title: videoName,
    poster: thumbnail,
    tracks: [{ kind: 'captions', label: videoName, src: '', default: true }],
  }
  const aspect = [ 16, 9 ] //[ width ?? 16, height ?? 9 ]
  if (aspect[0] < aspect[1]) aspect.reverse()
  const plyrOptions: Plyr.Options = {
    ratio: aspect.join(':'),//`${width ?? 16}:${height ?? 9}`,
    fullscreen: { iosNative: true },
  }
  if (!isFlv) {
    // If the video is not in flv format, we can use the native plyr and add sources directly with the video URL
    plyrSource['sources'] = [{ src: videoUrl }]
  }
  return <Plyr id="plyr" source={plyrSource as Plyr.SourceInfo} options={plyrOptions} />
}

const VideoPreview: FC<{ file: OdFileObject, thumbFile: OdFileObject | undefined, subsFile: OdFileObject | undefined, path: string}> = ({ file, thumbFile, subsFile, path }) => {
  let { asPath } = useRouter()
  asPath = path + `/${encodeURIComponent(file.name)}`
  
  const hashedToken = getStoredToken(asPath)
  const { t } = useTranslation()

  const defaultThumb = `/api/thumbnail/?path=${asPath}&size=large${hashedToken ? `&odpt=${hashedToken}` : ''}`
  // OneDrive generates thumbnails for its video files, we pick the thumbnail with the highest resolution
  const thumbnail = thumbFile
    ? `/api/raw/?path=${`${path}/${encodeURIComponent(thumbFile.name)}`}${hashedToken ? `&odpt=${hashedToken}` : ''}`
    : defaultThumb

  const { result: thumbBlob = defaultThumb } = useAsync(async () => {
    const blob: Blob = new Blob([await fetch(thumbnail).then(r => r.blob())], {type: 'application/json'});
    return URL.createObjectURL(blob)
  }, [ thumbnail ])

  // We assume subtitle files are beside the video with the same name, only webvtt '.vtt' files are supported
  const subtitle = subsFile && `/api/raw/?path=${`${path}/${encodeURIComponent(subsFile.name)}`}${hashedToken ? `&odpt=${hashedToken}` : ''}`

  // We also format the raw video file for the in-browser player as well as all other players
  const videoUrl = `/api/raw/?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`

  const isFlv = getExtension(file.name) === 'flv'
  const {
    loading,
    error,
    result: mpegts,
  } = useAsync(async () => {
    if (isFlv) {
      return (await import('mpegts.js')).default
    }
  }, [isFlv])

  return (
    <PreviewContainer>
      {error ? (
        <FourOhFour errorMsg={error.message} />
      ) : loading && isFlv ? (
        <Loading loadingText={t('Loading FLV extension...')} />
      ) : (
        <VideoPlayer
          videoName={file.name}
          videoUrl={videoUrl}
          width={file.video?.width}
          height={file.video?.height}
          thumbnail={thumbBlob}
          subtitle={subtitle ?? ''}
          isFlv={isFlv}
          mpegts={mpegts}
        />
      )}
    </PreviewContainer>
  )
}

export default VideoPreview
