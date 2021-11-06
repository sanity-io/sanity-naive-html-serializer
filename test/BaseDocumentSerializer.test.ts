import { SerializedDocument } from '../src/types'
import {
  getSerialized,
  addedCustomerSerializers,
  createCustomInnerHTML,
} from './helpers'
import { Block } from '@sanity/types'
import {
  BaseDocumentSerializer,
  defaultStopTypes,
  customSerializers,
} from '../src'

const documentLevelArticle = require('./__fixtures__/documentLevelArticle')
const fieldLevelArticle = require('./__fixtures__/fieldLevelArticle')

const getHTMLNode = (serialized: SerializedDocument) => {
  const htmlString = serialized.content
  const parser = new DOMParser()
  return parser.parseFromString(htmlString, 'text/html')
}

const findByClass = (children: HTMLCollection, className: string) => {
  return Array.from(children).find(node => node.className === className)
}

const getValidFields = (field: Record<string, any>) => {
  const invalidFields = ['_type', '_key']
  return Object.keys(field).filter(key => !invalidFields.includes(key))
}

function toPlainText(blocks: Block[]) {
  return blocks
    .map(block => {
      if (block._type !== 'block' || !block.children) {
        return ''
      }
      return block.children.map(child => child.text).join('')
    })
    .join('\n\n')
}

test('Global test of working doc-level functionality and snapshot match', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  expect(serialized).toMatchSnapshot()
})

test('Global test of working field-level functionality and snapshot match', () => {
  const serialized = getSerialized(fieldLevelArticle, 'field')
  expect(serialized).toMatchSnapshot()
})

/*
 * metadata presence
 */
test('Contains metadata field containing document id', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized)
  const idMetaTag = Array.from(docTree.head.children).find(
    metaTag => metaTag.getAttribute('name') === '_id'
  )
  const id = idMetaTag?.getAttribute('content')
  expect(id).toEqual(documentLevelArticle._id)
})

test('Contains metadata field containing document revision', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized)
  const revMetaTag = Array.from(docTree.head.children).find(
    metaTag => metaTag.getAttribute('name') === '_rev'
  )
  const rev = revMetaTag?.getAttribute('content')
  expect(rev).toEqual(documentLevelArticle._rev)
})

test('Contains metadata field containing document type', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized)
  const typeMetaTag = Array.from(docTree.head.children).find(
    metaTag => metaTag.getAttribute('name') === '_type'
  )
  const type = typeMetaTag?.getAttribute('content')
  expect(type).toEqual(documentLevelArticle._type)
})

/*
 * DOCUMENT LEVEL
 */

/*
 * Top-level plain text
 */
test('String and text types get serialized correctly at top-level -- document level', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized).body.children[0]
  const HTMLString = findByClass(docTree.children, 'title')
  const HTMLText = findByClass(docTree.children, 'snippet')
  expect(HTMLString?.innerHTML).toEqual(documentLevelArticle.title)
  expect(HTMLText?.innerHTML).toEqual(documentLevelArticle.snippet)
})

/*
 * Presence and accuracy of fields in "vanilla" deserialization -- objects
 */
const getDocumentLevelObjectField = () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized).body.children[0]
  //parent node is always div with classname of field with a nested div
  //that has classname of obj type
  const configObj = findByClass(docTree.children, 'config')
  return configObj!.children[0]
}

test('Top-level nested objects contain all serializable fields -- document level', () => {
  const objectField = getDocumentLevelObjectField()
  const fieldNames = getValidFields(documentLevelArticle.config)
  const foundFieldNames = Array.from(objectField!.children).map(
    child => child.className
  )

  expect(fieldNames.sort()).toEqual(foundFieldNames.sort())
})

test('Nested object in object contains all serializable fields -- document level', () => {
  const objectField = getDocumentLevelObjectField()
  const nestedObject = findByClass(objectField!.children, 'objectAsField')!
    .children[0]
  const fieldNames = getValidFields(documentLevelArticle.config.objectAsField)
  const foundFieldNames = Array.from(nestedObject!.children).map(
    child => child.className
  )
  expect(fieldNames.sort()).toEqual(foundFieldNames.sort())
})

test('Nested object contains accurate values -- document level', () => {
  const objectField = getDocumentLevelObjectField()
  const title = documentLevelArticle.config.title
  const blockText = toPlainText(documentLevelArticle.config.nestedArrayField)

  expect(objectField?.innerHTML).toContain(title)
  expect(objectField?.innerHTML).toContain(blockText)
})

