import { BaseDocumentSerializer } from '../src'

import Schema from '@sanity/schema'

const schemas = Schema.compile({
  type: 'document',
  name: 'article',
  fields: [
    {
      type: 'array',
      name: 'body',
      of: [{ type: 'block' }],
    },
  ],
})

const serializer = BaseDocumentSerializer(schemas)

test('Custom serializer', () => {
  const article = {
    _id: 'test',
    _type: 'article',
    _rev: 'a',
    _createdAt: new Date().toISOString(),
    _updatedAt: new Date().toISOString(),
    body: [],
  }
  const result = serializer.serializeDocument(article, 'document')
  console.log(result)
})
