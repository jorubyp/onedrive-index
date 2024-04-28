import type { NextApiRequest, NextApiResponse } from 'next'

import { encodePath, getAccessToken } from '.'
import apiConfig from '../../../config/api.config'
import { drivesRequest } from '../../utils/graphApi'

/**
 * Sanitize the search query
 *
 * @param query User search query, which may contain special characters
 * @returns Sanitised query string, which:
 * - encodes the '<' and '>' characters,
 * - replaces '?' and '/' characters with ' ',
 * - replaces ''' with ''''
 * Reference: https://stackoverflow.com/questions/41491222/single-quote-escaping-in-microsoft-graph.
 */
export function sanitiseQuery(query: string): string {
  const sanitisedQuery = query
    .replace(/'/g, "''")
    .replace('<', ' &lt; ')
    .replace('>', ' &gt; ')
    .replace('?', ' ')
    .replace('/', ' ')
  return encodeURIComponent(sanitisedQuery)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get access token from storage
  const accessToken = await getAccessToken()

  // Query parameter from request
  let { q: searchQuery = '', members = 'false' } = req.query

  // Set edge function caching for faster load times, check docs:
  // https://vercel.com/docs/concepts/functions/edge-caching
  res.setHeader('Cache-Control', apiConfig.cacheControlHeader)

  const includeMembers: boolean = JSON.parse(members as string)

  if (typeof searchQuery === 'string') {
    // Construct Microsoft Graph Search API URL, and perform search only under the base directory
    const searchRootPath = encodePath('/')
    const encodedPath = searchRootPath === '' ? searchRootPath : searchRootPath + ':'

    try {
      const searchPath = `/root${encodedPath}/search(q='${sanitiseQuery(searchQuery)}')`
      const { values, errors } = await drivesRequest({
        path: searchPath,
        params: {
          select: 'id,webUrl,name,file,folder,parentReference',
        },
        accessToken,
        includeMembers, 
      })
      
      if (values.length) {
        res.status(200).json(values)
        return
      }
      if (errors.length) {
        res.status(errors[0].code).json({ error: errors[0].message })
        return
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error.' })
      return
    }
  } 
  res.status(200).json([])
  return
}
