import type { OdFileObject } from '../../types'

import { FC } from 'react'

import { PreviewContainer } from './Containers'

const ImagePreview: FC<{ file: OdFileObject }> = ({ file }) => {

  return (
      <PreviewContainer>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="mx-auto"
          src={file["@microsoft.graph.downloadUrl"]}
          alt={file.name}
          width={file.image?.width}
          height={file.image?.height}
        />
      </PreviewContainer>
  )
}

export default ImagePreview
