import { PortableTextBlockStyle } from '@portabletext/types'

import {
  PortableTextBlockComponent,
  PortableTextListComponent,
  PortableTextListItemComponent,
} from '@portabletext/to-html'

import blockTools from '@sanity/block-tools'
import { blockContentType } from './BaseDocumentDeserializer/helpers'

export const defaultStopTypes = [
  'reference',
  'date',
  'datetime',
  'file',
  'geopoint',
  'image',
  'number',
  'crop',
  'hotspot',
  'boolean',
  'url',
  'color',
]

export const defaultPortableTextBlockStyles: Record<
  PortableTextBlockStyle,
  PortableTextBlockComponent | undefined
> = {
  normal: ({ value, children }) => `<p id="${value._key}">${children}</p>`,
  blockquote: ({ value, children }) =>
    `<blockquote id="${value._key}">${children}</blockquote>`,
  h1: ({ value, children }) => `<h1 id="${value._key}">${children}</h1>`,
  h2: ({ value, children }) => `<h2 id="${value._key}">${children}</h2>`,
  h3: ({ value, children }) => `<h3 id="${value._key}">${children}</h3>`,
  h4: ({ value, children }) => `<h4 id="${value._key}">${children}</h4>`,
  h5: ({ value, children }) => `<h5 id="${value._key}">${children}</h5>`,
  h6: ({ value, children }) => `<h6 id="${value._key}">${children}</h6>`,
}

const defaultLists: Record<'number' | 'bullet', PortableTextListComponent> = {
  number: ({ value, children }) =>
    `<ol id="${value._key.replace('-parent', '')}">${children}</ol>`,
  bullet: ({ value, children }) =>
    `<ul id="${value._key.replace('-parent', '')}">${children}</ul>`,
}

const defaultListItem: PortableTextListItemComponent = ({ value, children }) =>
  `<li id="${(value._key || '').replace('-parent', '')}">${children}</li>`

const unknownBlockFunc: PortableTextBlockComponent = ({ value, children }) =>
  `<p id="${value._key}" data-type="unknown-block-style" data-style="${value.style}">${children}</p>`

export const customSerializers: Record<string, any> = {
  unknownType: ({ value }: { value: Record<string, any> }) =>
    `<div class="${value._type}"></div>`,
  types: {},
  block: defaultPortableTextBlockStyles,
  list: defaultLists,
  listItem: defaultListItem,
  unknownBlockStyle: unknownBlockFunc,
}

export const customDeserializers: Record<string, any> = { types: {} }

export const customBlockDeserializers: Array<any> = [
  //handle undeclared styles
  {
    deserialize(el: HTMLParagraphElement) {
      if (!el.hasChildNodes()) {
        return undefined
      }

      if (
        !el.hasAttribute('data-type') ||
        el.getAttribute('data-type') !== 'unknown-block-style'
      ) {
        return undefined
      }

      const style = el.getAttribute('data-style')
      const block = blockTools.htmlToBlocks(el.outerHTML, blockContentType)[0]

      return {
        ...block,
        style,
      }
    },
  },
]
