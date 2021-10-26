import { Merger } from './types'
import { SanityDocument } from '@sanity/types'

const fieldLevelMerge = (
  translatedFields: Record<string, any>,
  //should be fetched according to the revision and id of the translated obj above
  baseDoc: SanityDocument,
  localeId: string,
  baseLang: string = 'en'
) => {
  const merged: Record<string, any> = {}

  for (let field in translatedFields) {
    if (['_rev', '_id', '_type'].includes(field)) {
      merged[field] = translatedFields[field]
      continue
    }

    const translatedVal = translatedFields[field][baseLang]
    //@ts-ignore
    const origVal = baseDoc[field][baseLang]

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

  return merged
}

const documentLevelMerge = (
  translatedFields: Record<string, any>,
  //should be fetched according to the revision and id of the translated obj above
  baseDoc: SanityDocument
) => {
  return reconcileObject(baseDoc, translatedFields)
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

export const BaseDocumentMerger: Merger = {
  fieldLevelMerge,
  documentLevelMerge,
  reconcileArray,
  reconcileObject,
}
