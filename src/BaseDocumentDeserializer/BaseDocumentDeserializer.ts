import blockTools from '@sanity/block-tools'
import {
  customDeserializers,
  customBlockDeserializers,
} from '../BaseSerializationConfig'
import { Deserializer } from '../types'
import { blockContentType, preprocess } from './helpers'

const deserializeDocument = (
  serializedDoc: string,
  deserializers: Record<string, any> = customDeserializers,
  blockDeserializers = customBlockDeserializers
) => {
  const metadata: Record<string, any> = {}
  const head = new DOMParser().parseFromString(serializedDoc, 'text/html').head

  Array.from(head.children).forEach(metaTag => {
    const validTags = ['_id', '_rev', '_type']
    const metaName = metaTag.getAttribute('name')
    if (metaName && validTags.includes(metaName)) {
      metadata[metaName] = metaTag.getAttribute('content')
    }
  })

  const content: Record<string, any> = deserializeHTML(
    serializedDoc,
    deserializers,
    blockDeserializers
  )

  return {
    ...content,
    ...metadata,
  }
}

const deserializeHTML = (
  html: string,
  deserializers: Record<string, any>,
  blockDeserializers: Array<any>
): Record<string, any> | any[] => {
  //parent node is always div with classname of field -- get its child
  let HTMLnode = new DOMParser().parseFromString(html, 'text/html').body
    .children[0]

  //catch embedded object as a field
  if (HTMLnode.getAttribute('data-level') === 'field') {
    HTMLnode = HTMLnode.children[0]
  }

  if (!HTMLnode) {
    return {}
  }

  let output: Record<string, any> | any[]

  //prioritize custom deserialization
  const deserialize = deserializers.types[HTMLnode.className]
  if (deserialize) {
    output = deserialize(HTMLnode)
  } else if (HTMLnode.getAttribute('data-type') === 'object') {
    output = deserializeObject(HTMLnode, deserializers, blockDeserializers)
  } else if (HTMLnode.getAttribute('data-type') === 'array') {
    output = deserializeArray(HTMLnode, deserializers, blockDeserializers)
  } else {
    output = {}
    console.debug(
      `Tried to deserialize block ${HTMLnode.outerHTML} but failed to identify it!`
    )
  }

  return output
}

const deserializeObject = (
  objectHTML: Element,
  deserializers: Record<string, any> = customDeserializers,
  blockDeserializers = customBlockDeserializers
) => {
  const deserialize = deserializers.types[objectHTML.className]
  if (deserialize) {
    return deserialize(objectHTML)
  }

  const output: Record<string, any> = {}
  //account for anonymous inline objects
  if (objectHTML.className) {
    output._type = objectHTML.className
  }
  const children = Array.from(objectHTML.children)

  children.forEach(child => {
    if (child.tagName.toLowerCase() === 'span') {
      output[child.className] = preprocess(child.innerHTML)
    } else if (child.getAttribute('data-level') === 'field') {
      output[child.className] = deserializeHTML(
        child.outerHTML,
        deserializers,
        blockDeserializers
      )
    } else if (child.getAttribute('data-type') === 'array') {
      output[child.className] = deserializeArray(
        child,
        deserializers,
        blockDeserializers
      )
    }
  })
  return output
}

const deserializeArray = (
  arrayHTML: Element,
  deserializers: Record<string, any> = customDeserializers,
  blockDeserializers = customBlockDeserializers
) => {
  const output: any[] = []
  const children = Array.from(arrayHTML.children)
  children.forEach(child => {
    let deserializedObject: any
    if (child.tagName.toLowerCase() === 'span') {
      deserializedObject = preprocess(child.innerHTML)
    }
    //has specific class name, so it's either a field or obj
    else if (child.className) {
      deserializedObject = deserializeObject(
        child,
        deserializers,
        blockDeserializers
      )
      deserializedObject._key = child.id
    } else {
      deserializedObject = blockTools.htmlToBlocks(
        child.outerHTML,
        blockContentType,
        { rules: blockDeserializers }
      )[0]
      deserializedObject._key = child.id
    }

    if (!deserializedObject) {
      console.debug(
        `Tried to deserialize block: ${child.outerHTML} in an array but failed to identify it!`
      )
    } else {
      output.push(deserializedObject)
    }
  })
  return output
}

const BaseDocumentDeserializer: Deserializer = {
  deserializeDocument,
  deserializeHTML,
}

export default BaseDocumentDeserializer
