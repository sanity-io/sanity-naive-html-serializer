import {PortableTextComponents} from '@portabletext/to-html'
import {ArbitraryTypedObject} from '@portabletext/types'
import {PortableTextSpan, PortableTextTextBlock, Schema} from 'sanity'
import {BaseDocumentSerializer} from '..'

type ObjectSerializerMethod = ({value}: {value: ArbitraryTypedObject}) => string
type MarkSerializerMethod = ({
  value,
  markType,
  children,
}: {
  value: ArbitraryTypedObject
  markType: string
  children: any[]
}) => string

const validateInlineContent = (
  obj: ArbitraryTypedObject | PortableTextSpan,
  serializers: PortableTextComponents,
  stopTypes: string[]
) =>
  //don't serialize blocks or spans
  obj._type !== 'block' &&
  obj._type !== 'span' &&
  //don't serialize any types that have been explicitly marked as stop types
  !stopTypes.includes(obj._type) &&
  //don't override custom serialization methods from the user
  !serializers.types?.[obj._type]

export const createInlineSerializerTypes = (
  block: PortableTextTextBlock,
  stopTypes: string[],
  serializers: PortableTextComponents,
  schemas: Schema
): PortableTextComponents => {
  const inlineObjects = block.children.filter((child) =>
    validateInlineContent(child, serializers, stopTypes)
  )
  const types: string[] = Array.from(new Set(inlineObjects.map((obj) => obj._type)))
  const serializerFunc: ObjectSerializerMethod = ({value}: {value: ArbitraryTypedObject}) => {
    const wrapperStart = [
      `<span class="default-serialized-object"`,
      `id="${value._key ?? value._id}"`,
      `data-type="${value._type}">`,
    ].join(' ')
    const serializedData = BaseDocumentSerializer(schemas).serializeObject(
      value,
      stopTypes,
      serializers
    )
    const wrapperEnd = `</span>`
    return [wrapperStart, serializedData, wrapperEnd].join('')
  }
  return types.reduce<Record<string, ObjectSerializerMethod>>((acc, type) => {
    acc[type as string] = serializerFunc
    return acc
  }, {})
}

export const createMarkSerializerTypes = (
  block: PortableTextTextBlock,
  stopTypes: string[],
  serializers: PortableTextComponents,
  schemas: Schema
): PortableTextComponents => {
  const marks = block.markDefs?.filter((mark) =>
    validateInlineContent(mark, serializers, stopTypes)
  )
  const markTypes = Array.from(new Set(marks?.map((mark) => mark._type)))
  const serializerFunc = ({
    value,
    markType,
    children,
  }: {
    value: ArbitraryTypedObject
    markType: string
    children: any[]
  }) => {
    const wrapperStart = [
      `<span class="default-serialized-annotation"`,
      `id="${value._key ?? value._id}"`,
      `data-type="${markType}">`,
    ].join(' ')
    const serializedChildren = `<span class="default-serialized-children">${children}</span>`
    const serializedData = BaseDocumentSerializer(schemas).serializeObject(
      value,
      stopTypes,
      serializers
    )
    const wrapperEnd = `</span>`
    return [wrapperStart, serializedChildren, serializedData, wrapperEnd].join('')
  }
  return markTypes.reduce<Record<string, MarkSerializerMethod>>((acc, type) => {
    acc[type as string] = serializerFunc
    return acc
  }, {})
}
