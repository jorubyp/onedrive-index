import type { OdFileObject, OdFolderChildren } from '../types'

import { FC, MouseEventHandler } from 'react'
import { useClipboard } from 'use-clipboard-copy'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useTranslation } from 'next-i18next'
import Image from 'next/image'

import { getBaseUrl } from '../utils/getBaseUrl'
import { humanFileSize } from '../utils/fileDetails'

import { getStoredToken } from '../utils/protectedRouteHandler'
import { getFileIcon } from '../utils/getFileIcon'
import { IconProp } from '@fortawesome/fontawesome-svg-core'

const btnStyleMap = (btnColor?: string) => {
  const colorMap = {
    gray: 'hover:text-gray-600 dark:hover:text-white focus:ring-gray-200 focus:text-gray-600 dark:focus:text-white border-gray-300 dark:border-gray-500 dark:focus:ring-gray-500',
    blue: 'hover:text-blue-600 focus:ring-blue-200 focus:text-blue-600 border-blue-300 dark:border-blue-700 dark:focus:ring-blue-500',
    teal: 'hover:text-teal-600 focus:ring-teal-200 focus:text-teal-600 border-teal-300 dark:border-teal-700 dark:focus:ring-teal-500',
    red: 'hover:text-red-600 focus:ring-red-200 focus:text-red-600 border-red-300 dark:border-red-700 dark:focus:ring-red-500',
    green:
      'hover:text-green-600 focus:ring-green-200 focus:text-green-600 border-green-300 dark:border-green-700 dark:focus:ring-green-500',
    pink: 'hover:text-pink-600 focus:ring-pink-200 focus:text-pink-600 border-pink-300 dark:border-pink-700 dark:focus:ring-pink-500',
    yellow:
      'hover:text-yellow-400 focus:ring-yellow-100 focus:text-yellow-400 border-yellow-300 dark:border-yellow-400 dark:focus:ring-yellow-300',
    black: 
      'hover:text-black-400 focus:ring-black-100 focus:text-black-400 border-black-300 dark:border-black-400 dark:focus:ring-black-300',
    white: 
      'hover:text-white-400 focus:ring-white-100 focus:text-white-400 border-white-300 dark:border-white-400 dark:focus:ring-white-300',
    indigo: 
      'hover:text-indigo-400 focus:ring-indigo-100 focus:text-indigo-400 border-indigo-300 dark:border-indigo-400 dark:focus:ring-indigo-300',
    purple: 
      'hover:text-purple-400 focus:ring-purple-100 focus:text-purple-400 border-purple-300 dark:border-purple-400 dark:focus:ring-purple-300',
    cyan: 
      'hover:text-cyan-400 focus:ring-cyan-100 focus:text-cyan-400 border-cyan-300 dark:border-cyan-400 dark:focus:ring-cyan-300',
    orange: 
      'hover:text-orange-400 focus:ring-orange-100 focus:text-orange-400 border-orange-300 dark:border-orange-400 dark:focus:ring-orange-300',
  }

  if (btnColor) {
    return colorMap[btnColor]
  }

  return colorMap.gray
}

export const DownloadButton = ({
  onClickCallback,
  btnColor,
  btnText,
  btnIcon,
  btnImage,
  btnTitle,
}: {
  onClickCallback: MouseEventHandler<HTMLButtonElement>
  btnColor?: string
  btnText: string
  btnIcon?: IconProp
  btnImage?: string
  btnTitle?: string
}) => {
  return (
    <button
      className={`flex items-center justify-center grow space-x-2 rounded-lg border bg-white py-2 px-4 text-sm font-medium text-gray-900 hover:bg-gray-100/10 focus:z-10 focus:ring-2 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-900 ${btnStyleMap(
        btnColor
      )}`}
      title={btnTitle}
      onClick={onClickCallback}
    >
      {btnIcon && <FontAwesomeIcon icon={btnIcon} />}
      {btnImage && <Image src={btnImage} alt={btnImage} width={20} height={20} priority />}
      <span>{btnText}</span>
    </button>
  )
}

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
    if (file.name.endsWith('.info.json') || file.name.endsWith('.info')) {
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

  const downloadFile = async (file: OdFileObject) => {
    const url = `${getBaseUrl()}/api/raw/?path=${path}/${encodeURIComponent(file.name)}${hashedToken ? `&odpt=${hashedToken}` : ''}`
    console.log(url)
    const tmpLink = document.createElement("a")
    tmpLink.style.display = 'none'
    document.body.appendChild(tmpLink)
    tmpLink.setAttribute( 'href', url );
    if (file.name.endsWith('.info')) {
        const blob: Blob = new Blob([await fetch(url).then(r => r.blob())], {type: 'application/json'});
        const fileName: string = file.name + '.json'
        const objectUrl: string = URL.createObjectURL(blob);
        tmpLink.href = objectUrl;
        tmpLink.download = fileName;
        tmpLink.click();        
        URL.revokeObjectURL(objectUrl);
    } else {
      tmpLink.click();
    }
    document.body.removeChild(tmpLink)
  }

  return (
    <div className="rounded-b border-gray-900/10 bg-white bg-opacity-80 p-2 shadow-sm backdrop-blur-md dark:border-gray-500/30 dark:bg-gray-900">
      <div className="mb-2 flex flex-wrap justify-center gap-2">
        {videoDetails &&
          <DownloadButton
            onClickCallback={() => downloadFile(videoFile as OdFileObject)}
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
              onClickCallback={() => downloadFile(c as OdFileObject)}
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
