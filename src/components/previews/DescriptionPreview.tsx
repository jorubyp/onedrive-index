import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import useFileContent from '../../utils/fetchOnMount'
import React from 'react'
import { OdDriveItem } from '../../types'

function PreviewContainer({ children }): JSX.Element {
  return <div className="mt-4 rounded bg-white p-3 shadow-sm dark:bg-gray-900 dark:text-white">{children}</div>
}

const DescriptionPreview = ({ file, path }) => {
  const { asPath } = useRouter()

const { response: content, error, validating } = useFileContent(file["@microsoft.graph.downloadUrl"], asPath)
  if (error || validating || !content) {
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

  if (formattedContent.length < 1) return (<></>)

  return (
    <PreviewContainer>
      <span className="whitespace-pre-wrap break-words p-0">{formattedContent}</span>
    </PreviewContainer>
  )
}

export default DescriptionPreview
