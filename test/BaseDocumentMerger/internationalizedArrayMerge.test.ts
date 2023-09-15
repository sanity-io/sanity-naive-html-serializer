// import {PortableTextBlock} from 'sanity'
import {internationalizedArrayArticle} from '../BaseDocumentSerializer/utils'
// import {getDeserialized, getI18nArrayItem, toPlainText} from '../helpers'
import {BaseDocumentMerger} from '../../src'
import {getInternationalizedArrayDocument} from './utils'

const newDocument = getInternationalizedArrayDocument()
const internationalizedArrayPatches = BaseDocumentMerger.internationalizedArrayMerge(
  newDocument,
  internationalizedArrayArticle,
  'es_ES',
  'en'
)

test('Global internationalized array snapshot test', () => {
  expect(internationalizedArrayPatches).toMatchSnapshot()
})
