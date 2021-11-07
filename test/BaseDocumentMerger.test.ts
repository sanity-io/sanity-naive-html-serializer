import { BaseDocumentMerger } from '../src/BaseDocumentMerger'
import clone from 'just-clone'
import { getDeserialized } from './helpers'
const documentLevelArticle = require('./__fixtures__/documentLevelArticle')
const fieldLevelArticle = require('./__fixtures__/fieldLevelArticle')

let mockTestKey = 0

//needed to make snapshots happy on internal spans (where we don't track keys)
jest.mock('@sanity/block-tools/lib/util/randomKey.js', () => {
  return jest.fn().mockImplementation(() => {
    return `randomKey-${++mockTestKey}`
  })
})

beforeEach(() => {
  mockTestKey = 0
})

const getNewObject = () => {
  const newObject = {
    title: 'A new title',
    nestedArrayField: clone(documentLevelArticle.config.nestedArrayField),
    objectAsField: { title: 'A new nested title' },
    _key: null,
  }
  newObject.nestedArrayField[0].children[0].text = 'New text'
  return newObject
}

const getNewDocument = () => {
  const newDocument = getDeserialized(documentLevelArticle, 'document')
  newDocument.title = 'A new document title'
  newDocument.snippet = 'A new document snippet'
  newDocument.config = getNewObject()
  const newBlockText = newDocument.content[0]
  newBlockText.children[0].text = 'New block text'
  newDocument.content = [newBlockText]
  return newDocument
}

/*
 * DOCUMENT LEVEL
 */

test('Global document level snapshot test', () => {
  const newDocument = getNewDocument()
  const mergedDocument = BaseDocumentMerger.documentLevelMerge(
    newDocument,
    documentLevelArticle
  )

  expect(mergedDocument).toMatchSnapshot()
})

/*
 * Objects
 */
test('Top-level string / text fields from new document override old document', () => {
  const newDocument = getNewDocument()
  const mergedDocument = BaseDocumentMerger.documentLevelMerge(
    newDocument,
    documentLevelArticle
  )

  expect(mergedDocument.title).toEqual(newDocument.title)
  expect(mergedDocument.snippet).toEqual(newDocument.snippet)
  expect(mergedDocument.title).not.toEqual(documentLevelArticle.title)
  expect(mergedDocument.snippet).not.toEqual(documentLevelArticle.snippet)
})

test('Nested object fields override old object fields', () => {
  const newDocument = getNewDocument()
  const mergedDocument = BaseDocumentMerger.documentLevelMerge(
    newDocument,
    documentLevelArticle
  )

  expect(mergedDocument.title).toEqual(newDocument.title)
  expect(mergedDocument.title).not.toEqual(documentLevelArticle.title)
  expect(mergedDocument.config.title).toEqual(newDocument.config.title)
  expect(mergedDocument.config.title).not.toEqual(
    documentLevelArticle.config.title
  )
  expect(mergedDocument.config.nestedArrayField[0].children[0].text).toEqual(
    newDocument.config.nestedArrayField[0].children[0].text
  )
  expect(
    mergedDocument.config.nestedArrayField[0].children[0].text
  ).not.toEqual(
    documentLevelArticle.config.nestedArrayField[0].children[0].text
  )
})

test('Nested object merge uses old fields when not present on new object', () => {
  const newDocument = getNewDocument()
  const mergedDocument = BaseDocumentMerger.documentLevelMerge(
    newDocument,
    documentLevelArticle
  )

  expect(newDocument.config.objectAsField.content).toBeUndefined()
  expect(mergedDocument.config.objectAsField.content).toBeDefined()
})

/*
 * Arrays
 */
test('Arrays will use new objects when they exist', () => {
  const newDocument = getNewDocument()
  const mergedDocument = BaseDocumentMerger.documentLevelMerge(
    newDocument,
    documentLevelArticle
  )

  expect(mergedDocument.content[0].children[0].text).toEqual(
    newDocument.content[0].children[0].text
  )
  expect(mergedDocument.content[0].children[0].text).not.toEqual(
    documentLevelArticle.content[0].children[0].text
  )
})

test('Arrays will use old blocks if they do not exist on new object', () => {
  const newDocument = getNewDocument()
  const mergedDocument = BaseDocumentMerger.documentLevelMerge(
    newDocument,
    documentLevelArticle
  )

  expect(newDocument.content[1]).toBeUndefined()
  expect(mergedDocument.content[1]).toBeDefined()
  expect(mergedDocument.content[1]._key).toEqual(
    documentLevelArticle.content[1]._key
  )
})

test('Arrays will merge objects in the array', () => {
  const newDocument = getNewDocument()
  const newObject = getNewObject()
  //these are different at diff levels -- delete for now to silence warning
  newDocument.content.push({
    _key: documentLevelArticle.content[1]._key,
    objectAsField: newObject.objectAsField,
    title: newObject.title,
  })
  const mergedDocument = BaseDocumentMerger.documentLevelMerge(
    newDocument,
    documentLevelArticle
  )

  expect(mergedDocument.content[1].title).toEqual(newDocument.content[1].title)
  expect(mergedDocument.content[1].objectAsField.title).toEqual(
    newDocument.content[1].objectAsField.title
  )
  expect(newDocument.content[1].objectAsField.content).toBeUndefined()
  expect(mergedDocument.content[1].objectAsField.content).toBeDefined()
})

/*
 * FIELD LEVEL -- todo (field level merge just wraps the other tested functions)
 */

const getNewFieldLevelObject = () => {
  const newObject = {
    title: 'A new title',
    nestedArrayField: clone(fieldLevelArticle.config.en.nestedArrayField),
    objectAsField: { title: 'A new nested title' },
    _key: null,
  }
  newObject.nestedArrayField[0].children[0].text = 'New text'
  return newObject
}

const getNewFieldLevelDocument = () => {
  const newDocument = getDeserialized(fieldLevelArticle, 'field')
  newDocument.title.en = 'A new document title'
  newDocument.snippet.en = 'A new document snippet'
  newDocument.config.en = getNewFieldLevelObject()
  const newBlockText = newDocument.content.en[0]
  newBlockText.children[0].text = 'New block text'
  newDocument.content.en = [newBlockText]
  return newDocument
}

test('Global field level snapshot test', () => {
  const newDocument = getNewFieldLevelDocument()
  const mergedDocument = BaseDocumentMerger.fieldLevelMerge(
    newDocument,
    fieldLevelArticle,
    'es-ES',
    'en'
  )

  expect(mergedDocument).toMatchSnapshot()
})
