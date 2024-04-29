import { posix as pathPosix } from 'path'

import type { NextApiRequest, NextApiResponse } from 'next'

import apiConfig from '../../../config/api.config'
import siteConfig, { baseDirectory } from '../../../config/site.config'
import { EmbedData, OdDriveItem, OdFileObject, WatchFiles } from '../../types'
import { drivesRequest, thumbnailsRequest } from '../../utils/graphApi'
import { encodePath, getAccessToken } from '.'
import { sanitiseQuery } from './search'
import { getExtension } from '../../utils/getFileIcon'
import { pickBy, identity } from 'lodash'
import { titleUnescape } from '../../components/FileListing'
import { humanFileSize } from '../../utils/fileDetails'


function mapAbsolutePath(path: string): string {
  // path is in the format of '/drive/root:/path/to/file', if baseDirectory is '/' then we split on 'root:',
  // otherwise we split on the user defined 'baseDirectory'
  const absolutePath = path.split(`onmicrosoft_com/Documents${baseDirectory === '/' ? '' : baseDirectory}`)
  // path returned by the API may contain #, by doing a decodeURIComponent and then encodeURIComponent we can
  // replace URL sensitive characters such as the # with %23
  return absolutePath[1]
    .split('/')
    .map(p => decodeURIComponent(decodeURIComponent(p)))
    .filter(x => x)
    .join('/')
}

const folderFromVideoId = async (videoId: any, includeMembers: boolean, accessToken: string): Promise<{
  path: string | null,
  driveId: string | null,
  error: any
}> => {
  const searchPath = `/root/search(q='${sanitiseQuery(videoId)}')`

  const { values, errors } = await drivesRequest({
    path: searchPath,
    params: {
      select: 'webUrl,name,folder,parentReference',
    },
    accessToken,
    includeMembers
  })
  
  let folder = values.find(item => item.folder && item.name.endsWith(`(${videoId})`))
  if (folder) {
    const path = mapAbsolutePath(folder["webUrl"])
    const driveId = (folder as OdDriveItem).parentReference.driveId
    return { path, driveId, error: null }
  } else if (errors.length) {
    return { path: null, driveId: null, error: errors[0]}
  }
  return { path: null, driveId: null, error: { code: 404, message: 'Not Found'}}
}
    
