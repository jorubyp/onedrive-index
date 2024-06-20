import useSWRInfinite from 'swr/infinite'

import type { OdAPIResponse } from '../types'

import { getIncludeMembers } from './protectedRouteHandler'

// Common axios fetch function for use with useSWR
export async function fetcher(url: string): Promise<any> {
  try {
    const res = await fetch(url)
    const data = await res.json()
    return { status: res.status, ...data }
  } catch (err: any) {
    throw { status: err.response.status, error: err.response.data }
  }
}
/**
 * Paging with useSWRInfinite + protected token support
 * @param path Current query directory path
 * @returns useSWRInfinite API
 */
export function useProtectedSWRWatch(videoId: string = '') {
  const includeMembers = getIncludeMembers()
  
  // Disable auto-revalidate, these options are equivalent to useSWRImmutable
  // https://swr.vercel.app/docs/revalidation#disable-automatic-revalidations
  const revalidationOptions = {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  }
  return useSWRInfinite(() => `/api/watch?videoId=${videoId}&members=${JSON.stringify(includeMembers)}`, fetcher, revalidationOptions)
}


/**
 * Paging with useSWRInfinite + protected token support
 * @param path Current query directory path
 * @returns useSWRInfinite API
 */
export function useProtectedSWRInfinite(path: string = '') {
  const includeMembers = getIncludeMembers()

  /**
   * Next page infinite loading for useSWR
   * @param pageIdx The index of this paging collection
   * @param prevPageData Previous page information
   * @param path Directory path
   * @returns API to the next page
   */
  function getNextKey(pageIndex: number, previousPageData: OdAPIResponse): string | null {
    // Reached the end of the collection
    if (previousPageData && !previousPageData.folder) return null

    // First page with no prevPageData
    if (pageIndex === 0) return `/api/?path=${path}&members=${JSON.stringify(includeMembers)}`

    // Add nextPage token to API endpoint
    return `/api/?path=${path}&members=${JSON.stringify(includeMembers)}&next=${previousPageData.next}`
  }

  // Disable auto-revalidate, these options are equivalent to useSWRImmutable
  // https://swr.vercel.app/docs/revalidation#disable-automatic-revalidations
  const revalidationOptions = {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  }
  return useSWRInfinite(getNextKey, fetcher, revalidationOptions)
}
