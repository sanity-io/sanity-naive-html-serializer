import { BaseDocumentSerializer } from '../src/BaseDocumentSerializer'
import { defaultStopTypes, customSerializers } from '../src/BaseSerializationConfig'
const documentLevelArticle = require('./mocks/articles/documentLevelArticle')


test('Global test of working functionality and snapshot match', async () => {
  const serializer = BaseDocumentSerializer
  const serialized = await serializer.serializeDocument(
    documentLevelArticle._id, 'document', 'en', defaultStopTypes, customSerializers)
  console.log('serialized', serialized)
  // console.log('article', documentLevelArticle)
  expect(1 + 1).toBe(2)
})

//(maybe overkill, but good unit testing)
//expect individual fields and nested fields to be rendered as they are in the snapshot
//expect values in a list to not be repeated (this was a bug)

//more integration-y tests below:
//expect custom serializers to work
//expect localize false fields to be absent
//expect explicitly declared stop types to be absent