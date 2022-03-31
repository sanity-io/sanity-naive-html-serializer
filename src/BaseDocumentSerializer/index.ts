import blocksToHtml, { h } from '@sanity/block-content-to-html'
import { defaultStopTypes, customSerializers } from '../BaseSerializationConfig'
import { SanityDocument } from '@sanity/types'
import { Serializer, TranslationLevel } from '../types'
import Schema from '@sanity/schema'
import clone from 'just-clone'
import { fieldFilter, languageObjectFieldFilter } from './fieldFilters'

type SerializerClosure = (schemes: Schema) => Serializer
const META_FIELDS = ['_key', '_type', '_id']

export const BaseDocumentSerializer: SerializerClosure = (schemas: Schema) => {
  /*
   * Helper function that allows us to get metadata (like `localize: false`) from schema fields.
   */
  const getSchema = (name: string) =>
    schemas._original.types.find(s => s.name === name) as any

  /*
   * Main parent function: finds fields to translate, and feeds them to appropriate child serialization
   * methods.
   */
  const serializeDocument = (
    doc: SanityDocument,
    translationLevel: TranslationLevel = 'document',
    baseLang = 'en',
    stopTypes = defaultStopTypes,
    serializers = customSerializers
  ) => {
    let filteredObj: Record<string, any> = {}

    //field level translations explicitly send over any fields that
    //match the base language, regardless of depth
    if (translationLevel === 'field') {
      filteredObj = languageObjectFieldFilter(doc, baseLang)
    }
    //otherwise, we can refer to the schema and a list of stop types
    //to determine what should not be sent
    else {
      filteredObj = fieldFilter(doc, getSchema(doc._type).fields, stopTypes)
    }

    const serializedFields: Record<string, any> = {}

    for (let key in filteredObj) {
      const value: Record<string, any> | Array<any> | string = filteredObj[key]

      if (typeof value === 'string') {
        serializedFields[key] = value
      } else if (Array.isArray(value)) {
        serializedFields[key] = serializeArray(
          value,
          key,
          stopTypes,
          serializers
        )
      } else {
        const serialized = serializeObject(value, stopTypes, serializers)
        serializedFields[
          key
        ] = `<div class='${key}' data-level='field'>${serialized}</div>`
      }
    }

    //create a valid HTML file
    const rawHTMLBody = document.createElement('body')
    rawHTMLBody.innerHTML = serializeObject(
      serializedFields,
      stopTypes,
      serializers
    )

    const rawHTMLHead = document.createElement('head')
    const metaFields = ['_id', '_type', '_rev']
    //save our metadata as meta tags so we can use them later on
    metaFields.forEach(field => {
      const metaEl = document.createElement('meta')
      metaEl.setAttribute('name', field)
      metaEl.setAttribute('content', doc[field] as string)
      rawHTMLHead.appendChild(metaEl)
    })
    //encode version so we can use the correct deserialization methods
    const versionMeta = document.createElement('meta')
    versionMeta.setAttribute('name', 'version')
    versionMeta.setAttribute('content', '2')
    rawHTMLHead.appendChild(versionMeta)

    const rawHTML = document.createElement('html')
    rawHTML.appendChild(rawHTMLHead)
    rawHTML.appendChild(rawHTMLBody)

    return {
      name: doc._id,
      content: rawHTML.outerHTML,
    }
  }

  const serializeArray = (
    fieldContent: Record<string, any>[],
    fieldName: string,
    stopTypes: string[],
    serializers: Record<string, any>
  ) => {
    //filter for any blocks that user has indicated
    //should not be sent for translation
    const validBlocks = fieldContent.filter(
      block => !stopTypes.includes(block._type)
    )

    //take out any fields in these blocks that should
    //not be sent to translation
    const filteredBlocks = validBlocks.map(block => {
      const schema = getSchema(block._type)
      if (schema) {
        return fieldFilter(block, schema.fields, stopTypes)
      } else {
        return block
      }
    })

    const output = filteredBlocks.map((obj, i) => {
      //if object in array is just a string, just return it
      if (typeof obj === 'string') {
        return `<span>${obj}</span>`
      } else {
        //send to serialization method
        return serializeObject(obj, stopTypes, serializers)
      }
    })

    //TODO: encode this with data-level fieldName
    return `<div class="${fieldName}" data-type="array">${output.join(
      ''
    )}</div>`
  }

  const serializeObject = (
    obj: Record<string, any>,
    stopTypes: string[],
    serializers: Record<string, any>
  ) => {
    if (stopTypes.includes(obj._type)) {
      return ''
    }

    //if user has declared a custom serializer, use that
    //instead of this method
    const hasSerializer =
      serializers.types && Object.keys(serializers.types).includes(obj._type)
    if (hasSerializer) {
      return blocksToHtml({ blocks: [obj], serializers: serializers })
    }

    //we modify the serializers to send it to blocksToHTML
    //but we don't want those changes to persist for each block, so we clone
    const tempSerializers = clone(serializers)

    //if it's a custom object, iterate through its keys to find and serialize translatable content
    if (obj._type !== 'span' && obj._type !== 'block') {
      let innerHTML = ''
      //if schema is available, encode values in the order they're declared in the schema,
      //since this will likely be more intuitive for a translator.
      let fieldNames = Object.keys(obj)
      if (getSchema(obj._type)) {
        fieldNames = getSchema(obj._type)
          .fields.map((field: Record<string, any>) => field.name)
          .filter((schemaKey: string) => Object.keys(obj).includes(schemaKey))
      }

      //account for anonymous inline objects
      if (typeof obj === 'object' && !obj._type) {
        obj._type = ''
      }

      fieldNames.forEach(fieldName => {
        let htmlField = ''
        const value = obj[fieldName]

        if (!META_FIELDS.includes(fieldName)) {
          //strings are either string fields or have recursively been turned
          //into HTML because they were a nested object or array
          if (typeof value === 'string') {
            const htmlRegex = /^</
            htmlField = value.match(htmlRegex)
              ? value
              : `<span class="${fieldName}">${value}</span>`
          }

          //array fields get filtered and its children serialized
          else if (Array.isArray(value)) {
            htmlField = serializeArray(value, fieldName, stopTypes, serializers)
          }

          //this is an object in an object, serialize it first
          else {
            const schema = getSchema(value._type)
            let toTranslate = value
            if (schema) {
              toTranslate = fieldFilter(value, schema.fields, stopTypes)
            }
            //anonymous inline objects may not declare type.
            const objHTML = serializeObject(toTranslate, stopTypes, serializers)
            htmlField = `<div class="${fieldName}" data-level="field">${objHTML}</div>`
          }

          innerHTML += htmlField
        }
      })

      if (!innerHTML) {
        return ''
      }

      tempSerializers.types[obj._type] = (props: Record<string, any>) => {
        return h('div', {
          className: props.node._type,
          id: props.node._key ?? props.node._id,
          innerHTML: innerHTML,
        })
      }
    }

    let serializedBlock = ''
    try {
      serializedBlock = blocksToHtml({
        blocks: [obj],
        serializers: tempSerializers,
      })
    } catch (err) {
      console.debug(
        `Had issues serializing block of type "${obj._type}". Please specify a serialization method for this block in your serialization config. Received error: ${err}`
      )
    }
    //this should always be a <div> so this is safe to do. README should warn folks
    //against tds or anything else invalid in custom serialization methods
    const outerNode = document.createElement('div')
    outerNode.innerHTML = serializedBlock
    const node = outerNode.firstElementChild
    node?.setAttribute('data-type', 'object')
    return node?.outerHTML
  }

  return {
    serializeDocument,
    fieldFilter,
    languageObjectFieldFilter,
    serializeArray,
    serializeObject,
  }
}
