import { BaseDocumentSerializer } from '../src/BaseDocumentSerializer'
import { defaultStopTypes, customSerializers } from '../src/BaseSerializationConfig'
const documentLevelArticle = require('./mocks/articles/documentLevelArticle')
const fieldLevelArticle = require('./mocks/articles/fieldLevelArticle')

test('Global test of working doc-level functionality and snapshot match', async () => {
  const serializer = BaseDocumentSerializer
  const serialized = await serializer.serializeDocument(
    documentLevelArticle._id, 'document', 'en', defaultStopTypes, customSerializers)
  expect(serialized).toMatchSnapshot()
})

test('Global test of working field-level functionality and snapshot match', async () => {
  const serializer = BaseDocumentSerializer
  const serialized = await serializer.serializeDocument(
    fieldLevelArticle._id, 'field', 'en', defaultStopTypes, customSerializers)
  expect(serialized).toMatchSnapshot()
})

//(maybe overkill, but maybe good unit testing and/or for further debugging):
//expect individual fields and nested fields to be rendered as they are in the snapshot
//expect values in a list to not be repeated (this was a bug)

//more integration-y tests below:
//expect custom serializers to work
//expect localize false fields to be absent
//expect explicitly declared stop types to be absent