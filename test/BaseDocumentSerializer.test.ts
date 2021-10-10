import { BaseDocumentSerializer } from '../src/BaseDocumentSerializer'

test('Just making sure my config works', () => {
  const serializer = BaseDocumentSerializer
  console.log('serializer', serializer)
  expect(1 + 1).toBe(2)
})
