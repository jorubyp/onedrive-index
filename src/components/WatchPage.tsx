import type { OdFileObject, OdFolderChildren } from '../types'
import { ParsedUrlQuery } from 'querystring'
import { FC } from 'react'
import { faYoutube, faTwitch, faTwitter } from '@fortawesome/free-brands-svg-icons'
import { faVideoCamera } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import toast, { Toaster } from 'react-hot-toast'
import emojiRegex from 'emoji-regex'

import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { getFileIcon, getExtension } from '../utils/getFileIcon'
import VideoPreview from './previews/VideoPreview'

import React from 'react'
import FolderListDownloadButtons from './DownloadButtons'
import ReadmePreview from './previews/ReadmePreview'
import DescriptionPreview from './previews/DescriptionPreview'
import AudioPreview from './previews/AudioPreview'
import { GetPlatformFromID, PlatformIcon } from './PlatformIcon'

/**
 * Convert url query into path string
 *
 * @param query Url query property
 * @returns Path string
 */
export const queryToPath = (query?: ParsedUrlQuery) => {
  if (query) {
    const { path } = query
    if (!path) return '/'
    if (typeof path === 'string') return `/${encodeURIComponent(path)}`
    return `/${path.map(p => encodeURIComponent(p)).join('/')}`
  }
  return '/'
}

// Render the icon of a folder child (may be a file or a folder), use emoji if the name of the child contains emoji
const renderEmoji = (name: string) => {
  const emoji = emojiRegex().exec(name)
  return { render: emoji && !emoji.index, emoji }
}

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

export const titleUnescape = (title: string) => {
  for (const [ to_char, from_char] of escape_chars)
    title = title.replaceAll(from_char, to_char)
  return title
}

const formatChildName = (name: string) => {
  const { render, emoji } = renderEmoji(name)
  return render ? name.replace(emoji ? emoji[0] : '', '').trim() : name
}

const splitChannelFromTitle = (fileName: string) => {
  if (fileName[fileName.length - 1] !== ']') return
  let start, end, open = 0
  const arr = fileName.split('')
  for (let i = arr.length - 1; i > -1; i--) {
    if (arr[i] === '[' && open === 1) {
      start = i + 1
      break
    }
    if (arr[i] === ']') {
      if (open === 0) {
        end = i
      }
      open += 1
    }
  }
  if (start && end) return {
    title: fileName.substring(0, start - 1),
    channel: fileName.substring(start, end)
  }
}

export const ChildName: FC<{ name: string; breadcrumb?: boolean }> = ({ name, breadcrumb = false}) => {
  const original = titleUnescape(formatChildName(name))
  
  const videoIdRegexp = /(?<path>\/.*\/)?\[(?<date>\d{8})\] (?<titlechannel>.+) \((?<videoId>[^\)]+)\)$/
  const { path, date, titlechannel, videoId } = original.match(videoIdRegexp)?.groups || {}

  if (path) return path.slice(1, path.length-1)
  
  if (!videoId) {
    return (
      <span className="truncate">
        {original}
      </span>
    )
  }

  const platform = GetPlatformFromID({ videoId })

  if (breadcrumb && platform !== undefined) return videoId

  let { title, channel } = splitChannelFromTitle(titlechannel) || { title: titlechannel, channel: ''}
  if (platform === undefined) title += ` (${videoId})`

  const ymdRegexp = /(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})/
  const { year, month, day } = date.match(ymdRegexp)?.groups || {}
  const slashedDate = `${year}/${month}/${day}`
  
  const unPadChars = ['「', '【', '『', '［', '（', '〈', '〔', '《', '〘', '〚']
  const unPad = unPadChars.includes(title[0])

  let columns: string[] = []
  if (!breadcrumb) {
    if (platform !== undefined) columns.push(videoId)
    columns.push(slashedDate)
  }

  return (
    <>
      <span className={`${(!breadcrumb && unPad) ? '!-ml-2 ' : ''}grow truncate`}>
        {title}
      </span>
      <span className={'font-mono pl-0.5 float-right font-medium flex gap-x-5 text-gray-750 group-hover:text-gray-700'}>
        {columns.map((s, i) => <><span className={columns.length > 1 && i === 0 ? 'md:block hidden' : ''}>{s}</span></>)}
      </span>
    </>
  )
}

export const ChildIcon: FC<{ child: OdFolderChildren }> = ({ child }) => {
  const { render, emoji } = renderEmoji(child.name)
  const videoIdRegexp = /(?<path>\/.*\/)?\[(?<date>\d{8})\] (?<titlechannel>.+) \((?<videoId>[^\)]+)\)$/
  const { videoId } = child.name.match(videoIdRegexp)?.groups || {}
  if (videoId) {
    const platform = GetPlatformFromID({ videoId })
    return PlatformIcon({ platform })
  }
  return render ? (
    <span>{emoji ? emoji[0] : '📁'}</span>
  ) : (
    <FontAwesomeIcon icon={child.file ? getFileIcon(child.name, { video: Boolean(child.video) }) : ['far', 'folder']} />
  )
}


const AudioPlayer = React.memo<{ file: OdFileObject, path: string }>(function AudioPlayer({ file, path }) {
  return <AudioPreview file={file} path={path}/>;
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

  const router = useRouter()

  const { t } = useTranslation()

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
    toast,
    path,
    folderChildren: files,
  }

  return (
    <>
      <Toaster />

      {videoFile && <VideoPlayer { ...folderProps } file={videoFile as OdFileObject} thumbFile={thumbFile as OdFileObject | undefined} subsFile={subsFile as OdFileObject | undefined} />}
      {!videoFile && audioFile && <AudioPlayer { ...folderProps } file={audioFile as OdFileObject} />}
      {(videoFile || audioFile) && <FolderListDownloadButtons { ...folderProps } videoFile={videoFile as OdFileObject} />}
      {readmeFile && <ReadMePreview  { ...folderProps } file={readmeFile as OdFileObject} />}
      {descFile && <DescriptionPreview  { ...folderProps } file={descFile as OdFileObject} />}
    </>
  )
}
export default WatchPage
