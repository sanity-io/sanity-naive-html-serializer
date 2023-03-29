import { ObjectField, TypedObject } from '@sanity/types'

const META_FIELDS = ['_key', '_type', '_id']

/*
 * Helper. If field-level translation pattern used, only sends over
 * content from the base language. Works recursively, so if users
 * use this pattern several layers deep, base language fields will still be found.
 */
export const languageObjectFieldFilter = (
  obj: Record<string, any>,
  baseLang: string
) => {
  const filterToLangField = (obj: Record<string, any>) => {
    const filteredObj: Record<string, any> = {}
    filteredObj[baseLang] = obj[baseLang]
    META_FIELDS.forEach(field => {
      if (obj[field]) {
        filteredObj[field] = obj[field]
      }
    })
    return filteredObj
  }

  const findBaseLang = (childObj: Record<string, any>): Record<string, any> => {
    const filteredObj: Record<string, any> = {}
    META_FIELDS.forEach(field => {
      if (childObj[field]) {
        filteredObj[field] = childObj[field]
      }
    })

    for (let key in childObj) {
      const value: any = childObj[key]
      //we've reached a base language field, add it to
      //what we want to send to translation
      if (value.hasOwnProperty(baseLang)) {
        filteredObj[key] = filterToLangField(value)
      }
      //we have an array that may have language fields in its objects
      else if (
        Array.isArray(value) &&
        value.length &&
        typeof value[0] === 'object'
      ) {
        //recursively find and filter for any objects that have the base language
        const validLangObjects = value.reduce((validArr, objInArray) => {
          if (objInArray._type === 'block') {
            validArr.push(objInArray)
          } else if (objInArray.hasOwnProperty(baseLang)) {
            validArr.push(filterToLangField(objInArray))
          } else {
            const filtered = findBaseLang(objInArray)
            const nonMetaFields = Object.keys(filtered).filter(
              key => META_FIELDS.indexOf(key) === -1
            )
            if (nonMetaFields.length) {
              validArr.push(filtered)
            }
          }
          return validArr
        }, [])
        if (validLangObjects.length) {
          filteredObj[key] = validLangObjects
        }
      }
      //we have an object nested in an object
      //recurse down the tree
      else if (typeof value === 'object') {
        const nestedLangObj = findBaseLang(value)
        const nonMetaFields = Object.keys(nestedLangObj).filter(
          key => META_FIELDS.indexOf(key) === -1
        )
        if (nonMetaFields.length) {
          filteredObj[key] = nestedLangObj
        }
      }
    }
    return filteredObj
  }

  //send top level object into recursive function
  return findBaseLang(obj)
}

/*
 * Eliminates stop-types and non-localizable fields
 * for document-level translation.
 */
export const fieldFilter = (
  obj: Record<string, any>,
  objFields: ObjectField[],
  stopTypes: string[]
): TypedObject => {
  const filteredObj: TypedObject = { _type: obj._type }

  const fieldFilter = (field: Record<string, any>) => {
    if (field.localize === false) {
      return false
    } else if (field.type === 'string' || field.type === 'text') {
      return true
    } else if (Array.isArray(obj[field.name])) {
      return true
    } else if (!stopTypes.includes(field.type)) {
      return true
    }
    return false
  }
  if (hasPossibleNameCollision(obj, objFields)) {
    return obj as TypedObject
  }

  const validFields = [
    ...META_FIELDS,
    ...objFields.filter(fieldFilter).map(field => field.name),
  ]

  validFields.forEach(field => {
    if (obj[field]) {
      filteredObj[field] = obj[field]
    }
  })
  return filteredObj
}

//if the object has fields that are not in the schema,
//we should return the object as is -- it might be a name collision
//(e.g., an inline object with the same name as a top-level one)
export const hasPossibleNameCollision = (
  obj: Record<string, any>,
  objFields: ObjectField[]
) => {
  const objFieldNames = [...objFields.map(field => field.name)]
  return Object.keys(obj).filter(
    fieldName => fieldName.charAt(0) !== '_').some(
    key => objFieldNames.indexOf(key) === -1
  )
}