test('Nested object in an object contains accurate values -- document level', () => {
  const objectField = getDocumentLevelObjectField()
  const nestedObject = findByClass(objectField!.children, 'objectAsField')!
    .children[0]
  const title = documentLevelArticle.config.objectAsField.title
  const blockText = toPlainText(
    documentLevelArticle.config.objectAsField.content
  )

  expect(nestedObject.innerHTML).toContain(title)
  expect(nestedObject.innerHTML).toContain(blockText)
})

/*
 * Presence and accuracy of fields in vanilla deserialization -- arrays
 */
const getDocumentLevelArrayField = () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized).body.children[0]
  return findByClass(docTree.children, 'content')
}

test('Array contains all serializable blocks with keys, in order -- document level', () => {
  const arrayField = getDocumentLevelArrayField()
  const origKeys = documentLevelArticle.content.map(
    (block: Block) => block._key
  )
  const serializedKeys = Array.from(arrayField!.children).map(block => block.id)
  expect(origKeys).toEqual(serializedKeys)
})

test('Array contains top-level block text -- document level', () => {
  const arrayField = getDocumentLevelArrayField()
  const blockText = toPlainText(documentLevelArticle.content).trim()
  expect(arrayField?.innerHTML).toContain(blockText)
})

test('Object in array contains all serializable fields -- document level', () => {
  const arrayField = getDocumentLevelArrayField()
  const objectInArray = findByClass(arrayField!.children, 'objectField')
  const fieldNames = getValidFields(
    documentLevelArticle.content.find(
      (block: Record<string, any>) => block._type === 'objectField'
    )
  )
  const foundFieldNames = Array.from(objectInArray!.children).map(
    child => child.className
  )
  expect(fieldNames.sort()).toEqual(foundFieldNames.sort())
})

test('Object in array contains accurate values in nested object -- document level', () => {
  const arrayField = getDocumentLevelArrayField()
  const objectInArray = findByClass(arrayField!.children, 'objectField')
  const nestedObject = findByClass(objectInArray!.children, 'objectAsField')
  const title = documentLevelArticle.content.find(
    (block: Record<string, any>) => block._type === 'objectField'
  ).objectAsField.title
  const blockText = toPlainText(
    documentLevelArticle.content.find(
      (block: Record<string, any>) => block._type === 'objectField'
    ).objectAsField.content
  ).trim()
  expect(nestedObject?.innerHTML).toContain(title)
  expect(nestedObject?.innerHTML).toContain(blockText)
})

/*
 * FIELD LEVEL
 */

test('String and text types get serialized correctly at top-level -- field level', () => {
  const serialized = getSerialized(fieldLevelArticle, 'field')
  const docTree = getHTMLNode(serialized).body.children[0]
  const titleObj = findByClass(docTree.children, 'title')
  const HTMLString = findByClass(titleObj!.children, 'en')
  const snippetObj = findByClass(docTree.children, 'snippet')
  const HTMLText = findByClass(snippetObj!.children, 'en')
  expect(HTMLString?.innerHTML).toEqual(fieldLevelArticle.title.en)
  expect(HTMLText?.innerHTML).toEqual(fieldLevelArticle.snippet.en)
})
/*
 * Presence and accuracy of fields in "vanilla" deserialization -- objects
 */
const getFieldLevelObjectField = () => {
  const serialized = getSerialized(fieldLevelArticle, 'field')
  //parent node is always div with classname of field -- get its children
  const docTree = getHTMLNode(serialized).body.children[0]
  const config = findByClass(docTree.children, 'config')
  //return english field
  const englishConfig = findByClass(config!.children, 'en')
  return findByClass(englishConfig!.children, 'objectField')
}

test('Top-level nested objects contain all serializable fields -- field level', () => {
  const objectField = getFieldLevelObjectField()
  const fieldNames = getValidFields(fieldLevelArticle.config.en)
  const foundFieldNames = Array.from(objectField!.children).map(
    child => child.className
  )

  expect(fieldNames.sort()).toEqual(foundFieldNames.sort())
})

test('Nested object in object contains all serializable fields -- field Level', () => {
  const objectField = getFieldLevelObjectField()
  const nestedObject = findByClass(objectField!.children, 'objectAsField')!
    .children[0]
  const fieldNames = getValidFields(fieldLevelArticle.config.en.objectAsField)
  const foundFieldNames = Array.from(nestedObject!.children).map(
    child => child.className
  )
  expect(fieldNames.sort()).toEqual(foundFieldNames.sort())
})

