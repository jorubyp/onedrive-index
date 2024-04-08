import type { ParsedUrlQuery } from 'querystring'

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useTranslation } from 'next-i18next'
import { ChildName } from './FileListing'

const HomeCrumb = () => {
  const { t } = useTranslation()

  return (
    <Link href="/" className="flex items-center">
      <FontAwesomeIcon className="h-3 w-3" icon={['fas', 'house']} />
      <span className="ml-2 font-medium">{t('Home')}</span>
    </Link>
  )
}

const Breadcrumb: React.FC<{ query?: ParsedUrlQuery }> = ({ query }) => {
  if (query) {
    const { path } = query
    if (Array.isArray(path)) {
      // We are rendering the path in reverse, so that the browser automatically scrolls to the end of the breadcrumb
      // https://stackoverflow.com/questions/18614301/keep-overflow-div-scrolled-to-bottom-unless-user-scrolls-up/18614561
      return (
        <ol className="no-scrollbar inline-flex flex-row-reverse items-center gap-1 overflow-x-scroll text-sm text-gray-600 dark:text-gray-300 md:gap-3">
          {path
            .slice(0)
            .reverse()
            .map((p: string, i: number) => {
              return (
                <li key={i} className={`${i == 0 ? '' : 'md:flex-shrink-0 min-w-[50px] '}truncate md:min-w-0`}>
                  {path.length - 1 !== i && <FontAwesomeIcon className="h-3 w-3 mr-1 md:mr-3 " icon="angle-right" />}
                  <Link
                    href={`/${path
                      .slice(0, path.length - i)
                      .map(p => encodeURIComponent(p))
                      .join('/')}`}
                    passHref
                    className={`transition-all duration-75 hover:opacity-70 ${
                      i == 0 && 'pointer-events-none opacity-80'
                    }`}
                  >
                    <ChildName name={p} breadcrumb={true}/>
                  </Link>
                </li>
              )
            })}
        </ol>
      )
    }
  }

  return (<></>)
}

export default Breadcrumb
