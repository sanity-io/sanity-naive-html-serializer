import { SanityDocument } from '@sanity/types'
import { BaseDocumentDeserializer } from '../dist'
import { BaseDocumentSerializer } from '../src/BaseDocumentSerializer'
import {
  defaultStopTypes,
  customSerializers,
  customDeserializers,
  customBlockDeserializers,
} from '../src/BaseSerializationConfig'

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
