import axios from "axios"
import { graphApi } from "../../config/api.config"
import { OdDriveItem, OdFileObject, OdThumbnail } from "../types"
import { drives_members, drives_public } from "../../config/site.config"

const batchRequest = async (requests, accessToken) => {
  const responses: any[] = []
  while (requests.length) {
    //The JSON Batching endpoint accepts a maximum of 20 requests at once
    const requestsBatch = requests.splice(0, 20)
    const { data: { responses: responsesBatch } } = await axios.post(`${graphApi}/$batch`, { requests: requestsBatch }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })
    // Reponses may be ordered differently to their requests
    responsesBatch.sort((a, b) => parseInt(a.id) - parseInt(b.id))
    // Handle paged responses
    for (let i = 0; i < responsesBatch.length; i++) {
      let nextLink = responsesBatch[i]["@odata.nextLink"]
      while (nextLink) {
        const { data: { responses: responsesPage } } = await axios.get(nextLink, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        responsesBatch.splice(i, 0, ...responsesPage)
        nextLink = responsesBatch[i+1]["@odata.nextLink"]
      }
    }
    // Set response IDs relative to previous batches
    const startIndex = responses.length || 1
    for (const response of responsesBatch) {
      response.id = `${startIndex + parseInt(response.id)}`
    }
    responses.push(...responsesBatch)
  }
  return responses
}

type DrivesResponse = {
  responses: any[]
  datas: any[]
  errors: any[]
  values: any[]
}

export const drivesRequest = async({
  path,
  params = {},
  accessToken,
  includeMembers,
  driveId
}: {
  path: string;
  params: any;
  accessToken: string;
  includeMembers?: boolean;
  driveId?: string;
}): Promise<DrivesResponse> => {
  const drives = [
    ...(driveId ? [ driveId ] : [
      ...(includeMembers ? drives_members : []),
      ...drives_public
    ]),
  ]
  const paramsString = Object.keys(params).length ? `?${decodeURIComponent(new URLSearchParams(params).toString())}` : ''
  const requests = drives.map((id, i) => ({
    id: i + 1,
    method: 'GET',
    url: `/drives/${id}${path}${paramsString}`,
  }))
  const responses = await batchRequest(requests, accessToken)

  const driveResponses: DrivesResponse = {
    responses, datas: [], errors: [], values: []
  }
  for (const { status, body: { error, ...body } } of responses) {
    if (error) {
      error.code = status
      driveResponses.errors.push(error)
    } else if (body) {
      if (body.value) {
        for (const value of body.value) {
          driveResponses.values.push(value)
        }
      }
      driveResponses.datas.push(body)
    }
  }
  return driveResponses
}

export const thumbnailsRequest = async (files: OdFileObject[], accessToken: string, size: string = 'large') => {
  const requests = files.map((file, i) => {
    const driveId = (file as unknown as OdDriveItem).parentReference.driveId
    const requestPath = `/drives/${driveId}/items/${file.id}/thumbnails`
    return {
      id: i + 1,
      method: 'GET',
      url: requestPath
    }
  })
  const responses = await batchRequest(requests, accessToken)
  const thumbnailUrls: (string | undefined)[] = []
  for (let i = 0; i < responses.length; i++) {
    let url: string | undefined
    if (responses[i].body?.value?.length) {
      url = (responses[i].body?.value[0] as OdThumbnail)[size].url
    }
    thumbnailUrls.push(url)
  }
  return thumbnailUrls
}