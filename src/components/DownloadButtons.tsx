import type { OdDriveItem, OdFileObject, OdFolderChildren } from '../types'

import { FC, MouseEventHandler } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useTranslation } from 'next-i18next'
import Image from 'next/image'

import { humanFileSize } from '../utils/fileDetails'

import { getExtension, getFileIcon } from '../utils/getFileIcon'
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
  "Audio Only": "purple",
  "Thumbnail": "teal",
  "Description": "grey",
  "Metadata": "cyan",
  "Live Chat": "yellow",
}

const types = {
  Video: ["mp4","mkv"],
  "Audio Only": ["m4a","mp3","ogg"],
  Thumbnail: ["jpg","png","webp"],
  Description: ["description"]
}

const GetFileDetails = (file: OdFileObject) => {
  const fname = file.name.substring(0, file.name.lastIndexOf('.'))
  let ext = getExtension(file.name)
  let fileType = ''
  for (const type in types) {
    if (types[type].includes(ext)) {
      fileType = type
      break
    }
  }
  if (fileType === '') {
    if (file.name.endsWith('.info.json') || ext === 'info') {
      fileType = "Metadata"
      ext = 'info.json'
    }
    if (file.name.includes('.live_chat.json')) {
      fileType = "Live Chat"
    }
  }
  if (fileType !== '') {
    const color = fileTypeColors[fileType]
    const index = Object.keys(fileTypeColors).indexOf(fileType)
    //if (['Video', 'Audio Only'].includes(fileType)) {
    //  fileType += ` (${humanFileSize(file.size)})`
    //}
    return { fileType, color, index, fname, ext }
  }
}

const FolderListDownloadButtons: FC<{
  path: string,
  folderChildren: OdFolderChildren[],
  videoFile: OdFileObject
}> = ({
  path,
  folderChildren,
  videoFile,
}) => {
  const { t } = useTranslation()
  
  let totalSize = 0
  for (let i = 0; i < folderChildren.length; i++) {
    if (folderChildren[i].folder) continue
    totalSize += folderChildren[i].size
  }

  const downloadFiles = async (files: FilePair[]) => {
    const tmpLink = document.createElement("a")
    tmpLink.style.display = 'none'
    document.body.appendChild(tmpLink)
    for(let i = 0; i < files.length; i++) {
      setTimeout(async () => {
        let url = files[i].file["@microsoft.graph.downloadUrl"]
        if (files[i].details?.fileType === "Metadata") {
          const blob: Blob = new Blob([await fetch(url).then(r => r.blob())], {type: 'application/json'});
          url = URL.createObjectURL(blob);
        }
        tmpLink.setAttribute( 'href', url );
        tmpLink.download = `${files[i].details?.fname}.${files[i].details?.ext}`
        tmpLink.click();
      }, i*333)
    }
    document.body.removeChild(tmpLink)
  }

  type FilePair = {
    file: OdFileObject,
    details: {
      fileType: string,
      color: string,
      index: number,
      ext: string,
      fname: string
    } | undefined
  }

  const videoPair = videoFile && {
    file: videoFile,
    details: GetFileDetails(videoFile)
  }

  const audioFile = folderChildren.filter(c => types['Audio Only'].includes(getExtension(c.name)))[0] as OdFileObject

  const audioPair = audioFile && {
    file: audioFile,
    details: GetFileDetails(audioFile)
  } as FilePair

  const subFiles = folderChildren.filter(c => ![videoFile?.id, audioFile?.id].includes(c.id))
    .map(c => ({
      file: c as OdFileObject,
      details: GetFileDetails(c as OdFileObject)
    } as FilePair))

  const allFiles = [videoPair, audioPair, ...subFiles].filter(x => x)

  return (
    <div className="rounded-b border-gray-900/10 bg-white bg-opacity-80 p-2 shadow-sm backdrop-blur-md dark:border-gray-500/30 dark:bg-gray-900">
      <div className="mb-2 flex flex-wrap justify-center gap-2">
        {videoPair?.details &&
          <DownloadButton
            onClickCallback={() => downloadFiles([ videoPair ])}
            btnColor={videoPair.details["color"]}
            btnText={`${videoPair.details["fileType"]} (${humanFileSize(videoFile.size)})`}
            btnIcon={getFileIcon(videoFile.name, { video: Boolean(videoFile.video)})}
            btnTitle={`Download ${videoPair.details["fileType"]} (${humanFileSize(videoFile.size)})`}
          />
        }
        {audioPair?.details &&
          <DownloadButton
            onClickCallback={() => downloadFiles([ audioPair ])}
            btnColor={audioPair.details["color"]}
            btnText={`${audioPair.details["fileType"]} (${humanFileSize(audioFile.size)})`}
            btnIcon={getFileIcon(audioFile.name)}
            btnTitle={`Download ${audioPair.details["fileType"]} (${humanFileSize(audioFile.size)})`}
          />
        }
        <DownloadButton
          onClickCallback={() => downloadFiles(allFiles)}
          btnColor="pink"
          btnText={`All Files (${humanFileSize(totalSize)})`}
          btnIcon="download"
          btnTitle={t(`Download All (${humanFileSize(totalSize)})`)}
        />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {subFiles.sort(({ file: a }, { file: b }) => {
          const adet = GetFileDetails(a as OdFileObject) || { index: 99 }
          const bdet = GetFileDetails(b as OdFileObject) || { index: 99 }
          return adet["index"] > bdet["index"] ? 1 : 0
        })
        .map(({ file, details }, i) => {
          if (details) return (
            <DownloadButton
              key={i}
              onClickCallback={() => downloadFiles([{ file, details }])}
              btnColor={details.color}
              btnText={`${details.fileType} (${humanFileSize(file.size)})`}
              btnIcon={getFileIcon(file.name, { video: Boolean(file.video)})}
              btnTitle={`Download ${details.fileType} (${humanFileSize(file.size)})`}
            />
          )
        })}
      </div>
    </div>
  )
}

export default FolderListDownloadButtons
