import type { OdDriveItem, OdFileObject, OdFolderChildren } from '../../types'
import { FC, useEffect, useRef, useState } from 'react'

import ReactAudioPlayer from 'react-audio-player'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'

import { PreviewContainer } from './Containers'
import { LoadingIcon } from '../Loading'

enum PlayerState {
  Loading,
  Ready,
  Playing,
  Paused,
}

const AudioPreview: FC<{ file: OdFileObject, path: string, thumbFile: OdFileObject | undefined }> = ({ file, path, thumbFile }) => {
  const { t } = useTranslation()
  let { asPath } = useRouter()
  asPath = path + `/${encodeURIComponent(file.name)}`

  const rapRef = useRef<ReactAudioPlayer>(null)
  const [playerStatus, setPlayerStatus] = useState(PlayerState.Loading)
  const [playerVolume, setPlayerVolume] = useState(1)
  
  // Render audio thumbnail, and also check for broken thumbnails
  const thumbnail = thumbFile?.thumbnailUrl ?? file.thumbnailUrl
  const [brokenThumbnail, setBrokenThumbnail] = useState(false)

  useEffect(() => {
    // Manually get the HTML audio element and set onplaying event.
    // - As the default event callbacks provided by the React component does not guarantee playing state to be set
    // - properly when the user seeks through the timeline or the audio is buffered.
    const rap = rapRef.current?.audioEl.current
    if (rap) {
      rap.oncanplay = () => setPlayerStatus(PlayerState.Ready)
      rap.onended = () => setPlayerStatus(PlayerState.Paused)
      rap.onpause = () => setPlayerStatus(PlayerState.Paused)
      rap.onplay = () => setPlayerStatus(PlayerState.Playing)
      rap.onplaying = () => setPlayerStatus(PlayerState.Playing)
      rap.onseeking = () => setPlayerStatus(PlayerState.Loading)
      rap.onwaiting = () => setPlayerStatus(PlayerState.Loading)
      rap.onerror = () => setPlayerStatus(PlayerState.Paused)
      rap.onvolumechange = () => setPlayerVolume(rap.volume)
    }
  }, [])

  return (
    <PreviewContainer>
      <div className="flex flex-col space-y-4 md:flex-row md:space-x-4">
        <div className="flex w-full p-4 gap-3 items-center justify-center rounded-t bg-gray-100 transition-all duration-75 dark:bg-gray-900">
          {!brokenThumbnail ? (
            <div className="h-56 w-56 flex aspect-square rounded-full shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={`h-56 w-56 p-0.5 rounded-full object-cover object-top ${
                  playerStatus === PlayerState.Playing ? 'animate-spin-slow' : ''
                }`}
                style={{
                  flexShrink: '0',
                  border: '0.2rem solid #ffffff2e'
                }}
                src={thumbnail}
                alt={''}
                onError={() => setBrokenThumbnail(true)}
              />
              <div 
                className="dark:bg-gray-900/25 relative rounded-full"
                style={{
                  right: 'calc(50% + 1.75rem)',
                  top: 'calc(50% - 1.75rem)',
                  height: '3.5rem',
                  width: '3.5rem',
                  flexShrink: '0',
                  border: "1px solid #000000ad",
                }}
              >
                  <div
                    className="dark:bg-gray-900 rounded-full"
                    style={{
                      height: '2rem',
                      width: '2rem',
                      marginLeft: '0.7rem',
                      marginTop: '0.7rem',
                  }}/>
              </div>
            </div>
          ) : (
            <FontAwesomeIcon
              className={`z-10 h-5 w-5 ${playerStatus === PlayerState.Playing ? 'animate-spin' : ''}`}
              icon="music"
              size="2x"
            />
          )}
          <ReactAudioPlayer
            className="h-11 w-full"
            src={file["@microsoft.graph.downloadUrl"]}
            ref={rapRef}
            controls
            preload="auto"
            volume={playerVolume}
          />
        </div>
      </div>
    </PreviewContainer>
  )
}

export default AudioPreview