const videoExts = [ "mp4", "mkv", "webm" ]
const audioExts = [ "m4a", "ogg", "mp3" ]
const thumbExts = [ "jpg", "png", "webp" ]
const subsExts = [ "vtt", "srt", "ass" ]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  let { videoId, members = 'false' } = req.query

  // Set edge function caching for faster load times, check docs:
  // https://vercel.com/docs/concepts/functions/edge-caching
  res.setHeader('Cache-Control', apiConfig.cacheControlHeader)

  const includeMembers: boolean = JSON.parse(members as string)

  // Sometimes the path parameter is defaulted to '[...path]' which we need to handle
  if (videoId === '[...path]') {
    res.status(400).json({ error: 'No path specified.' })
    return
  }
  // If the path is not found, return 404
  if (typeof videoId !== 'string') {
    res.status(404).json({ error: { code: 404, message: 'Not Found'} })
    return
  }

  const accessToken = await getAccessToken()

  const { path, driveId, error } = await folderFromVideoId(videoId, includeMembers, accessToken)

  // If the path is not a valid path, return 400
  if (!path || !driveId) {
    res.status(404).json({ error: { code: 404, message: 'Not Found'} })
    return
  }

  // Besides normalizing and making absolute, trailing slashes are trimmed
  const cleanPath = pathPosix.resolve('/', pathPosix.normalize(path)).replace(/\/$/, '')

  // Return error 403 if access_token is empty
  if (!accessToken) {
    res.status(403).json({ error: 'No access token.' })
    return
  }

  const encodedPath = encodePath(cleanPath)
  // Handle response from OneDrive API
  const requestPath = `/root${encodedPath}`

  // Querying current path identity (file or folder) and follow up query childrens in folder
  try {
    
    const { values: folderChildren, errors } = await drivesRequest({
      path: `${requestPath}:/children`,
      params: {
        select: 'name,size,id,@microsoft.graph.downloadUrl,file,video,image,parentReference',
      },
      accessToken,
      driveId
    })

    const files: OdFileObject[] = folderChildren.filter(child => child.file)

    for (const file of files) file.path = `${path}/${file.name}`

    // Batch request thumbnail urls for children that are not folders
    const thumbnailUrls = await thumbnailsRequest(files, accessToken)
    for (let i = 0; i < thumbnailUrls.length; i++) {
      files[i].thumbnailUrl = thumbnailUrls[i]
    }

    const watchFiles: WatchFiles = pickBy({
      readme: files.find(file => file.name.toLowerCase() === 'readme.md'),
      desc: files.find(file => file.name.endsWith('.description')),
      video: files.find(file => videoExts.includes(getExtension(file.name))),
      audio: files.find(file => audioExts.includes(getExtension(file.name))),
      thumb: files.find(file => thumbExts.includes(getExtension(file.name))),
      subs: files.find(file => subsExts.includes(getExtension(file.name))),
      meta: files.find(file => file.name.endsWith('.info') || file.name.endsWith('.info.json')),
      chat: files.find(file => file.name.indexOf('.live_chat.') > -1),
    }, identity)

    const { readme, ...namedFiles } = watchFiles

    let size = 0
    for (const file of Object.values(namedFiles)) {
      size += file.size
    }
    const filesStr = `${Object.values(namedFiles).length} files (${humanFileSize(size)})`

    const embedData: EmbedData = {
      title: videoId,
      shortDescription: filesStr,
      url: `${siteConfig.baseUrl}/watch?v=${videoId}`
    }

    for (const file of Object.values(namedFiles)) {
      size += file.size
      const re = /\[(?<date>\d{8})\] (?<title>.+) \[(?<channel>.+)\] \((?<videoId>[^\)]+)\)\..+/
      const { date, title, channel } = file.name.match(re)?.groups || {}
      if (date) {
        const dateStr = [date.slice(0,4), date.slice(4,6), date.slice(6,8)].join('/')
        embedData.title = titleUnescape(title),
        embedData.shortDescription = `${channel} - ${videoId} - ${dateStr}`
        break
      }
    }

    if (watchFiles.thumb && watchFiles.thumb.thumbnailUrl) {
      embedData.thumb = `${siteConfig.baseUrl}/api/thumbnail?id=${watchFiles.thumb.id}&driveId=${driveId}`
    } else if (watchFiles.video && watchFiles.video.thumbnailUrl) {
      embedData.thumb = `${siteConfig.baseUrl}/api/thumbnail?id=${watchFiles.video.id}&driveId=${driveId}`
    }

    const isMembers = siteConfig.drives_members.includes(driveId)

    if (watchFiles.video && !isMembers) {
      embedData.video = `${siteConfig.baseUrl}/api/raw?id=${watchFiles.video.id}&driveId=${driveId}`
    }

    if (watchFiles.readme && watchFiles.readme["@microsoft.graph.downloadUrl"]) {
      const res = await fetch(watchFiles.readme["@microsoft.graph.downloadUrl"])
      if (res.status === 200) {
        const content = await res.blob().then(blob => blob.text())
        watchFiles.readme.content = content
        let contentLines = content.split('\r\n')
        const titleLineRegexp = /### ``\[(?<date>\d{8})\] (?<title>.+) \[(?<channel>.+)\] \((?<videoId>[^\)]+)\)``/
        const { title } = contentLines[0].match(titleLineRegexp)?.groups || {}
        if (title) {
          embedData.title = title
          if (contentLines[1].match(/^\d+.+/)) {
            embedData.description = `${embedData.shortDescription}\n${contentLines[1]}\n${filesStr}`
          }
        }
      }
    }

    if (isMembers && !includeMembers) {
      for (const file in watchFiles) delete watchFiles[file]
    }
    
    if (files.length) {
      res.status(200).json({
        path,
        embedData,
        ...(!(isMembers && !includeMembers) ? { watchFiles } : { error: { code: 403, message: 'Forbidden' } })
      })
      return
    } else if (errors.length) {
      res.status(errors[0].code).json({ error: errors[0] })
      return
    }
  } catch (error: any) {
    res.status(500).json({ error: { code: 500, message: 'Internal server error.'} })
    return
  }
  res.status(404).json({ error: { code: 404, message: 'Not Found'} })
  return
}
