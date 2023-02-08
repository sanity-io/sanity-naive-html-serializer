import {BaseDocumentMerger} from '../src/BaseDocumentMerger'
import clone from 'just-clone'
import {PortableTextBlock} from 'sanity'
import {getDeserialized} from './helpers'
const documentLevelArticle = require('./__fixtures__/documentLevelArticle')
const fieldLevelArticle = require('./__fixtures__/fieldLevelArticle')
const nestedLanguageFields = require('./__fixtures__/nestedLanguageFields')

let mockTestKey = 0

//needed to make snapshots happy on internal spans (where we don't track keys)
jest.mock('@sanity/block-tools/src/util/randomKey.ts', () => {
  return jest.fn().mockImplementation(() => {
    return `-${++mockTestKey}`
  })
})

beforeEach(() => {
  mockTestKey = 0
})

const getNewObject = () => {
  const newObject = {
    title: 'A new title',
    nestedArrayField: clone(documentLevelArticle.config.nestedArrayField),
    objectAsField: {title: 'A new nested title'},
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
describe('Document level merging', () => {
  const newDocument = getNewDocument()
  const mergedDocument = BaseDocumentMerger.documentLevelMerge(newDocument, documentLevelArticle)

  test('Global document level snapshot test', () => {
    expect(mergedDocument).toMatchSnapshot()
  })

  /*
   * Objects
   */
  test('Top-level string / text fields from new document override old document', () => {
    expect(mergedDocument.title).toEqual(newDocument.title)
    expect(mergedDocument.snippet).toEqual(newDocument.snippet)
    expect(mergedDocument.title).not.toEqual(documentLevelArticle.title)
    expect(mergedDocument.snippet).not.toEqual(documentLevelArticle.snippet)
  })

  test('Nested object fields override old object fields', () => {
    expect(mergedDocument.config.title).toEqual(newDocument.config.title)
    expect(mergedDocument.config.title).not.toEqual(documentLevelArticle.config.title)
    expect(mergedDocument.config.nestedArrayField[0].children[0].text).toEqual(
      newDocument.config.nestedArrayField[0].children[0].text
    )
    expect(mergedDocument.config.nestedArrayField[0].children[0].text).not.toEqual(
      documentLevelArticle.config.nestedArrayField[0].children[0].text
    )
  })

  test('Nested object merge uses old fields when not present on new object', () => {
    expect(newDocument.config.objectAsField.content).toBeUndefined()
    expect(mergedDocument.config.objectAsField.content).toBeDefined()
  })

  /*
   * Arrays
   */
  test('Arrays will use new objects when they exist', () => {
    expect(mergedDocument.content[0].children[0].text).toEqual(
      newDocument.content[0].children[0].text
    )
    expect(mergedDocument.content[0].children[0].text).not.toEqual(
      documentLevelArticle.content[0].children[0].text
    )
  })

  test('Arrays will use old blocks if they do not exist on new object', () => {
    expect(newDocument.content[1]).toBeUndefined()
    expect(mergedDocument.content[1]).toBeDefined()
    expect(mergedDocument.content[1]._key).toEqual(documentLevelArticle.content[1]._key)
  })

  test('Arrays will merge objects in the array', () => {
    const newDocument = getNewDocument()
    const newObject = getNewObject()

    //add a new block with some new content, but not all new content
    newDocument.content.push({
      _key: documentLevelArticle.content[1]._key,
      objectAsField: newObject.objectAsField,
      title: newObject.title,
    })
    const mergedDocument = BaseDocumentMerger.documentLevelMerge(newDocument, documentLevelArticle)

    expect(mergedDocument.content[1].title).toEqual(newDocument.content[1].title)
    expect(mergedDocument.content[1].objectAsField.title).toEqual(
      newDocument.content[1].objectAsField.title
    )
    //content existed on old doc but not new, so the two coexist happily
    expect(newDocument.content[1].objectAsField.content).toBeUndefined()
    expect(mergedDocument.content[1].objectAsField.content).toBeDefined()
  })
})

/*
 * FIELD LEVEL -- todo (field level merge just wraps the other tested functions)
 */

const getNewFieldLevelObject = () => {
  const newObject = {
    title: 'A new title',
    nestedArrayField: clone(fieldLevelArticle.config.en.nestedArrayField),
    objectAsField: {title: 'A new nested title'},
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

describe('Field level merging', () => {
  const newDocument = getNewFieldLevelDocument()
  const fieldLevelPatches = BaseDocumentMerger.fieldLevelMerge(
    newDocument,
    fieldLevelArticle,
    'es_ES',
    'en'
  )
  test('Global field level snapshot test', () => {
    expect(fieldLevelPatches).toMatchSnapshot()
  })

  /*
   * Objects
   */
  test('Top-level string / text fields from new document patch to new field, and will be maintained in old field', () => {
    expect(fieldLevelPatches['title.es_ES']).toEqual(newDocument.title.en)
    expect(fieldLevelPatches['snippet.es_ES']).toEqual(newDocument.snippet.en)
    expect(fieldLevelPatches['title.es_ES']).not.toEqual(fieldLevelArticle.title.en)
    expect(fieldLevelPatches['snippet.es_ES']).not.toEqual(fieldLevelArticle.snippet.en)
    expect(fieldLevelPatches['title.en']).toBeUndefined()
    expect(fieldLevelPatches['snippet.en']).toBeUndefined()
  })

  test('Nested object fields override old object fields', () => {
    expect(fieldLevelPatches['config.es_ES'].title).toEqual(newDocument.config.en.title)
    expect(fieldLevelPatches['config.es_ES'].title).not.toEqual(fieldLevelArticle.config.en.title)
    expect(fieldLevelPatches['config.es_ES'].nestedArrayField[0].children[0].text).toEqual(
      newDocument.config.en.nestedArrayField[0].children[0].text
    )
    expect(fieldLevelPatches['config.es_ES'].nestedArrayField[0].children[0].text).not.toEqual(
      fieldLevelArticle.config.en.nestedArrayField[0].children[0].text
    )
  })

  test('Nested object merge uses old fields when not present on new object', () => {
    expect(fieldLevelPatches['config.es_ES'].objectAsField.content).toEqual(
      fieldLevelArticle.config.en.objectAsField.content
    )
  })

  /*
   * Arrays
   */
  test('Arrays will use new objects when they exist', () => {
    expect(fieldLevelPatches['content.es_ES'][0].children[0].text).toEqual(
      newDocument.content.en[0].children[0].text
    )
    expect(fieldLevelPatches['content.es_ES'][0].children[0].text).not.toEqual(
      documentLevelArticle.content[0].children[0].text
    )
  })

  test('Arrays will use old blocks if they do not exist on new object', () => {
    expect(newDocument.content.en[1]).toBeUndefined()
    expect(fieldLevelPatches['content.es_ES'][1]).toBeDefined()
    expect(fieldLevelPatches['content.es_ES'][1]._key).toEqual(fieldLevelArticle.content.en[1]._key)
  })

  test('Arrays will merge objects in the array', () => {
    const newDocument = getNewFieldLevelDocument()
    const newObject = getNewObject()

    //add a new block with some new content, but not all new content
    newDocument.content.en.push({
      _key: fieldLevelArticle.content.en[1]._key,
      objectAsField: newObject.objectAsField,
      title: newObject.title,
      //does not include "content" field -- we want that to be merged with the old
    })

    const fieldLevelPatches = BaseDocumentMerger.fieldLevelMerge(
      newDocument,
      fieldLevelArticle,
      'es_ES',
      'en'
    )

    expect(fieldLevelPatches['content.es_ES'][1].title).toEqual(newDocument.content.en[1].title)
    expect(fieldLevelPatches['content.es_ES'][1].objectAsField.title).toEqual(
      newDocument.content.en[1].objectAsField.title
    )
    //"content" field existed on old doc but not new, so the two coexist happily
    expect(newDocument.content.en[1].objectAsField.content).toBeUndefined()
    expect(fieldLevelPatches['content.es_ES'][1].objectAsField.content).toBeDefined()
  })

  test('nested locale fields will be merged', () => {
    const newNestedFields = clone(nestedLanguageFields)
    newNestedFields.pageFields.name.en = 'This is a new page field name'
    newNestedFields.slices[0].en[0].children[0].text = 'This is new slice text'
    const baseDocument = {...fieldLevelArticle, ...nestedLanguageFields}
    const newDocument = getDeserialized({...fieldLevelArticle, ...newNestedFields}, 'field')
    const fieldLevelPatches = BaseDocumentMerger.fieldLevelMerge(
      newDocument,
      baseDocument,
      'es_ES',
      'en'
    )

    expect(fieldLevelPatches['slices[0].es_ES'][0].children[0].text).toEqual(
      newDocument.slices[0].en[0].children[0].text
    )
    expect(fieldLevelPatches['pageFields.name.es_ES']).toEqual(newDocument.pageFields.name.en)
  })
})

/*
 * STYLE TAGS
 */
test('Merged document should maintain style tags', () => {
  const newDocument = getNewDocument()
  const mergedDocument = BaseDocumentMerger.documentLevelMerge(newDocument, documentLevelArticle)
  const origH1Block = documentLevelArticle.content.find(
    (block: PortableTextBlock) => block.style === 'h1'
  )
  const origH2Block = documentLevelArticle.content.find(
    (block: PortableTextBlock) => block.style === 'h2'
  )
  const mergedH1Block = mergedDocument.content.find(
    (block: PortableTextBlock) => block.style === 'h1'
  )
  const mergedH2Block = mergedDocument.content.find(
    (block: PortableTextBlock) => block.style === 'h2'
  )
  expect(mergedH1Block).toBeDefined()
  expect(mergedH2Block).toBeDefined()
  expect(mergedH1Block._key).toEqual(origH1Block._key)
  expect(mergedH2Block._key).toEqual(origH2Block._key)
})
