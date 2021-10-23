import sanityClient from 'part:@sanity/base/client'
import { SanityDocument } from '@sanity/types'

const client = sanityClient.withConfig({ apiVersion: '2021-03-25' })

export const findLatestDraft = (documentId: string, ignoreI18n = true) => {
  //eliminates i18n versions
  const query = `*[_id match $id ${
    ignoreI18n ? ' && (_id in path("drafts.*") || _id in path("*"))' : ''
  }]`
  const params = { id: `*${documentId}` }
  return client
    .fetch(query, params)
    .then(
      (docs: SanityDocument[]) =>
        docs.find(doc => doc._id.includes('draft')) ?? docs[0]
    )
}
