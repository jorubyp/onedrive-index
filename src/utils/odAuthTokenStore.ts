import Redis from 'ioredis'
import siteConfig from '../../config/site.config'

// Persistent key-value store is provided by Redis, hosted on Upstash
// https://vercel.com/integrations/upstash
const kv = new Redis(process.env.REDIS_URL || '')
//const kv_overflow = new Redis(process.env.REDIS_URL_OVERFLOW || '')
  
const accessTokenKey = `${siteConfig.kvPrefix}:tokens:access_token`
const refreshTokenKey = `${siteConfig.kvPrefix}:tokens:refresh_token`

export async function getOdAuthTokens(): Promise<{ accessToken: unknown; refreshToken: unknown }> {

  const accessToken = await kv.get(accessTokenKey)
  // Return redis storage access token if it is present
  if (typeof accessToken === 'string') {
    return { accessToken, refreshToken: null }
  }

  return {
    accessToken: null,
    refreshToken: await kv.get(refreshTokenKey),
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
    //.catch(_ => kv_overflow.set(`${siteConfig.kvPrefix}:tokens:access_token`, accessToken, 'EX', accessTokenExpiry))
  await kv.set(`${siteConfig.kvPrefix}:tokens:refresh_token`, refreshToken)
    //.catch(_ => kv_overflow.set(`${siteConfig.kvPrefix}:tokens:refresh_token`, refreshToken))
}
