import type { OdFileObject } from '../../types'
import { FC, useEffect, useRef, useState } from 'react'

import ReactAudioPlayer from 'react-audio-player'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { PreviewContainer } from './Containers'
import { LoadingIcon } from '../Loading'

enum PlayerState {
  Loading,
  Ready,
  Playing,
  Paused,
}

const AudioPreview: FC<{ file: OdFileObject }> = ({ file }) => {

  const rapRef = useRef<ReactAudioPlayer>(null)
  const [playerStatus, setPlayerStatus] = useState(PlayerState.Loading)
  const [playerVolume, setPlayerVolume] = useState(1)
  
  // Render audio thumbnail, and also check for broken thumbnails
  const thumbnail = file.thumbnailUrl
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
        <div className="relative flex aspect-square w-full items-center justify-center rounded bg-gray-100 transition-all duration-75 dark:bg-gray-700 md:w-48">
          <div
            className={`absolute z-20 flex h-full w-full items-center justify-center transition-all duration-300 ${
              playerStatus === PlayerState.Loading
                ? 'bg-white opacity-80 dark:bg-gray-800'
                : 'bg-transparent opacity-0'
            }`}
          >
            <LoadingIcon className="z-10 inline-block h-5 w-5 animate-spin" />
          </div>

          {!brokenThumbnail ? (
            <div className="absolute m-4 aspect-square rounded-full shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={`h-full w-full rounded-full object-cover object-top ${
                  playerStatus === PlayerState.Playing ? 'animate-spin-slow' : ''
                }`}
                src={thumbnail}
                alt={file.name}
                onError={() => setBrokenThumbnail(true)}
              />
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
