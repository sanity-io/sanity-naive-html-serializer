import {ArbitraryTypedObject} from '@portabletext/types'
import {PortableTextTextBlock} from 'sanity'

export const isPortableTextBlock = (el: ArbitraryTypedObject): el is PortableTextTextBlock => {
  return el._type === 'block'
}
