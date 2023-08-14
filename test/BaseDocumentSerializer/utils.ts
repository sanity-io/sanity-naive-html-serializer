import {SerializedDocument} from '../../src'

export const documentLevelArticle = require('../__fixtures__/documentLevelArticle')
export const inlineDocumentLevelArticle = require('../__fixtures__/inlineDocumentLevelArticle')
export const fieldLevelArticle = require('../__fixtures__/fieldLevelArticle')
export const annotationAndInlineBlocks = require('../__fixtures__/annotationAndInlineBlocks')
export const nestedLanguageFields = require('../__fixtures__/nestedLanguageFields')

export const schema = require('../__fixtures__/schema')
export const inlineSchema = require('../__fixtures__/inlineSchema')

export const getHTMLNode = (serialized: SerializedDocument): Document => {
  const htmlString = serialized.content
  const parser = new DOMParser()
  return parser.parseFromString(htmlString, 'text/html')
}

export const findByClass = (children: HTMLCollection, className: string): Element | undefined => {
  return Array.from(children).find((node) => node.className === className)
}
