import { posix as pathPosix } from 'path'

import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

import apiConfig from '../../../config/api.config'
import siteConfig from '../../../config/site.config'
import { revealObfuscatedToken } from '../../utils/oAuthHandler'
import { getOdAuthTokens, storeOdAuthTokens } from '../../utils/odAuthTokenStore'
import { runCorsMiddleware } from './raw'
import { OdDriveItem, OdFileObject, OdFolderChildren } from '../../types'
import { drivesRequest, thumbnailsRequest } from '../../utils/graphApi'

export const fetchCache = 'force-no-store';
export const revalidate = 0;

const basePath = pathPosix.resolve('/', process.env.BASE_DIRECTORY || '/')
const clientId = process.env.CLIENT_ID || ''
const clientSecret = revealObfuscatedToken(process.env.CLIENT_SECRET || '')

/**
 * Encode the path of the file relative to the base directory
 *
 * @param path Relative path of the file to the base directory
 * @returns Absolute path of the file inside OneDrive
 */
export function encodePath(path: string): string {
  let encodedPath = pathPosix.join(basePath, path)
  if (encodedPath === '/' || encodedPath === '') {
    return ''
  }
  encodedPath = encodedPath
    .split('/')
    .map(s => encodeURIComponent(s))
    .filter(s => s)
    .join('/')
  return `:/${encodedPath}`
}

/**
 * Fetch the access token from Redis storage and check if the token requires a renew
 *
 * @returns Access token for OneDrive API
 */
