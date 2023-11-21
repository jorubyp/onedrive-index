import { NextRequest, NextResponse } from 'next/server'
import siteConfig from '../config/site.config'
import { OdSearchResult } from './types'

function mapAbsolutePath(path: string): string {
  // path is in the format of '/drive/root:/path/to/file', if baseDirectory is '/' then we split on 'root:',
  // otherwise we split on the user defined 'baseDirectory'
  const absolutePath = path.split(siteConfig.baseDirectory === '/' ? 'root:' : siteConfig.baseDirectory)
  // path returned by the API may contain #, by doing a decodeURIComponent and then encodeURIComponent we can
  // replace URL sensitive characters such as the # with %23
  return absolutePath.length > 1 // solve https://github.com/spencerwooo/onedrive-vercel-index/issues/539
    ? absolutePath[1]
        .split('/')
        .map(p => encodeURIComponent(decodeURIComponent(p)))
        .join('/')
    : ''
}

function sanitiseQuery(query: string): string {
  const sanitisedQuery = decodeURIComponent(query)
    .replace(/'/g, "''")
    .replace('<', ' &lt; ')
    .replace('>', ' &gt; ')
    .replace('?', ' ')
    .replace('/', ' ')
  return sanitisedQuery
}

const getLongPath = async (url: URL, q: string) => {
  const data = await (await fetch(`${url.origin}/api/search/?q=${encodeURIComponent(q)}`)).json() as OdSearchResult
  const folder = data.find(item => item.folder && item.name.includes(`(${q})`))
  if (folder) {
    const result = await (await fetch(`${url.origin}/api/item/?id=${folder.id}`)).json() as OdSearchResult
    return `${mapAbsolutePath(result["parentReference"].path)}/${encodeURIComponent(result["name"])}`
  }
  return
}

const excluded = [
  'api',
  'image',
  'icons',
  'favicon.ico',
  '_next'
]

const oldLocales = ['de-DE', 'es', 'zh-CN', 'hi', 'id', 'tr-TR', 'zh-TW']

export async function middleware(request: NextRequest) {
  const url = new URL(request.url)
  const paths = url.pathname.split('/').filter(s => s !== "")
  if (oldLocales.includes(paths[0])) {
    url.pathname = paths.slice(1).join('/')
    return NextResponse.redirect(url)
  }
  if (paths.length > 1 || excluded.includes(paths[0])) return NextResponse.next()
  const longPath = await getLongPath(url, sanitiseQuery(paths[0]))
  if (!longPath) return NextResponse.next()

  url.pathname = longPath
  
  return NextResponse.redirect(url);
}
