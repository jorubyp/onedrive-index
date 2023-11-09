import type { OdFolderChildren } from '../types'

import Link from 'next/link'
import { FC } from 'react'

import { ChildIcon, ChildName } from './FileListing'

const FileListItem: FC<{ fileContent: OdFolderChildren }> = ({ fileContent: c }) => {
  return (
    <div className="grid cursor-pointer items-center space-x-2 px-3 py-2.5">
      <div className="flex items-center space-x-2 truncate" title={c.name}>
        <div className="w-5 flex-shrink-0 text-center">
          <ChildIcon child={c} />
        </div>
        <ChildName name={c.name} folder={Boolean(c.folder)} />
      </div>
    </div>
  )
}

const FolderListLayout = ({
  path,
  folderChildren,
  videoList
}) => (
  <div className="rounded bg-white shadow-sm dark:bg-gray-900 dark:text-gray-100">
    {folderChildren.map((c: OdFolderChildren, i) => (
      <div
        className={`transition-all duration-100 hover:bg-gray-100 dark:hover:bg-gray-850${videoList && i === 0 ? ' animate-new-flash rounded-t' : ''}`}
        key={c.id}
      >
        <Link
          href={`${path === '/' ? '' : path}/${encodeURIComponent(c.name)}`}
          passHref
        >
          <FileListItem fileContent={c} />
        </Link>
      </div>
    ))}
  </div>
)

export default FolderListLayout
