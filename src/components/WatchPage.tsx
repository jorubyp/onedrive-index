import type { OdFileObject } from '../types'
import { ParsedUrlQuery } from 'querystring'
import { FC } from 'react'

import { getExtension } from '../utils/getFileIcon'
import VideoPreview from './previews/VideoPreview'

import React from 'react'
import FolderListDownloadButtons from './DownloadButtons'
import ReadmePreview from './previews/ReadmePreview'
import DescriptionPreview from './previews/DescriptionPreview'
import AudioPreview from './previews/AudioPreview'
import { queryToPath } from './FileListing'

const AudioPlayer = React.memo<{ file: OdFileObject, path: string, thumbFile: OdFileObject | undefined }>(function AudioPlayer({ file, path, thumbFile }) {
  return <AudioPreview file={file} path={path} thumbFile={thumbFile}/>;
});

const VideoPlayer = React.memo<{
  file: OdFileObject,
  thumbFile: OdFileObject | undefined,
  subsFile: OdFileObject | undefined,
  path: string
}>(function VideoPlayer({ file, thumbFile, subsFile, path }) {
  return <VideoPreview file={file} thumbFile={thumbFile} subsFile={subsFile} path={path}/>;
});

const ReadMePreview = React.memo<{ file: OdFileObject, path: string }>(function ReadMePreview({ file, path }) {
  return <ReadmePreview file={file} path={path} />;
});

const WatchPage: FC<{ query: ParsedUrlQuery, files: OdFileObject[] }> = ({ query, files }) => {

  const path = queryToPath(query)

  const readmeFile = files.find(c => c.name.toLowerCase() === 'readme.md')

  const descFile = files.find(c => c.name.endsWith('.description'))
  
  const videoExts = [
    "mp4", "mkv", "webm"
  ]
  const audioExts = [
    "m4a", "ogg", "mp3"
  ]
  const thumbExts = [
    "jpg", "png", "webp"
  ]
  const subsExts = [
    "vtt", "srt", "ass"
  ]

  // Find files to use
  const videoFile = files.find(c => videoExts.includes(getExtension(c.name)))
  const audioFile = files.find(c => audioExts.includes(getExtension(c.name)))
  const thumbFile = files.find(c => thumbExts.includes(getExtension(c.name)))
  const subsFile = files.find(c => subsExts.includes(getExtension(c.name)))

  // Hide README.md from file listing
  files = files.filter(c => c.name.toLowerCase() !== 'readme.md')

  // Folder layout component props
  const folderProps = {
    path,
    folderChildren: files,
  }

  return (
    <>
      {videoFile && <VideoPlayer { ...folderProps } file={videoFile as OdFileObject} thumbFile={thumbFile as OdFileObject | undefined} subsFile={subsFile as OdFileObject | undefined} />}
      {!videoFile && audioFile && <AudioPlayer { ...folderProps } file={audioFile as OdFileObject} thumbFile={thumbFile} />}
      {(videoFile || audioFile) && <FolderListDownloadButtons { ...folderProps } videoFile={videoFile as OdFileObject} />}
      {readmeFile && <ReadMePreview  { ...folderProps } file={readmeFile as OdFileObject} />}
      {descFile && <DescriptionPreview  { ...folderProps } file={descFile as OdFileObject} />}
    </>
  )
}
export default WatchPage
