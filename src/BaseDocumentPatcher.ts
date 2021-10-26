import { findLatestDraft } from './helpers'
import sanityClient from 'part:@sanity/base/client'
import { Patcher } from './types'

//TODO: move all logic around fetching the right base document
//and merging to the right target document outside of this class

const client = sanityClient.withConfig({ apiVersion: '2021-03-25' })

const getUrl = (path: string) => {
  const { projectId, apiVersion } = client.config()
  const baseUrl = `https://${projectId}.api.sanity.io/v${apiVersion}`
  return baseUrl + path
}

const findDocumentAtRevision = async (documentId: string, rev: string) => {
  const { dataset } = client.config()
  let path = `/data/history/${dataset}/documents/${documentId}?revision=${rev}`
  let url = getUrl(path)
  let revisionDoc = await fetch(url, { credentials: 'include' })
    .then(req => req.json())
    .then(req => req.documents[0])
  /* endpoint will silently give you incorrect doc
   * if you don't request draft and the rev belongs to a draft, so check
   */
  if (revisionDoc._rev !== rev) {
    path = `/data/history/${dataset}/documents/drafts.${documentId}?revision=${rev}`
    url = getUrl(path)
    revisionDoc = await fetch(url, { credentials: 'include' })
      .then(req => req.json())
      .then(req => req.documents[0])
  }
  return revisionDoc
}

const fieldLevelPatch = async (
  translatedFields: Record<string, any>,
  documentId: string,
  localeId: string,
  baseLang: string = 'en'
) => {
  let doc: Record<string, any>
  if (translatedFields._rev) {
    doc = await findDocumentAtRevision(documentId, translatedFields._rev)
  } else {
    doc = await findLatestDraft(documentId)
  }
  const merged: Record<string, any> = {}

  for (let field in translatedFields) {
    if (field === '_rev') {
      continue
    }
    const translatedVal = translatedFields[field][baseLang]
    const origVal = doc[field][baseLang]

    let valToPatch
    if (typeof translatedVal === 'string') {
      valToPatch = translatedVal
    } else if (Array.isArray(translatedVal)) {
      valToPatch = reconcileArray(origVal ?? [], translatedVal)
    } else {
      valToPatch = reconcileObject(origVal ?? {}, translatedVal)
    }
    merged[`${field}.${localeId.replace('-', '_')}`] = valToPatch
  }

  client
    .patch(doc._id)
    .set(merged)
    .commit()
}

const documentLevelPatch = async (
  translatedFields: Record<string, any>,
  documentId: string,
  localeId: string
) => {
  let baseDoc: Record<string, any> = await findLatestDraft(documentId)
  const targetId = `i18n.${documentId}.${localeId}`
  const i18nDoc = await findLatestDraft(targetId, false)

  if (translatedFields._rev) {
    baseDoc = await findDocumentAtRevision(documentId, translatedFields._rev)
  } else if (i18nDoc) {
    /* check for existing i18n version. and, if there's no rev, use it as base */
    baseDoc = baseDoc ?? i18nDoc
  }

  const merged = reconcileObject(baseDoc, translatedFields)
  if (i18nDoc) {
    const cleanedMerge: Record<string, any> = {}
    Object.entries(merged).forEach(([key, value]) => {
      if (Object.keys(translatedFields).includes(key)) {
        cleanedMerge[key] = value
      }
    })
    client
      .transaction()
      //@ts-ignore
      .patch(i18nDoc._id, p => p.set(cleanedMerge))
      .commit()
  } else {
    merged._id = `drafts.${targetId}`
    merged._lang = localeId
    client.create(merged)
  }
}

const reconcileArray = (origArray: any[], translatedArray: any[]) => {
  //arrays of strings don't have keys, so just replace the array and return
  if (translatedArray && translatedArray.some(el => typeof el === 'string')) {
    return translatedArray
  }

  //deep copy needed for field level patching
  const combined = JSON.parse(JSON.stringify(origArray))

  translatedArray.forEach(block => {
    if (!block._key) {
      return
    }
    const foundBlockIdx = origArray.findIndex(
      origBlock => origBlock._key === block._key
    )
    if (foundBlockIdx < 0) {
      console.log(
        `This block no longer exists on the original document. Was it removed? ${JSON.stringify(
          block
        )}`
      )
    } else if (
      origArray[foundBlockIdx]._type === 'block' ||
      origArray[foundBlockIdx]._type === 'span'
    ) {
      combined[foundBlockIdx] = block
    } else if (Array.isArray(origArray[foundBlockIdx])) {
      combined[foundBlockIdx] = reconcileArray(origArray[foundBlockIdx], block)
    } else {
      combined[foundBlockIdx] = reconcileObject(origArray[foundBlockIdx], block)
    }
  })
  return combined
}

const reconcileObject = (
  origObject: Record<string, any>,
  translatedObject: Record<string, any>
) => {
  const updatedObj = JSON.parse(JSON.stringify(origObject))
  Object.entries(translatedObject).forEach(([key, value]) => {
    if (!value || key[0] === '_') {
      return
    }
    if (typeof value === 'string') {
      updatedObj[key] = value
    } else if (Array.isArray(value)) {
      updatedObj[key] = reconcileArray(origObject[key] ?? [], value)
    } else {
      updatedObj[key] = reconcileObject(origObject[key] ?? {}, value)
    }
  })
  return updatedObj
}

export const BaseDocumentPatcher: Patcher = {
  fieldLevelPatch,
  documentLevelPatch,
  reconcileArray,
  reconcileObject,
}
