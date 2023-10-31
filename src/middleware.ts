import { NextRequest, NextResponse } from 'next/server'
import { OdSearchResult } from './types'

const searchDriveItem = async (url: URL, q: string) => {
  const data = await (await fetch(`${url.origin}/api/search/?q=${q}`)).json() as OdSearchResult
  const results = data.filter(item => item.folder && item.name.includes(`(${q})`))
  const folder = results.length > 0 ? results[0] : undefined
  if (folder) {
    const result = (await (await fetch(`${url.origin}/api/item/?id=${folder.id}`)).json()) as OdSearchResult
    return `${result["parentReference"].path.replace(/^\/drive\/root:/,'')}/${encodeURIComponent(result["name"])}`
      .split('/').map(p => encodeURIComponent(decodeURIComponent(p))).join('/')
  }
  return
}

export async function middleware(request: NextRequest) {
  const url = new URL(request.url)
  const paths = url.pathname.split('/').filter(s => s !== "")
  if (paths.length > 1) return NextResponse.next()
  const longPath = await searchDriveItem(url, paths[0])
  if (!longPath)  return NextResponse.next()

  url.pathname = longPath
  
  return NextResponse.redirect(url);
}
