import { SanityDocument } from '@sanity/types'
import { BaseDocumentSerializer, BaseDocumentDeserializer } from '../src'
import {
  defaultStopTypes,
  customSerializers,
  customDeserializers,
  customBlockDeserializers,
} from '../src/BaseSerializationConfig'
import { h } from '@sanity/block-content-to-html'
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

type SerializerProps = {
  node: Record<string, any>
}

export const createCustomInnerHTML = (title: string) =>
  `Custom serializer works and includes title: '${title}'`

const additionalSerializerTypes = {
  objectField: (props: SerializerProps) => {
    const innerText = createCustomInnerHTML(props.node.title)
    return h(
      'div',
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

export const addedCustomerSerializers = tempSerializers
