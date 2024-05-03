import type { OdFileObject, OdFolderChildren, OdFolderObject } from '../types'
import { ParsedUrlQuery } from 'querystring'
import { FC, MouseEventHandler, useEffect, useRef, useState } from 'react'
import { faYoutube, faTwitch, faTwitter } from '@fortawesome/free-brands-svg-icons'
import { faVideoCamera } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import toast, { Toaster } from 'react-hot-toast'
import emojiRegex from 'emoji-regex'

import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { useProtectedSWRInfinite } from '../utils/fetchWithSWR'
import { getFileIcon } from '../utils/getFileIcon'

import Loading, { LoadingIcon } from './Loading'
import FourOhFour from './FourOhFour'
import { PreviewContainer } from './previews/Containers'
import React from 'react'
import ReadmePreview from './previews/ReadmePreview'
import FolderListLayout from './FolderListLayout'
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
  
  const videoIdRegexp = /(?<path>\/.*\/)?\[(?<date>\d{8})\] (?<title>.+) \((?<videoId>[^\)]+)\)$/
  const { path, date, title, videoId } = original.match(videoIdRegexp)?.groups || {}

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

  let displayName = title
  if (platform === undefined) displayName += ` (${videoId})`

  const ymdRegexp = /(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})/
  const { year, month, day } = date.match(ymdRegexp)?.groups || {}
  const slashedDate = `${year}/${month}/${day}`
  
  const unPadChars = ['「', '【', '『', '［', '（', '〈', '〔', '《', '〘', '〚']
  const unPad = unPadChars.includes(displayName[0])

  let columns: string[] = []
  if (!breadcrumb) {
    if (platform !== undefined) columns.push(videoId)
    columns.push(slashedDate)
  }

  return (
    <>
      <span className={`${(!breadcrumb && unPad) ? '!-ml-2 ' : ''}grow truncate`}>
        {displayName}
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

export const Checkbox: FC<{
  checked: 0 | 1 | 2
  onChange: () => void
  title: string
  indeterminate?: boolean
}> = ({ checked, onChange, title, indeterminate }) => {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.checked = Boolean(checked)
      if (indeterminate) {
        ref.current.indeterminate = checked == 1
      }
    }
  }, [ref, checked, indeterminate])

  const handleClick: MouseEventHandler = e => {
    if (ref.current) {
      if (e.target === ref.current) {
        e.stopPropagation()
      } else {
        ref.current.click()
      }
    }
  }

  return (
    <span
      title={title}
      className="inline-flex cursor-pointer items-center rounded p-1.5 hover:bg-gray-300 dark:hover:bg-gray-600"
      onClick={handleClick}
    >
      <input
        className="form-check-input cursor-pointer"
        type="checkbox"
        value={checked ? '1' : ''}
        ref={ref}
        aria-label={title}
        onChange={onChange}
      />
    </span>
  )
}

export const Downloading: FC<{ title: string; style: string }> = ({ title, style }) => {
  return (
    <span title={title} className={`${style} rounded`} role="status">
      <LoadingIcon
        // Use fontawesome far theme via class `svg-inline--fa` to get style `vertical-align` only
        // for consistent icon alignment, as class `align-*` cannot satisfy it
        className="svg-inline--fa inline-block h-4 w-4 animate-spin"
      />
    </span>
  )
}

const ReadMePreview = React.memo<{ file: OdFileObject, path: string }>(function ReadMePreview({ file, path }) {
  return <ReadmePreview file={file} path={path} />;
});

const FileListing: FC<{ query?: ParsedUrlQuery }> = ({ query }) => {

  const router = useRouter()

  const { t } = useTranslation()

  const path = queryToPath(query)

  const { data, error, size, setSize } = useProtectedSWRInfinite(path)
  
  if (error) {
    // If error includes 403 which means the user has not completed initial setup, redirect to OAuth page
    if (error.status === 403) {
      router.push('/onedrive-index-oauth/step-1')
      return <div />
    }

    return (
      <PreviewContainer>
        <FourOhFour code={error.status} message={JSON.stringify(error.message)} />
      </PreviewContainer>
    )
  }
  if (!data) {
    return (
      <PreviewContainer>
        <Loading loadingText={t('Loading ...')} />
      </PreviewContainer>
    )
  }

  const responses: any[] = data ? [].concat(...data) : []

  const isLoadingInitialData = !data && !error
  const isLoadingMore = isLoadingInitialData || (size > 0 && data && typeof data[size - 1] === 'undefined')
  const isEmpty = data?.[0]?.length === 0
  const isReachingEnd = isEmpty || (data && typeof data[data.length - 1]?.next === 'undefined')
  const onlyOnePage = data && typeof data[0].next === 'undefined'

  if ('folder' in responses[0]) {
    // Expand list of API returns into flattened file data
    let folderChildren = [].concat(...responses.map(r => r.folder.value)) as OdFolderObject['value']

    // Find README.md file to render
    const readmeFile = folderChildren.find(c => c.name.toLowerCase() === 'readme.md')

    // Hide README.md from file listing
    folderChildren = folderChildren.filter(c => c.name.toLowerCase() !== 'readme.md')

    // If all the files start with dates, sort them chronologically descencding
    const videoList = folderChildren.every(child => child.name.match(/^\[\d{8}\] .+/))
    if (videoList) folderChildren.reverse()

    // Folder layout component props
    const folderProps = {
      toast,
      path,
      folderChildren
    }

    return (
      <>
        <Toaster />

        {readmeFile && <ReadMePreview  { ...folderProps } file={readmeFile as OdFileObject} />}
        <FolderListLayout {...folderProps} videoList={videoList}/>
        
        {!onlyOnePage && (
          <div className="rounded-b bg-white dark:bg-gray-900 dark:text-gray-100">
            <div className="border-b border-gray-200 p-3 text-center font-mono text-sm text-gray-400 dark:border-gray-700">
              {t('- showing {{count}} page(s) ', {
                count: size,
                totalFileNum: isLoadingMore ? '...' : folderChildren.length,
              }) +
                (isLoadingMore
                  ? t('of {{count}} file(s) -', { count: folderChildren.length, context: 'loading' })
                  : t('of {{count}} file(s) -', { count: folderChildren.length, context: 'loaded' }))}
            </div>
            <button
              className={`flex w-full items-center justify-center space-x-2 p-3 disabled:cursor-not-allowed ${
                isLoadingMore || isReachingEnd ? 'opacity-60' : 'hover:bg-gray-100 dark:hover:bg-gray-850'
              }`}
              onClick={() => setSize(size + 1)}
              disabled={isLoadingMore || isReachingEnd}
            >
              {isLoadingMore ? (
                <>
                  <LoadingIcon className="inline-block h-4 w-4 animate-spin" />
                  <span>{t('Loading ...')}</span>{' '}
                </>
              ) : isReachingEnd ? (
                <span>{t('No more files')}</span>
              ) : (
                <>
                  <span>{t('Load more')}</span>
                  <FontAwesomeIcon icon="chevron-circle-down" />
                </>
              )}
            </button>
          </div>
        )}
      </>
    )
  }

  const code = data[0]?.status
  const message = data[0]?.error ?? error ?? ''
  return (
    <PreviewContainer>
      <FourOhFour code={code} message={message} />
    </PreviewContainer>
  )
}
export default FileListing
