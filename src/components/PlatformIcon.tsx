import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faYoutube, faTwitch, faTwitter } from '@fortawesome/free-brands-svg-icons'
import { faVideoCamera } from '@fortawesome/free-solid-svg-icons'
import { FC } from 'react'

export enum Platform {
  youtube,
  twitch,
  twitter
}

export const GetPlatformFromID = ({ videoId }): Platform | undefined => {
  if (videoId.match(/^[＊*]?[1-9v]\d{8,10}$/)) {
    return Platform.twitch
  } else if (videoId.match(/^[＊*]?[\w-]{11}$/)) {
    return Platform.youtube
  } else if (videoId.match(/^[＊*]?1[a-zA-Z]{12}$/)) {
    return Platform.twitter
  }
}

export const PlatformIcon: FC<{ platform: Platform | undefined}> = ({ platform }) => {
  switch(platform) {
    case Platform.youtube:
      return (<FontAwesomeIcon icon={faYoutube}/>)
    case Platform.twitch:
      return (<FontAwesomeIcon icon={faTwitch}/>)
    case Platform.twitter:
      return (<FontAwesomeIcon icon={faTwitter}/>)
    default:
      return (<FontAwesomeIcon icon={faVideoCamera}/>)
  }
}