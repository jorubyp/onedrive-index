import { NextRequest, NextResponse } from 'next/server'
import siteConfig from '../config/site.config'

const dec = decodeURIComponent

function webUrlToRelativePath(path: string): string {
  return path.split('onmicrosoft_com/Documents')[1]
    .split('/')
    .map(p => encodeURIComponent(dec(dec(p))))
    .join('/')
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
  return await fetch(`${url.origin}/api/search/?q=${encodeURIComponent(q)}`)
    .then(response => response.json().then(data => {
      const folder = data.find(item => item.folder && item.name.includes(`(${q})`))
      if (folder) {
        const longPath = webUrlToRelativePath(folder["webUrl"])
        return longPath
      }
    }
  )).catch(() => {})
}

const oldLocales = ['de-DE', 'es', 'zh-CN', 'hi', 'id', 'tr-TR', 'zh-TW']

export async function middleware(request: NextRequest) {
  const url = new URL(request.url)
  const paths = url.pathname.split('/').filter(s => s)
  if (oldLocales.includes(paths[0])) {
    url.pathname = paths.slice(1).join('/')
    return NextResponse.redirect(url)
  }
  if (paths.length === 1 && paths[0] == 'watch' && url.searchParams.get('v') !== null) {
    const longPath = await getLongPath(url, sanitiseQuery(url.searchParams.get('v') || ''))
    if (!longPath) return NextResponse.redirect(url.origin);
    const newUrl = new URL(url.origin)
    newUrl.pathname = longPath
    return NextResponse.rewrite(newUrl);
  } else {
    return NextResponse.next()
  }
}
