import schemas from 'part:@sanity/base/schema'
import blocksToHtml, { h } from '@sanity/block-content-to-html'
import { defaultStopTypes, customSerializers } from './BaseSerializationConfig'
import { ObjectField, SanityDocument } from '@sanity/types'
import { Serializer, TranslationLevel } from './types'
import clone from 'just-clone'

const META_FIELDS = ['_key', '_type', '_id']

/*
 * Helper function that allows us to get metadata (like `localize: false`) from schema fields.
 */
const getSchema = (name: string) =>
  schemas._original.types.find((s: ObjectField) => s.name === name)

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
  //we must take out any fields not relevant to translation
  let filteredObj: Record<string, any> = {}

  //field level translations explicitly send over the base language
  if (translationLevel === 'field') {
    filteredObj = languageObjectFieldFilter(doc, baseLang)
  }
  //otherwise, we have a list of types that should not be sent over.
  else {
    filteredObj = fieldFilter(doc, getSchema(doc._type).fields, stopTypes)
  }

  //ultimately, this should be an object with strings as plain strings but complex objects as HTML divs
  //e.g. {blockText: "<div><p>My text</p></div>"}
  const serializedFields: Record<string, any> = {}

  for (let key in filteredObj) {
    const value: Record<string, any> | Array<any> | string = filteredObj[key]

    if (typeof value === 'string') {
      serializedFields[key] = value
    } else if (Array.isArray(value)) {
      serializedFields[key] = serializeArray(value, key, stopTypes, serializers)
    } else {
      //top-level objects need an additional layer of nesting for custom serialization etc.
      //but we still want the object type to be preserved
      const isFieldLevel = value.hasOwnProperty(baseLang)
      const serialized = serializeObject(
        value,
        isFieldLevel ? key : null,
        stopTypes,
        serializers
      )
      if (!isFieldLevel) {
        //now we add an additional field wrapper so we know both
        //the field and type of this object after deserialization
        serializedFields[key] = `<div class='${key}'>${serialized}</div>`
      } else {
        serializedFields[key] = serialized
      }
    }
  }

  //create a valid HTML file
  const rawHTMLBody = document.createElement('body')
  rawHTMLBody.innerHTML = serializeObject(
    serializedFields,
    doc._type,
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

  const rawHTML = document.createElement('html')
  rawHTML.appendChild(rawHTMLHead)
  rawHTML.appendChild(rawHTMLBody)

  return {
    name: doc._id,
    content: rawHTML.outerHTML,
  }
}

/*
 * Helper. If field-level translation pattern used, only sends over
 * content from the base language. Now works recursively!
 */
const languageObjectFieldFilter = (
  obj: Record<string, any>,
  baseLang: string
) => {
  const filterToLangField = (obj: Record<string, any>) => {
    const filteredObj: Record<string, any> = {}
    filteredObj[baseLang] = obj[baseLang]
    META_FIELDS.forEach(field => {
      if (obj[field]) {
        filteredObj[field] = obj[field]
      }
    })
    return filteredObj
  }

  const findBaseLang = (childObj: Record<string, any>): Record<string, any> => {
    const filteredObj: Record<string, any> = {}
    META_FIELDS.forEach(field => {
      if (childObj[field]) {
        filteredObj[field] = childObj[field]
      }
    })

    for (let key in childObj) {
      const value: any = childObj[key]
      //we've reached a base language field, add it to
      //what we want to send to translation
      if (value.hasOwnProperty(baseLang)) {
        filteredObj[key] = filterToLangField(value)
      }
      //we have an array that may have language fields in its objects
      else if (
        Array.isArray(value) &&
        value.length &&
        typeof value[0] === 'object'
      ) {
        //recursively find and filter for any objects that have the base language
        const validLangObjects = value.reduce((validArr, objInArray) => {
          if (objInArray._type === 'block') {
            validArr.push(objInArray)
          } else if (objInArray.hasOwnProperty(baseLang)) {
            validArr.push(filterToLangField(objInArray))
          } else {
            const filtered = findBaseLang(objInArray)
            if (Object.keys(filtered).length) {
              validArr.push(filtered)
            }
          }
          return validArr
        }, [])
        if (validLangObjects.length) {
          filteredObj[key] = validLangObjects
        }
      }
      //we have an object nested in an object
      //recurse down the tree
      else if (typeof value === 'object') {
        const nestedLangObj = findBaseLang(value)
        if (Object.keys(nestedLangObj).length) {
          filteredObj[key] = nestedLangObj
        }
      }
    }
    return filteredObj
  }

  //send top level object into recursive function
  return findBaseLang(obj)
}

/*
 * Helper. Eliminates stop-types and non-localizable fields.
 */
const fieldFilter = (
  obj: Record<string, any>,
  objFields: ObjectField[],
  stopTypes: string[]
) => {
  const filteredObj: Record<string, any> = {}

  const fieldFilter = (field: Record<string, any>) => {
    if (field.localize === false) {
      return false
    } else if (field.type === 'string' || field.type === 'text') {
      return true
    } else if (Array.isArray(obj[field.name])) {
      return true
    } else if (!stopTypes.includes(field.type)) {
      return true
    }
    return false
  }

  const validFields = [
    ...META_FIELDS,
    ...objFields.filter(fieldFilter).map(field => field.name),
  ]
  validFields.forEach(field => {
    if (obj[field]) {
      filteredObj[field] = obj[field]
    }
  })
  return filteredObj
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
      return serializeObject(obj, null, stopTypes, serializers)
    }
  })

  return `<div class="${fieldName}">${output.join('')}</div>`
}

const serializeObject = (
  obj: Record<string, any>,
  topFieldName: string | null = null,
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

  //if it's a custom object, iterate through it keys to find and serialize translatable content
  if (obj._type !== 'span' && obj._type !== 'block') {
    let innerHTML = ''

    Object.entries(obj).forEach(([fieldName, value]) => {
      let htmlField = ''

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
          const objHTML = serializeObject(
            toTranslate,
            null,
            stopTypes,
            serializers
          )
          htmlField = `<div class="${fieldName}">${objHTML}</div>`
        }
      }
      innerHTML += htmlField
    })

    if (!innerHTML) {
      return ''
    }
    tempSerializers.types[obj._type] = (props: Record<string, any>) => {
      return h('div', {
        className: topFieldName ?? props.node._type,
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

  return serializedBlock
}

export const BaseDocumentSerializer: Serializer = {
  serializeDocument,
  fieldFilter,
  languageObjectFieldFilter,
  serializeArray,
  serializeObject,
}