export async function getAccessToken(): Promise<string> {
  const { accessToken, refreshToken } = await getOdAuthTokens()

  // Return in storage access token if it is still valid
  if (typeof accessToken === 'string') {
    console.log('Fetch access token from storage.')
    return accessToken
  }

  // Return empty string if no refresh token is stored, which requires the application to be re-authenticated
  if (typeof refreshToken !== 'string') {
    console.log('No refresh token, return empty access token.')
    return ''
  }

  // Fetch new access token with in storage refresh token
  const body = new URLSearchParams()
  body.append('client_id', clientId)
  body.append('redirect_uri', apiConfig.redirectUri)
  body.append('client_secret', clientSecret)
  body.append('refresh_token', refreshToken)
  body.append('grant_type', 'refresh_token')

  const resp = await axios.post(apiConfig.authApi, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  if ('access_token' in resp.data && 'refresh_token' in resp.data) {
    const { expires_in, access_token, refresh_token } = resp.data
    await storeOdAuthTokens({
      accessToken: access_token,
      accessTokenExpiry: parseInt(expires_in),
      refreshToken: refresh_token,
    })
    console.log('Fetch new access token with stored refresh token.')
    return access_token
  }

  return ''
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // If method is POST, then the API is called by the client to store acquired tokens
  if (req.method === 'POST') {
    const { obfuscatedAccessToken, accessTokenExpiry, obfuscatedRefreshToken } = req.body
    const accessToken = revealObfuscatedToken(obfuscatedAccessToken)
    const refreshToken = revealObfuscatedToken(obfuscatedRefreshToken)

    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
      res.status(400).send('Invalid request body')
      return
    }

    await storeOdAuthTokens({ accessToken, accessTokenExpiry, refreshToken })
    res.status(200).send('OK')
    return
  }

  // If method is GET, then the API is a normal request to the OneDrive API for files or folders
  let { path = '/', raw = false, next = '', sort = '', members = 'false' } = req.query

  // Set edge function caching for faster load times, check docs:
  // https://vercel.com/docs/concepts/functions/edge-caching
  res.setHeader('Cache-Control', apiConfig.cacheControlHeader)

  const includeMembers: boolean = JSON.parse(members as string)

  // Sometimes the path parameter is defaulted to '[...path]' which we need to handle
  if (path === '[...path]') {
    res.status(400).json({ error: 'No path specified.' })
    return
  }
  // If the path is not a valid path, return 400
  if (typeof path !== 'string') {
    res.status(400).json({ error: 'Path query invalid.' })
    return
  }
  // Besides normalizing and making absolute, trailing slashes are trimmed
  const cleanPath = pathPosix.resolve('/', pathPosix.normalize(path)).replace(/\/$/, '')

  // Validate sort param
  if (typeof sort !== 'string') {
    res.status(400).json({ error: 'Sort query invalid.' })
    return
  }

  const accessToken = await getAccessToken()

  // Return error 403 if access_token is empty
  if (!accessToken) {
    res.status(403).json({ error: 'No access token.' })
    return
  }

  const encodedPath = encodePath(cleanPath)
  // Handle response from OneDrive API
  const requestPath = `/root${encodedPath}`
  // Whether path is root, which requires some special treatment
  const isRoot = encodedPath === ''

  // Go for file raw download link, add CORS headers, and redirect to @microsoft.graph.downloadUrl
  // (kept here for backwards compatibility, and cache headers will be reverted to no-cache)
  if (raw) {
    await runCorsMiddleware(req, res)
    res.setHeader('Cache-Control', 'no-cache')

    const { datas: rawObjects } = await drivesRequest({
      path: requestPath,
      params: {
        // OneDrive international version fails when only selecting the downloadUrl (what a stupid bug)
        select: 'id,@microsoft.graph.downloadUrl',
      },
      accessToken,
      includeMembers, 
    })
    for (const folderObject of rawObjects) {
      if ('@microsoft.graph.downloadUrl' in folderObject) {
        res.redirect(folderObject['@microsoft.graph.downloadUrl'])
        return
      }
    }
    res.status(404).json({ error: 'No download url found.' })
    return
  }

  // Querying current path identity (file or folder) and follow up query childrens in folder
  try {
    const folders: OdFolderChildren[] = []
    const files: OdFileObject[] = []
    const pageTokens: string[] = []
    const responseErrors: any[] = []

    const { datas: fileObjects, errors: fileErrors } = await drivesRequest({
      path: requestPath,
      params: {
        select: 'name,size,id,lastModifiedDateTime,folder,file,video,image,parentReference'
      },
      accessToken,
      includeMembers, 
    })

    responseErrors.push(...fileErrors)

    for (const fileObject of fileObjects) {
      if ((fileObject as unknown as OdFolderChildren).file) {
        res.status(200).json({ file: fileObject })
        return
      }
    }
    
    const { datas: folderObjects, values: folderChildren, errors: folderErrors } = await drivesRequest({
      path: `${requestPath}${isRoot ? '' : ':'}/children`,
      params: {
        select: 'name,size,id,lastModifiedDateTime,folder,file,video,image,parentReference',
        $top: siteConfig.maxItems,
        ...(next ? { $skipToken: next } : {}),
        ...(sort ? { $orderby: sort } : {}),
      },
      accessToken,
      includeMembers,
    })
    
    responseErrors.push(...folderErrors)

    for (const folderObject of folderObjects) {
      // Extract next page token from full @odata.nextLink
      if (typeof folderObject['@odata.nextLink'] === 'string') {
        const tokenMatch = folderObject['@odata.nextLink'].match(/&\$skiptoken=(.+)/i)
        if (tokenMatch) {
          pageTokens.push(tokenMatch[1])
        }
      }
    }

    // Merge drive contents
    for (const newChild of folderChildren) {
      const driveId = (newChild as OdDriveItem).parentReference.driveId
      if (siteConfig.drives_members.includes(driveId)) {
        (newChild as OdDriveItem).members = true
      }
      if (newChild.folder) {
        const existingChild = folders.find(({ name }) => name === newChild.name)
        if (existingChild?.folder) {
            // Multiple folders exist at this path, present them as one folder.
            // Important Note: ID property for merged folders will be the first found. This works
            // for now as existing functions don't depend on them being accurate, only unique.

            // Combine child count
            existingChild.folder.childCount += newChild.folder.childCount
            //Combine total sizes
            existingChild.size += newChild.size
            //Use latest modified date
            existingChild.lastModifiedDateTime = new Date(Math.max(
              new Date(existingChild.lastModifiedDateTime).getTime(),
              new Date(newChild.lastModifiedDateTime).getTime()
            )).toISOString().slice(0,-5)+"Z"
            continue
        }
        folders.push(newChild)
      } else {
        files.push(newChild)
      }
    }
    // Batch request thumbnail urls for children that are not folders
    const thumbnailUrls = await thumbnailsRequest(files, accessToken)
    for (let i = 0; i < thumbnailUrls.length; i++) {
      files[i].thumbnailUrl = thumbnailUrls[i]
    }

    const parsedChildren: OdFolderChildren[] = [ ... folders, ...files ]
    if (parsedChildren.length) {
      parsedChildren.sort((a, b) => a.name.localeCompare(b.name))
      if (pageTokens.length) {
        res.status(200).json({ folder: { value: parsedChildren }, next: pageTokens[0] })
        return
      }
      res.status(200).json({ folder: { value: parsedChildren } })
      return
    } else if (responseErrors.length) {
      res.status(responseErrors[0].code).json({ error: responseErrors[0].message })
      return
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error.' })
    return
  }
  res.status(200).json({ folder: { value: [] } })
  return
}
