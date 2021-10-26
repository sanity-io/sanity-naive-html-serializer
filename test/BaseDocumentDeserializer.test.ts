import { getDeserialized } from './helpers'
const documentLevelArticle = require('./__fixtures__/documentLevelArticle')
const fieldLevelArticle = require('./__fixtures__/fieldLevelArticle')

let mockTestKey = 0

jest.mock('@sanity/block-tools/lib/util/randomKey.js', () => {
  return jest.fn().mockImplementation(() => {
    return `randomKey-${++mockTestKey}`
  })
})

beforeEach(() => {
  mockTestKey = 0
})

test('Global test of working doc-level functionality and snapshot match', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  expect(deserialized).toMatchSnapshot()
})

test('Global test of working field-level functionality and snapshot match', () => {
  const deserialized = getDeserialized(fieldLevelArticle, 'field')
  expect(deserialized).toMatchSnapshot()
})

test('Contains id of original document', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  const id = deserialized._id
  expect(id).toEqual(documentLevelArticle._id)
})

test('Contains rev of original document', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  const rev = deserialized._rev
  expect(rev).toEqual(documentLevelArticle._rev)
})

test('Contains type of original document', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  const type = deserialized._type
  expect(type).toEqual(documentLevelArticle._type)
})
