import type { OdFileObject, OdFolderChildren } from '../types'

import Link from 'next/link'
import { FC } from 'react'
import { useClipboard } from 'use-clipboard-copy'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useTranslation } from 'next-i18next'

import { getBaseUrl } from '../utils/getBaseUrl'
import { humanFileSize, formatModifiedDateTime } from '../utils/fileDetails'

import { Downloading, Checkbox, ChildIcon, ChildName } from './FileListing'
import { getStoredToken } from '../utils/protectedRouteHandler'
import { DownloadButton } from './DownloadBtnGtoup'
import { getFileIcon } from '../utils/getFileIcon'
import { useRouter } from 'next/router'
import { DownloadBtnContainer } from './previews/Containers'


const fileTypeColors = {
  "Video": "orange",
  "Audio": "purple",
  "Thumbnail": "blue",
  "Description": "grey",
  "Info": "cyan",
  "Live Chat": "yellow",
}

const GetFileDetails = (file: OdFileObject) => {
  const ext = file.name.substring(file.name.lastIndexOf('.'))
  let fileType = ''
  const types = {
    Video: [".mp4",".mkv"],
    Audio: [".m4a",".mp3",".ogg"],
    Thumbnail: [".jpg",".png",".webp"],
    Description: [".description"]
  }
  for (const type in types) {
    if (types[type].includes(ext)) {
      fileType = type
      break
    }
  }
  if (fileType === '') {
    if (file.name.endsWith('.info.json')) {
      fileType = "Info"
    }
    if (file.name.includes('.live_chat.json')) {
      fileType = "Live Chat"
    }
  }
  if (fileType !== '') {
    const color = fileTypeColors[fileType]
    const index = Object.keys(fileTypeColors).indexOf(fileType)
    //if (['Video', 'Audio'].includes(fileType)) {
    //  fileType += ` (${humanFileSize(file.size)})`
    //}
    return { fileType, color, index }
  }
}

const shorten = (longPath: string) => {
  const videoIdRegexp = /.+ \[.+\] \((?<videoId>[^)]+)\)$/
  const { videoId } = decodeURIComponent(longPath).match(videoIdRegexp)?.groups || {}
  return videoId
}

const FolderListDownloadButtons: FC<{
  path: string,
  folderChildren: OdFolderChildren[],
  selected: { [key: string]: boolean },
  handleSelectedDownload: any,
  toast: any,
  videoFile: OdFileObject
}> = ({
  path,
  folderChildren,
  selected,
  handleSelectedDownload,
  toast,
  videoFile,
}) => {
  const clipboard = useClipboard()
  const hashedToken = getStoredToken(path)

  const { t } = useTranslation()
  
  let totalSize = 0
  for (let i = 0; i < folderChildren.length; i++) {
    if (folderChildren[i].folder) continue
    totalSize += folderChildren[i].size
    selected[folderChildren[i].id] = true
  }

  // Get item path from item name
  const getItemPath = (name: string) => `${path === '/' ? '' : path}/${encodeURIComponent(name)}`
  
  const videoDetails = GetFileDetails(videoFile)
  
  return (
    <div className="sticky bottom-0 left-0 right-0 z-10 rounded-b border-gray-900/10 bg-white bg-opacity-80 p-2 shadow-sm backdrop-blur-md dark:border-gray-500/30 dark:bg-gray-900">
      <div className="mb-2 flex flex-wrap justify-center gap-2">
        {videoDetails &&
          <DownloadButton
            onClickCallback={() => window.open(`/api/raw/?path=${getItemPath(videoFile.name)}${hashedToken ? `&odpt=${hashedToken}` : ''}`)}
            btnColor={videoDetails["color"]}
            btnText={`${videoDetails["fileType"]} (${humanFileSize(videoFile.size)})`}
            btnIcon={getFileIcon(videoFile.name, { video: Boolean(videoFile.video)})}
            btnTitle={`Download ${videoDetails["fileType"]} (${humanFileSize(videoFile.size)})`}
          />
        }
        <DownloadButton
          onClickCallback={handleSelectedDownload}
          btnColor="pink"
          btnText={`All (${humanFileSize(totalSize)})`}
          btnIcon="download"
          btnTitle={t(`Download All (${humanFileSize(totalSize)})`)}
        />
        <DownloadButton
          onClickCallback={() => {
            const shortPath = shorten(path)
            if (shortPath) {
              clipboard.copy(`${getBaseUrl()}/${shortPath}`)
            } else {
              clipboard.copy(`${getBaseUrl()}/${path}}`)
            }
            toast.success(t('Copied link to clipboard.'))
          }}
          btnColor="teal"
          btnText={t('Copy Link')}
          btnIcon="copy"
          btnTitle={t('Copy link to the clipboard')}
        />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {folderChildren.sort((a: OdFolderChildren, b: OdFolderChildren) => {
          const adet = GetFileDetails(a as OdFileObject) || { index: 99 }
          const bdet = GetFileDetails(b as OdFileObject) || { index: 99 }
          return adet["index"] > bdet["index"] ? 0 : 1
        })
        .filter((c: OdFolderChildren) => c.id !== (videoFile as OdFileObject).id)
        .map((c: OdFolderChildren) => {
          const fileDetails = GetFileDetails(c as OdFileObject)
          if (fileDetails) return (
            <DownloadButton
              onClickCallback={() => window.open(`/api/raw/?path=${getItemPath(c.name)}${hashedToken ? `&odpt=${hashedToken}` : ''}`)}
              btnColor={fileDetails["color"]}
              btnText={`${fileDetails["fileType"]} (${humanFileSize(c.size)})`}
              btnIcon={getFileIcon(c.name, { video: Boolean(c.video)})}
              btnTitle={`Download ${fileDetails["fileType"]} (${humanFileSize(c.size)})`}
            />
          )
        })}
      </div>
    </div>
  )
}

export default FolderListDownloadButtons
