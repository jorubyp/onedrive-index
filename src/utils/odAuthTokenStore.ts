import Redis from 'ioredis'
import siteConfig from '../../config/site.config'

// Persistent key-value store is provided by Redis, hosted on Upstash
// https://vercel.com/integrations/upstash
const kv = new Redis(process.env.REDIS_URL || '')
const kv_overflow = new Redis(process.env.REDIS_URL_OVERFLOW || '')

export async function getOdAuthTokens(): Promise<{ accessToken: unknown; refreshToken: unknown }> {
  
  const accessToken = await kv.get(`${siteConfig.kvPrefix}:tokens:access_token`)
    .catch(_ => kv_overflow.get(`${siteConfig.kvPrefix}:tokens:access_token`))
  const refreshToken = await kv.get(`${siteConfig.kvPrefix}:tokens:refresh_token`)
    .catch(_ => kv_overflow.get(`${siteConfig.kvPrefix}:tokens:refresh_token`))

  return {
    accessToken,
    refreshToken,
  }
}

export async function storeOdAuthTokens({
  accessToken,
  accessTokenExpiry,
  refreshToken,
}: {
  accessToken: string
  accessTokenExpiry: number
  refreshToken: string
}): Promise<void> {
  await kv.set(`${siteConfig.kvPrefix}:tokens:access_token`, accessToken, 'EX', accessTokenExpiry)
    .catch(_ => kv_overflow.set(`${siteConfig.kvPrefix}:tokens:access_token`, accessToken, 'EX', accessTokenExpiry))
  await kv.set(`${siteConfig.kvPrefix}:tokens:refresh_token`, refreshToken)
    .catch(_ => kv_overflow.set(`${siteConfig.kvPrefix}:tokens:refresh_token`, refreshToken))
}
