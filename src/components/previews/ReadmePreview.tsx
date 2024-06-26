import { FC, CSSProperties, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import { useTranslation } from 'next-i18next'
import { LightAsync as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs'
import { faYoutube, faTwitch, faTwitter } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import 'katex/dist/katex.min.css'

import useFileContent from '../../utils/fetchOnMount'
import FourOhFour from '../FourOhFour'
import { LoadingIcon } from '../Loading'
import { OdDriveItem, OdFolderChildren } from '../../types'
import { GetPlatformFromID, PlatformIcon } from '../PlatformIcon'
import { ChildIcon } from '../FileListing'

function PreviewContainer({ children }): JSX.Element {
  return <div className="mt-4 rounded bg-white p-3 shadow-sm dark:bg-gray-900 dark:text-white">{children}</div>
}

const MarkdownPreview: FC<{
  file: any
  path: string
}> = ({ file, path }) => {
  // The parent folder of the markdown file, which is also the relative image folder
  const parentPath = path

  const { response: content, error, validating } = useFileContent(file["@microsoft.graph.downloadUrl"], path)
  const { t } = useTranslation()

  // Check if the image is relative path instead of a absolute url
  const isUrlAbsolute = (url: string | string[]) => url.indexOf('://') > 0 || url.indexOf('//') === 0
  // Custom renderer:
  const customRenderer = {
    // img: to render images in markdown with relative file paths
    img: ({
      alt,
      src,
      title,
      width,
      height,
      style,
    }: {
      alt?: string
      src?: string
      title?: string
      width?: string | number
      height?: string | number
      style?: CSSProperties
    }) => {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={alt}
          src={isUrlAbsolute(src as string) ? src : `/api/?path=${parentPath}/${src}&raw=true`}
          title={title}
          width={width}
          height={height}
          style={style}
        />
      )
    },
    // code: to render code blocks with react-syntax-highlighter
    code({
      className,
      children,
      inline,
      ...props
    }: {
      className?: string | undefined
      children: ReactNode
      inline?: boolean
    }) {
      if (inline) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        )
      }

      const match = /language-(\w+)/.exec(className || '')
      return (
        <SyntaxHighlighter language={match ? match[1] : 'language-text'} style={tomorrowNight} PreTag="div" {...props}>
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      )
    },
  }

  if (error) {
    return (
      <PreviewContainer>
        <FourOhFour message={error} />
      </PreviewContainer>
    )
  }
  if (validating) {
    return (
      <>
        <PreviewContainer>
          <div className="flex items-center justify-center space-x-1 rounded-t p-3 dark:text-white">
            <LoadingIcon className="mr-3 -ml-1 h-5 w-5 animate-spin" />
            <div>Loading</div>
          </div>
        </PreviewContainer>
      </>
    )
  }

  let contentLines = content.split('\r\n')
  const titleLineRegexp = /### ``\[(?<date>\d{8})\] (?<title>.+) \[(?<channel>.+)\] \((?<videoId>[^\)]+)\)``/
  const { date, title, channel, videoId } = contentLines[0].match(titleLineRegexp)?.groups || {}
  let dateStr, platform;
  if (date) {
    dateStr = [date.slice(0,4), date.slice(4,6), date.slice(6,8)].join('/')
  }
  if (videoId) {
    platform = GetPlatformFromID({ videoId })
  }
  const unPadChars = ['「', '【', '『', '［', '（', '〈', '〔', '《', '〘', '〚']
  if (title) {
    const unPad = unPadChars.includes(title[0])
    return (
      <PreviewContainer>
        <div className="markdown-body">
          <div className={`font-bold mb-1 ${ unPad ? '!-ml-2' : '' } text-xl`}>{title}</div>
          <div className="mb-1 flex gap-1">{
            platform !== undefined && ChildIcon({ child: ({
              ...file,
              name: decodeURIComponent(path)
            } as unknown as OdDriveItem) as unknown as OdFolderChildren })
          } <span className="font-bold">{channel}</span></div>
          <div className="font-bold mb-4 text-xs opacity-10">{dateStr}</div>
          {/* Using rehypeRaw to render HTML inside Markdown is potentially dangerous, use under safe environments. (#18) */}
          <ReactMarkdown
            // @ts-ignore
            remarkPlugins={[remarkGfm, remarkMath]}
            // The type error is introduced by caniuse-lite upgrade.
            // Since type errors occur often in remark toolchain and the use is so common,
            // ignoring it shoudld be safe enough.
            // @ts-ignore
            rehypePlugins={[rehypeKatex, rehypeRaw]}
            components={customRenderer}
          >
            {
              contentLines.slice(1).join('\r\n')
                .replace(/\[[^\]]+\] \([^)]+\)`+\r/, '')
                .replace(/<https:\/\/[^>]+>/, '')
                .replace(/@[^#]+#\d+/, '')
            }
          </ReactMarkdown>
        </div>
      </PreviewContainer>
    )
  } else return (
    <div>
      <PreviewContainer>
        <div className="markdown-body">
          {/* Using rehypeRaw to render HTML inside Markdown is potentially dangerous, use under safe environments. (#18) */}
          <ReactMarkdown
            // @ts-ignore
            remarkPlugins={[remarkGfm, remarkMath]}
            // The type error is introduced by caniuse-lite upgrade.
            // Since type errors occur often in remark toolchain and the use is so common,
            // ignoring it shoudld be safe enough.
            // @ts-ignore
            rehypePlugins={[rehypeKatex, rehypeRaw]}
            components={customRenderer}
          >
            {
              content
                .replace(/### `+\[20\d{6}\] /, '### ')
                .replace(/\[[^\]]+\] \([^)]+\)`+\r/, '')
                .replace(/<https:\/\/[^>]+>/, '')
                .replace(/@[^#]+#\d+/, '')
            }
          </ReactMarkdown>
        </div>
      </PreviewContainer>
    </div>
  )
}

export default MarkdownPreview
