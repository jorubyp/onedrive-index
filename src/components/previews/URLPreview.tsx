import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import FourOhFour from '../FourOhFour'
import Loading from '../Loading'
import useFileContent from '../../utils/fetchOnMount'
import { PreviewContainer } from './Containers'
import { OdDriveItem } from '../../types'

const parseDotUrl = (content: string): string | undefined => {
  return content
    .split('\n')
    .find(line => line.startsWith('URL='))
    ?.split('=')[1]
}

const TextPreview = ({ file }) => {
  const { asPath } = useRouter()
  const { t } = useTranslation()
  const driveId = (file as unknown as OdDriveItem).parentReference.driveId

  const { response: content, error, validating } = useFileContent(`/api/raw/?path=${asPath}&driveId=${driveId}`, asPath)
  if (error) {
    return (
      <PreviewContainer>
        <FourOhFour message={error} />
      </PreviewContainer>
    )
  }

  if (validating) {
    return (
      <PreviewContainer>
        <Loading loadingText={t('Loading file content...')} />
      </PreviewContainer>
    )
  }

  if (!content) {
    return (
      <PreviewContainer>
        <FourOhFour message={t('File is empty.')} />
      </PreviewContainer>
    )
  }
  
  return (
    <PreviewContainer>
      <pre className="overflow-x-scroll p-0 text-sm md:p-3">{content}</pre>
    </PreviewContainer>
  )
}

export default TextPreview
