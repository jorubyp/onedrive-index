import { NextRequest, NextResponse } from 'next/server'
import { getLongPath } from "./utils/shortPathStore"

export async function middleware(request: NextRequest) {
  const url = new URL(request.url)

  const shortPathRegexp = /^\/(?<shortPath>[\w-]{11}|[\w-]{28})\/?$/
  const { shortPath } = url.pathname.match(shortPathRegexp)?.groups || {}
  if (!shortPath) return NextResponse.next()

  const longPath = await getLongPath(shortPath)
  if (!longPath) return NextResponse.next()

  url.pathname = `/${longPath}`
  
  return NextResponse.redirect(url);
}