test('Nested object contains accurate values -- field level', () => {
  const objectField = getFieldLevelObjectField()
  const title = fieldLevelArticle.config.en.title
  const blockText = toPlainText(fieldLevelArticle.config.en.nestedArrayField)

  expect(objectField?.innerHTML).toContain(title)
  expect(objectField?.innerHTML).toContain(blockText)
})

test('Nested object in an object contains accurate values -- field level', () => {
  const objectField = getFieldLevelObjectField()
  const nestedObject = findByClass(objectField!.children, 'objectAsField')!
    .children[0]
  const title = fieldLevelArticle.config.en.objectAsField.title
  const blockText = toPlainText(
    fieldLevelArticle.config.en.objectAsField.content
  )

  expect(nestedObject.innerHTML).toContain(title)
  expect(nestedObject.innerHTML).toContain(blockText)
})

/*
 * Presence and accuracy of fields in "vanilla" deserialization -- arrays
 */
const getFieldLevelArrayField = () => {
  const serialized = getSerialized(fieldLevelArticle, 'field')
  const docTree = getHTMLNode(serialized).body.children[0]
  const content = findByClass(docTree.children, 'content')
  return findByClass(content!.children, 'en')
}

test('Array contains all serializable blocks with keys, in order -- field level', () => {
  const arrayField = getFieldLevelArrayField()
  const origKeys = fieldLevelArticle.content.en.map(
    (block: Block) => block._key
  )
  const serializedKeys = Array.from(arrayField!.children).map(block => block.id)
  expect(origKeys).toEqual(serializedKeys)
})

test('Array contains top-level block text -- field level', () => {
  const arrayField = getFieldLevelArrayField()
  const blockText = toPlainText(fieldLevelArticle.content.en).trim()
  expect(arrayField?.innerHTML).toContain(blockText)
})

test('Object in array contains all serializable fields -- field level', () => {
  const arrayField = getFieldLevelArrayField()
  const objectInArray = findByClass(arrayField!.children, 'objectField')
  const fieldNames = getValidFields(
    fieldLevelArticle.content.en.find(
      (block: Record<string, any>) => block._type === 'objectField'
    )
  )
  const foundFieldNames = Array.from(objectInArray!.children).map(
    child => child.className
  )
  expect(fieldNames.sort()).toEqual(foundFieldNames.sort())
})

test('Object in array contains accurate values in nested object -- field level', () => {
  const arrayField = getFieldLevelArrayField()
  const objectInArray = findByClass(arrayField!.children, 'objectField')
  const nestedObject = findByClass(objectInArray!.children, 'objectAsField')
  const title = fieldLevelArticle.content.en.find(
    (block: Record<string, any>) => block._type === 'objectField'
  ).objectAsField.title
  const blockText = toPlainText(
    fieldLevelArticle.content.en.find(
      (block: Record<string, any>) => block._type === 'objectField'
    ).objectAsField.content
  ).trim()
  expect(nestedObject?.innerHTML).toContain(title)
  expect(nestedObject?.innerHTML).toContain(blockText)
})

test('Values in a field are not repeated', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized).body.children[0]
  const HTMLList = findByClass(docTree.children, 'tags')
  const tags = documentLevelArticle.tags
  expect(HTMLList?.innerHTML).toContain(tags[0])
  expect(HTMLList?.innerHTML).toContain(tags[1])
  expect(HTMLList?.innerHTML).toContain(tags[2])
})

/*
 * CUSTOM SETTINGS
 */

test('Custom serialization should manifest at all levels', () => {
  const serializer = BaseDocumentSerializer
  const serialized = serializer.serializeDocument(
    documentLevelArticle,
    'document',
    'en',
    defaultStopTypes,
    addedCustomerSerializers
  )
  const docTree = getHTMLNode(serialized).body.children[0]
  const arrayField = findByClass(docTree.children, 'content')

  const topLevelCustomSerialized = findByClass(docTree.children, 'config')
  const requiredTopLevelTitle = documentLevelArticle.config.title
  expect(topLevelCustomSerialized?.innerHTML).toContain(
    createCustomInnerHTML(requiredTopLevelTitle)
  )

  const nestedSerialized = findByClass(arrayField!.children, 'objectField')
  const requiredNestedTitle = documentLevelArticle.content.find(
    (b: Record<string, any>) => b._type === 'objectField'
  ).title
  expect(nestedSerialized?.innerHTML).toContain(
    createCustomInnerHTML(requiredNestedTitle)
  )
})

//expect localize false fields to be absent
//expect default stop types to be absent
//expect explicitly declared stop types to be absent

//load annotation and inline blocks content
//(it throws an annoying warning,
// so see if we can run in silent for console.debug)
// how those work with and without custom serializers
