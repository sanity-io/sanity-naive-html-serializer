import { SerializedDocument } from '../src/types'
import { getSerialized } from './helpers'
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

test('Global test of working doc-level functionality and snapshot match', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  expect(serialized).toMatchSnapshot()
})

test('Global test of working field-level functionality and snapshot match', () => {
  const serialized = getSerialized(fieldLevelArticle, 'field')
  expect(serialized).toMatchSnapshot()
})

/*
 * Test metadata presence
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
 * Test presence and accuracy of fields in "vanilla" deserialization
 */
test('Top-level nested objects contain all serializable fields', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  //parent node is always div with classname of field -- get its children
  const docTree = getHTMLNode(serialized).body.children[0]
  const configField = findByClass(docTree.children, 'config')
  const fieldNames = getValidFields(documentLevelArticle.config)
  const foundFieldNames = Array.from(configField!.children).map(
    child => child.className
  )

  expect(fieldNames.sort()).toEqual(foundFieldNames.sort())
})

test('Nested object in object contains all serializable fields', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  //parent node is always div with classname of field -- get its children
  const docTree = getHTMLNode(serialized).body.children[0]
  const configField = findByClass(docTree.children, 'config')

  const nestedObject = findByClass(configField!.children, 'objectAsField')!
    .children[0]
  const fieldNames = getValidFields(documentLevelArticle.config.objectAsField)
  const foundFieldNames = Array.from(nestedObject!.children).map(
    child => child.className
  )
  expect(fieldNames.sort()).toEqual(foundFieldNames.sort())
})

//expect values in a list to not be repeated (this was a bug)

//more integration-y tests:
//expect custom serializers to work
//expect localize false fields to be absent
//expect explicitly declared stop types to be absent

//load annotation and inline blocks content
//(it throws an annoying warning,
// so see if we can run in silent for console.debug)
// test how those work with and without custom serializers
