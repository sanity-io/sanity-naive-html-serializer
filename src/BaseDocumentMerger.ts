import {Merger} from './types'
import {SanityDocument} from 'sanity'
import {extractWithPath, arrayToJSONMatchPath, extract} from '@sanity/mutator'

//based on args required for a sanityClient.insert operation
//https://github.com/sanity-io/client/blob/d061e116cea10096c262fe3a8b0926d4fecdb6f3/src/data/patch.ts#L102

interface I18nArrayItem {
  _key: string
  _type: string
  value: Record<string, any> | string | Array<any>
}
interface I18nArrayInsert {
  at: 'before' | 'after' | 'replace'
  selector: string
  items: Array<I18nArrayItem>
}

const reconcileArray = (origArray: any[], translatedArray: any[]): any[] => {
  //arrays of strings don't have keys, so just replace the array and return
  if (translatedArray && translatedArray.some((el) => typeof el === 'string')) {
    return translatedArray
  }

  //deep copy needed for field level patching
  const combined = JSON.parse(JSON.stringify(origArray))

  translatedArray.forEach((block) => {
    if (!block._key) {
      return
    }
    const foundBlockIdx = origArray.findIndex((origBlock) => origBlock._key === block._key)
    if (foundBlockIdx < 0) {
      //eslint-disable-next-line no-console
      console.warn(
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
      //eslint-disable-next-line no-use-before-define -- this is a recursive function
      combined[foundBlockIdx] = reconcileObject(origArray[foundBlockIdx], block)
    }
  })
  return combined
}

const reconcileObject = (
  origObject: Record<string, any>,
  translatedObject: Record<string, any>
): Record<string, any> => {
  if (typeof translatedObject !== 'object' || !Object.keys(translatedObject).length) {
    return origObject
  }

  const updatedObj = JSON.parse(JSON.stringify(origObject))
  Object.entries(translatedObject).forEach(([key, value]) => {
    if (!value || key[0] === '_') {
      return
    }
    if (typeof value === 'string') {
      updatedObj[key] = value
    } else if (Array.isArray(value)) {
      //eslint-disable-next-line @typescript-eslint/no-use-before-define -- this is a recursive function
      updatedObj[key] = reconcileArray(origObject[key] ?? [], value)
    } else {
      updatedObj[key] = reconcileObject(origObject[key] ?? {}, value)
    }
  })
  return updatedObj
}

const fieldLevelMerge = (
  translatedFields: Record<string, any>,
  //should be fetched according to the revision and id of the translated obj above
  baseDoc: SanityDocument,
  localeId: string,
  baseLang: string = 'en'
): Record<string, any> => {
  const merged: Record<string, any> = {}
  const metaKeys = ['_rev', '_id', '_type']
  metaKeys.forEach((metaKey) => {
    if (translatedFields[metaKey]) {
      merged[metaKey] = translatedFields[metaKey]
    }
  })

  //get any field that matches the base language, because it's been translated
  const originPaths = extractWithPath(`..${baseLang}`, translatedFields)
  originPaths.forEach((match) => {
    const origVal = extractWithPath(arrayToJSONMatchPath(match.path), baseDoc)[0].value
    const translatedVal = extractWithPath(arrayToJSONMatchPath(match.path), translatedFields)[0]
      .value
    let valToPatch
    if (typeof translatedVal === 'string') {
      valToPatch = translatedVal
    } else if (Array.isArray(translatedVal) && translatedVal.length) {
      valToPatch = reconcileArray((origVal as Array<any>) ?? [], translatedVal)
    } else if (
      typeof translatedVal === 'object' &&
      Object.keys(translatedVal as Record<string, any>).length
    ) {
      valToPatch = reconcileObject(origVal ?? {}, translatedVal as Record<string, any>)
    }
    const destinationPath = [
      ...match.path.slice(0, match.path.length - 1), //cut off the "en"
      localeId.replace('-', '_'), // replace it with our locale
    ]

    merged[arrayToJSONMatchPath(destinationPath)] = valToPatch
  })

  return merged
}

const internationalizedArrayMerge = (
  translatedItems: Record<string, any>,
  //should be fetched according to the revision and id of the translated obj above
  baseDoc: SanityDocument,
  localeId: string,
  baseLang: string = 'en',
  localeArrayPosition: number = 0
): Record<string, any> => {
  const patches: I18nArrayInsert[] = []

  //get all keys that match the base language from the translated doc,
  //since those are the strings that have been translated
  const extractionKey = `..[_key == "${baseLang}"]`
  const originPaths = extractWithPath(extractionKey, translatedItems)

  //slice off the index to get the arrays at which all the translated fields live
  //then transform to string so we can extract
  const i18nArrayPaths = originPaths
    .map((match) => match.path.slice(0, match.path.length - 1))
    .map((path) => arrayToJSONMatchPath(path))

  //extract produces duplicates. Likely we need to replace
  //the function we're using. For now, just dedupe
  Array.from(new Set(i18nArrayPaths)).forEach((path) => {
    //we need to merge the translated values with those things
    //that were not set off for translation. Get the original first
    const origArray = extract(path, baseDoc)[0] as Array<I18nArrayItem>
    const origVal = origArray.find((item: I18nArrayItem) => item._key === baseLang)?.value

    const translatedVal = (extract(path, translatedItems)[0] as Array<I18nArrayItem>).find(
      (item: I18nArrayItem) => item._key === baseLang
    )?.value

    //then, combine the translated values with the original recursively
    let valToPatch
    if (typeof translatedVal === 'string') {
      valToPatch = translatedVal
    } else if (Array.isArray(translatedVal) && translatedVal.length) {
      valToPatch = reconcileArray((origVal as Array<any>) ?? [], translatedVal)
    } else if (
      typeof translatedVal === 'object' &&
      Object.keys(translatedVal as Record<string, any>).length
    ) {
      valToPatch = reconcileObject(
        (origVal as Record<string, any>) ?? {},
        translatedVal as Record<string, any>
      )
    }

    let finalArrayPosition = localeArrayPosition
    //check if the array is long enough for it 
    //see wtf is causing duplicates

    //check the original array to see what operation we should run
    //(we don't want duplicates of locale keys)
    const existingLocaleKey = origArray.find((item) => item._key === localeId)
    const at = existingLocaleKey ? 'replace' : 'after'
    const selector: string = existingLocaleKey
      ? `${path}[_key == "${localeId}"]`
      : `${path}[${localeArrayPosition - 1}]`

    if (valToPatch) {
      patches.push({
        at,
        selector,
        items: [{_key: localeId, _type: origArray[0]._type, value: valToPatch}],
      })
    }
  })

  return patches
}

const documentLevelMerge = (
  translatedFields: Record<string, any>,
  //should be fetched according to the revision and id of the translated obj above
  baseDoc: SanityDocument
): Record<string, any> => {
  return reconcileObject(baseDoc, translatedFields)
}

export const BaseDocumentMerger: Merger = {
  fieldLevelMerge,
  documentLevelMerge,
  internationalizedArrayMerge,
  reconcileArray,
  reconcileObject,
}
