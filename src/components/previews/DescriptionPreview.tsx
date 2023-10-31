import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import FourOhFour from '../FourOhFour'
import Loading from '../Loading'
import DownloadButtonGroup from '../DownloadBtnGtoup'
import useFileContent from '../../utils/fetchOnMount'
import { DownloadBtnContainer } from './Containers'
import React from 'react'

function PreviewContainer({ children }): JSX.Element {
  return <div className="mt-4 rounded bg-white p-3 shadow-sm dark:bg-gray-900 dark:text-white">{children}</div>
}

const DescriptionPreview = ({ file }) => {
  const { asPath } = useRouter()
  const { t } = useTranslation()
  const parentPath = asPath

  const { response: content, error, validating } = useFileContent(`/api/raw/?path=${parentPath}/${encodeURIComponent(file.name)}`, asPath)
  console.log(`/api/raw/?path=${parentPath}/${file.name}`)
  if (error || validating || !content) {
    console.log({ error, validating, content })
    return (<></>)
  }

  let contentLines = content.split('\n')
  
  if (contentLines[0].search(/^\[20\d{6}\] /) > - 1) {
    contentLines = contentLines.slice(1)
  }
  if (contentLines[0].startsWith('https://www.youtube.com/watch?v=')) {
    contentLines = contentLines.slice(2)
  }

  const formattedContent = contentLines.join('\n')

  return (
    <div>
      <PreviewContainer>
        <span className="whitespace-pre-wrap p-0">{formattedContent}</span>
      </PreviewContainer>
    </div>
  )
}

export default DescriptionPreview
