import { posix as pathPosix } from 'path'

import type { NextApiRequest, NextApiResponse } from 'next'

import apiConfig from '../../../config/api.config'
import siteConfig, { baseDirectory } from '../../../config/site.config'
import { OdDriveItem, OdFileObject } from '../../types'
import { drivesRequest, thumbnailsRequest } from '../../utils/graphApi'
import { encodePath, getAccessToken } from '.'
import { sanitiseQuery } from './search'
import axios from 'axios'

function mapAbsolutePath(path: string): string {
  // path is in the format of '/drive/root:/path/to/file', if baseDirectory is '/' then we split on 'root:',
  // otherwise we split on the user defined 'baseDirectory'
  const absolutePath = path.split(`onmicrosoft_com/Documents${baseDirectory === '/' ? '' : baseDirectory}`)
  // path returned by the API may contain #, by doing a decodeURIComponent and then encodeURIComponent we can
  // replace URL sensitive characters such as the # with %23
  return absolutePath[1]
    .split('/')
    .map(p => {
      let decoded = decodeURIComponent(p)
      try {
        decoded = decodeURIComponent(decoded)
      } catch {
        //
      }
      return decoded
    })
    .filter(x => x)
    .join('/')
}

const folderFromVideoId = async (videoId: any, includeMembers: boolean, accessToken: string): Promise<{
  path: string | null,
  driveId: string | null,
  error: any
}> => {
  try {
    const searchPath = `/root/search(q='${sanitiseQuery(videoId)}')`

    const { values, errors } = await drivesRequest({
      path: searchPath,
      params: {
        select: 'name,folder,parentReference,id,webUrl',
      },
      accessToken,
      includeMembers
    })
    const result = values.find(item => item.name.indexOf(`(${videoId})`) > -1)
    if (result) {
      const driveId = (result as OdDriveItem).parentReference.driveId
      let webUrl;
      if (result.folder) {
        webUrl = result["webUrl"]
      } else {
        const id = (result as OdDriveItem).parentReference.id;
        ({ data: { webUrl } } = await axios.get(`${siteConfig.baseUrl}/api/item/?id=${id}&driveId=${driveId}`))
      }
      const path = mapAbsolutePath(webUrl)
      return { path, driveId, error: null }
    } else if (errors.length) {
      return { path: null, driveId: null, error: errors[0]}
    }
  } catch {
    //
  }
  return { path: null, driveId: null, error: 'Not found'}
}

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
    res.status(404).json({ error: 'Not Found' })
    return
  }

  const accessToken = await getAccessToken()

  const { path, driveId, error } = await folderFromVideoId(videoId, includeMembers, accessToken)

  // If the path is not a valid path, return 400
  if (!path || !driveId) {
    res.status(404).json({ error: 'Not Found' })
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
    for (const file of files) {
      const driveId = (file as unknown as OdDriveItem).parentReference.driveId
      if (siteConfig.drives_members.includes(driveId)) {
        (file as unknown as OdDriveItem).members = true
      }
    }

    // Batch request thumbnail urls for children that are not folders
    const thumbnailUrls = await thumbnailsRequest(files, accessToken)
    for (let i = 0; i < thumbnailUrls.length; i++) {
      files[i].thumbnailUrl = thumbnailUrls[i]
    }
    
    if (files.length) {
      files.sort((a, b) => a.name.localeCompare(b.name))
      res.status(200).json({ path, files })
      return
    } else if (errors.length) {
      res.status(errors[0].code).json({ error: errors[0].message })
      return
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error.' })
    return
  }
  res.status(404).json({ error: 'Not Found' })
  return
}
