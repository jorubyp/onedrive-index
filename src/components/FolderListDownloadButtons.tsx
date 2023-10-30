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

async function shorten(longPath: string): Promise<string> {
  const response = await fetch("/api/shorten", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: longPath }),
  });
  const data = await response.json();
  return data["short"]
}

const FolderListDownloadButtons = ({
  path,
  folderChildren,
  selected,
  handleSelectedDownload,
  toast,
}) => {
  const clipboard = useClipboard()
  const hashedToken = getStoredToken(path)

  const { t } = useTranslation()
  
  let totalSize = 0
  folderChildren.forEach((c: OdFolderChildren) => {
    if (c.folder) return
    totalSize += c.size
    selected[c.id] = true
  })

  // Get item path from item name
  const getItemPath = (name: string) => `${path === '/' ? '' : path}/${encodeURIComponent(name)}`
  
  return (
    <div className="sticky bottom-0 left-0 right-0 z-10 rounded-b border-gray-900/10 bg-white bg-opacity-80 p-2 shadow-sm backdrop-blur-md dark:border-gray-500/30 dark:bg-gray-900">
      <div className="flex flex-wrap justify-center gap-2">
        {folderChildren.sort((a: OdFolderChildren, b: OdFolderChildren) => {
          const adet = GetFileDetails(a as OdFileObject) || { index: 99 }
          const bdet = GetFileDetails(b as OdFileObject) || { index: 99 }
          return adet["index"] > bdet["index"]
        }).map((c: OdFolderChildren) => {
          const fileDetails = GetFileDetails(c as OdFileObject)
          if (fileDetails) return (
            <DownloadButton
              onClickCallback={() => window.open(`/api/raw/?path=${getItemPath(c.name)}${hashedToken ? `&odpt=${hashedToken}` : ''}`)}
              btnColor={fileDetails["color"]}
              btnText={fileDetails["fileType"]}
              btnIcon={getFileIcon(c.name, { video: Boolean(c.video)})}
              btnTitle={`Download ${fileDetails["fileType"].toLowerCase()} (${humanFileSize(c.size)})`}
            />
          )
        })}
        <DownloadButton
          onClickCallback={handleSelectedDownload}
          btnColor="pink"
          btnText={`All (${humanFileSize(totalSize)})`}
          btnIcon="download"
          btnTitle={t(`Download All (${humanFileSize(totalSize)})`)}
        />
        <DownloadButton
          onClickCallback={async () => {
            clipboard.copy(`${getBaseUrl()}/${await shorten(path)}`)
            toast.success(t('Copied short link to clipboard.'))
          }}
          btnColor="teal"
          btnText={t('Copy Link')}
          btnIcon="copy"
          btnTitle={t('Copy short link to the clipboard')}
        />
      </div>
    </div>
  )
}

export default FolderListDownloadButtons
