//import Redis from 'ioredis'
import siteConfig from '../../config/site.config'

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
});

interface UrlInfo {
  longPath: string;
  shortPath: string;
  createdAt: Date;
}

function getShort(length: number): string {
  const alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890-_".split("");
  return [...new Array(length)]
    .map((_) => alpha[Math.floor(Math.random() * alpha.length)])
    .join("");
}

async function getPaths(): Promise<{ [key: string]: UrlInfo }> {
  let links: { [key: string]: UrlInfo } = await kv.hgetall(`${siteConfig.kvPrefix}:links`) || {}
  return links
}

export async function setShortPath(longPath: string) {
  const decodedPath = decodeURI(longPath)
  const links = await getPaths()

  // Try to make a link using a YouTube video ID if possible
  const videoIdRegexp = /.+ \[.+\] \((?<videoId>[\w-]{11})\)$/
  const { videoId } = decodedPath.match(videoIdRegexp)?.groups || {}
  if (videoId) {
    //const hasIdLink = Object.keys(links).includes(videoId)
    //if (!hasIdLink) {
      const urlInfo: UrlInfo = {
        longPath: decodedPath,
        shortPath: videoId,
        createdAt: new Date(),
      }
      await kv.hmset(`${siteConfig.kvPrefix}:links`, { [videoId]: urlInfo })
    //}
    return videoId
  }

  // Fall back to randomly generated short url
  let shortPath = Object.keys(links).find(key => links[key].longPath === decodedPath)
  if (!shortPath) {
    shortPath = getShort(28)
    const urlInfo: UrlInfo = {
      longPath: decodedPath,
      shortPath,
      createdAt: new Date(),
    }
    await kv.hmset(`${siteConfig.kvPrefix}:links`, { [shortPath]: urlInfo })
  }
  return shortPath
}

export async function getLongPath(shortPath: string): Promise<string | undefined> {
  const link: UrlInfo | null = await kv.hget(`${siteConfig.kvPrefix}:links`, shortPath)
  console.log({link})
  return link ? link.longPath : '/'
}
