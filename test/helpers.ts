import { SanityDocument } from '@sanity/types'
import { BaseDocumentSerializer, BaseDocumentDeserializer } from '../src'
import {
  defaultStopTypes,
  customSerializers,
  customDeserializers,
  customBlockDeserializers,
} from '../src/BaseSerializationConfig'
import { h } from '@sanity/block-content-to-html'
import { Block } from '@sanity/types'
import clone from 'just-clone'

export const getSerialized = (document: SanityDocument, level: string) => {
  const serializer = BaseDocumentSerializer
  return serializer.serializeDocument(
    document,
    level,
    'en',
    defaultStopTypes,
    customSerializers
  )
}

export const getDeserialized = (document: SanityDocument, level: string) => {
  const serialized = getSerialized(document, level)
  return BaseDocumentDeserializer.deserializeDocument(
    serialized.content,
    customDeserializers,
    customBlockDeserializers
  )
}

export const getValidFields = (field: Record<string, any>) => {
  const invalidFields = ['_type', '_key']
  return Object.keys(field).filter(key => !invalidFields.includes(key))
}

export const toPlainText = (blocks: Block[]) => {
  return blocks
    .map(block => {
      if (block._type !== 'block' || !block.children) {
        return ''
      }
      return block.children.map(child => child.text).join('')
    })
    .join('\n\n')
}

type SerializerProps = {
  node: Record<string, any>
}

type AnnotationProps = {
  children: Record<string, any>[]
  _type: string
  _key: string
  mark: Record<string, any>
}

export const createCustomInnerHTML = (title: string) =>
  `Custom serializer works and includes title: '${title}'`

const additionalSerializerTypes = {
  //block and top-level tests
  objectField: (props: SerializerProps) => {
    const innerText = createCustomInnerHTML(props.node.title)
    return h(
      'div',
      { className: props.node._type, id: props.node._key },
      innerText
    )
  },
  //inline-level tests
  childObjectField: (props: SerializerProps) => {
    const innerText = createCustomInnerHTML(props.node.title)
    return h(
      'span',
      { className: props.node._type, id: props.node._key },
      innerText
    )
  },
}

const tempSerializers = clone(customSerializers)
tempSerializers.types = {
  ...tempSerializers.types,
  ...additionalSerializerTypes,
}
tempSerializers.marks = {
  annotation: (props: AnnotationProps) => {
    return h(
      'span',
      {
        className: props.mark._type,
        id: props._key,
        'mark-key': props.mark._key,
      },
      props.children
    )
  },
}

export const addedCustomSerializers = tempSerializers
