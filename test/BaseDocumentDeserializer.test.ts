import { BaseDocumentSerializer } from '../src/BaseDocumentSerializer'
import { BaseDocumentDeserializer } from '../src/BaseDocumentDeserializer'
import { defaultStopTypes, customSerializers, customDeserializers, customBlockDeserializers } from '../src/BaseSerializationConfig'
const documentLevelArticle = require('./mocks/articles/documentLevelArticle')
const fieldLevelArticle = require('./mocks/articles/fieldLevelArticle')

test('Global test of working doc-level functionality and snapshot match', async () => {
  const serializer = BaseDocumentSerializer
  const serialized = await serializer.serializeDocument(
    documentLevelArticle._id, 'document', 'en', defaultStopTypes, customSerializers)
	const deserialized = await BaseDocumentDeserializer.deserializeDocument(serialized.content, customDeserializers, customBlockDeserializers)
	expect(deserialized).toMatchSnapshot()
})