import { SerializedDocument } from '../src/types'
import {
  getSerialized,
  addedCustomSerializers,
  createCustomInnerHTML,
  getValidFields,
  toPlainText,
} from './helpers'
import { Block } from '@sanity/types'
import {
  BaseDocumentSerializer,
  defaultStopTypes,
  customSerializers,
} from '../src'

const documentLevelArticle = require('./__fixtures__/documentLevelArticle')
const fieldLevelArticle = require('./__fixtures__/fieldLevelArticle')
const annotationAndInlineBlocks = require('./__fixtures__/annotationAndInlineBlocks')
const nestedLanguageFields = require('./__fixtures__/nestedLanguageFields')

const getHTMLNode = (serialized: SerializedDocument) => {
  const htmlString = serialized.content
  const parser = new DOMParser()
  return parser.parseFromString(htmlString, 'text/html')
}

const findByClass = (children: HTMLCollection, className: string) => {
  return Array.from(children).find(node => node.className === className)
}

test('Global test of working doc-level functionality and snapshot match', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  expect(serialized).toMatchSnapshot()
})

test('Global test of working field-level functionality and snapshot match', () => {
  const serialized = getSerialized(fieldLevelArticle, 'field')
  expect(serialized).toMatchSnapshot()
})

/*
 * metadata presence
 */
test('Contains metadata field containing document id', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized)
  const idMetaTag = Array.from(docTree.head.children).find(
    metaTag => metaTag.getAttribute('name') === '_id'
  )
  const id = idMetaTag?.getAttribute('content')
  expect(id).toEqual(documentLevelArticle._id)
})

test('Contains metadata field containing document revision', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized)
  const revMetaTag = Array.from(docTree.head.children).find(
    metaTag => metaTag.getAttribute('name') === '_rev'
  )
  const rev = revMetaTag?.getAttribute('content')
  expect(rev).toEqual(documentLevelArticle._rev)
})

test('Contains metadata field containing document type', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized)
  const typeMetaTag = Array.from(docTree.head.children).find(
    metaTag => metaTag.getAttribute('name') === '_type'
  )
  const type = typeMetaTag?.getAttribute('content')
  expect(type).toEqual(documentLevelArticle._type)
})

/*
 * DOCUMENT LEVEL
 */

describe('Document-level serialization', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized).body.children[0]

  /*
   * Top-level plain text
   */
  test('String and text types get serialized correctly at top-level', () => {
    const HTMLString = findByClass(docTree.children, 'title')
    const HTMLText = findByClass(docTree.children, 'snippet')
    expect(HTMLString?.innerHTML).toEqual(documentLevelArticle.title)
    expect(HTMLText?.innerHTML).toEqual(documentLevelArticle.snippet)
  })

  /*
   * Presence and accuracy of fields
   */
  describe('Presence and accuracy of fields in "vanilla" deserialization -- objects', () => {
    //parent node is always div with classname of field with a nested div
    //that has classname of obj type
    const configObj = findByClass(docTree.children, 'config')
    const objectField = configObj!.children[0]

    test('Top-level nested objects contain all serializable fields -- document level', () => {
      const fieldNames = getValidFields(documentLevelArticle.config)
      const foundFieldNames = Array.from(objectField!.children).map(
        child => child.className
      )
      expect(foundFieldNames.sort()).toEqual(fieldNames.sort())
    })

    test('Nested object in object contains all serializable fields -- document level', () => {
      const nestedObject = findByClass(objectField!.children, 'objectAsField')!
        .children[0]
      const fieldNames = getValidFields(
        documentLevelArticle.config.objectAsField
      )
      const foundFieldNames = Array.from(nestedObject!.children).map(
        child => child.className
      )
      expect(foundFieldNames.sort()).toEqual(fieldNames.sort())
    })

    test('Nested object contains accurate values -- document level', () => {
      const title = documentLevelArticle.config.title
      const blockText = toPlainText(
        documentLevelArticle.config.nestedArrayField
      )

      expect(objectField?.innerHTML).toContain(title)
      expect(objectField?.innerHTML).toContain(blockText)
    })

    test('Nested object in an object contains accurate values -- document level', () => {
      const nestedObject = findByClass(objectField!.children, 'objectAsField')!
        .children[0]
      const title = documentLevelArticle.config.objectAsField.title
      const blockText = toPlainText(
        documentLevelArticle.config.objectAsField.content
      )

      expect(nestedObject.innerHTML).toContain(title)
      expect(nestedObject.innerHTML).toContain(blockText)
    })
  })

  describe('Presence and accuracy of fields in vanilla deserialization -- arrays', () => {
    const arrayField = findByClass(docTree.children, 'content')

    test('Array contains all serializable blocks with keys, in order -- document level', () => {
      const origKeys = documentLevelArticle.content.map(
        (block: Block) => block._key
      )
      const serializedKeys = Array.from(arrayField!.children).map(
        block => block.id
      )
      expect(serializedKeys).toEqual(origKeys)
    })

    test('Array contains top-level block text -- document level', () => {
      const blockText = toPlainText(documentLevelArticle.content).trim()
      const blockStrings = blockText.split('\n\n')
      blockStrings.forEach((substring: string) =>
        expect(arrayField?.innerHTML).toContain(substring)
      )
    })

    test('Object in array contains all serializable fields -- document level', () => {
      const objectInArray = findByClass(arrayField!.children, 'objectField')
      const fieldNames = getValidFields(
        documentLevelArticle.content.find(
          (block: Record<string, any>) => block._type === 'objectField'
        )
      )
      const foundFieldNames = Array.from(objectInArray!.children).map(
        child => child.className
      )
      expect(foundFieldNames.sort()).toEqual(fieldNames.sort())
    })

    test('Object in array contains accurate values in nested object -- document level', () => {
      const objectInArray = findByClass(arrayField!.children, 'objectField')
      const nestedObject = findByClass(objectInArray!.children, 'objectAsField')
      const title = documentLevelArticle.content.find(
        (block: Record<string, any>) => block._type === 'objectField'
      ).objectAsField.title
      const blockText = toPlainText(
        documentLevelArticle.content.find(
          (block: Record<string, any>) => block._type === 'objectField'
        ).objectAsField.content
      ).trim()
      expect(nestedObject?.innerHTML).toContain(title)
      expect(nestedObject?.innerHTML).toContain(blockText)
    })
  })
})

/*
 * FIELD LEVEL
 */

describe('Field-level serialization', () => {
  const serialized = getSerialized(fieldLevelArticle, 'field')
  const docTree = getHTMLNode(serialized).body.children[0]

  test('String and text types get serialized correctly at top-level -- field level', () => {
    const titleObj = findByClass(docTree.children, 'title')
    const HTMLString = findByClass(titleObj!.children, 'en')
    const snippetObj = findByClass(docTree.children, 'snippet')
    const HTMLText = findByClass(snippetObj!.children, 'en')
    expect(HTMLString?.innerHTML).toEqual(fieldLevelArticle.title.en)
    expect(HTMLText?.innerHTML).toEqual(fieldLevelArticle.snippet.en)
  })

  describe('Presence and accuracy of fields in "vanilla" deserialization -- objects', () => {
    const getFieldLevelObjectField = () => {
      const serialized = getSerialized(fieldLevelArticle, 'field')
      //parent node is always div with classname of field -- get its children
      const docTree = getHTMLNode(serialized).body.children[0]
      const config = findByClass(docTree.children, 'config')
      //return english field
      const englishConfig = findByClass(config!.children, 'en')
      return findByClass(englishConfig!.children, 'objectField')
    }

    const objectField = getFieldLevelObjectField()

    test('Top-level nested objects contain all serializable fields -- field level', () => {
      const fieldNames = getValidFields(fieldLevelArticle.config.en)
      const foundFieldNames = Array.from(objectField!.children).map(
        child => child.className
      )

      expect(foundFieldNames.sort()).toEqual(fieldNames.sort())
    })

    test('Nested object in object contains all serializable fields -- field Level', () => {
      const nestedObject = findByClass(objectField!.children, 'objectAsField')!
        .children[0]
      const fieldNames = getValidFields(
        fieldLevelArticle.config.en.objectAsField
      )
      const foundFieldNames = Array.from(nestedObject!.children).map(
        child => child.className
      )
      expect(foundFieldNames.sort()).toEqual(fieldNames.sort())
    })

    test('Nested object contains accurate values -- field level', () => {
      const title = fieldLevelArticle.config.en.title
      const blockText = toPlainText(
        fieldLevelArticle.config.en.nestedArrayField
      )

      expect(objectField?.innerHTML).toContain(title)
      expect(objectField?.innerHTML).toContain(blockText)
    })

    test('Nested object in an object contains accurate values -- field level', () => {
      const nestedObject = findByClass(objectField!.children, 'objectAsField')!
        .children[0]
      const title = fieldLevelArticle.config.en.objectAsField.title
      const blockText = toPlainText(
        fieldLevelArticle.config.en.objectAsField.content
      )

      expect(nestedObject.innerHTML).toContain(title)
      expect(nestedObject.innerHTML).toContain(blockText)
    })
  })

  /*
   * Presence and accuracy of fields in "vanilla" deserialization -- arrays
   */
  describe('Presence and accurancy of fields in "vanilla" deserialization -- arrays', () => {
    const getFieldLevelArrayField = () => {
      const serialized = getSerialized(fieldLevelArticle, 'field')
      const docTree = getHTMLNode(serialized).body.children[0]
      const content = findByClass(docTree.children, 'content')
      return findByClass(content!.children, 'en')
    }
    const arrayField = getFieldLevelArrayField()

    test('Array contains all serializable blocks with keys, in order -- field level', () => {
      const origKeys = fieldLevelArticle.content.en.map(
        (block: Block) => block._key
      )
      const serializedKeys = Array.from(arrayField!.children).map(
        block => block.id
      )
      expect(serializedKeys).toEqual(origKeys)
    })

    test('Array contains top-level block text -- field level', () => {
      const blockText = toPlainText(fieldLevelArticle.content.en).trim()
      expect(arrayField?.innerHTML).toContain(blockText)
    })

    test('Object in array contains all serializable fields -- field level', () => {
      const objectInArray = findByClass(arrayField!.children, 'objectField')
      const fieldNames = getValidFields(
        fieldLevelArticle.content.en.find(
          (block: Record<string, any>) => block._type === 'objectField'
        )
      )
      const foundFieldNames = Array.from(objectInArray!.children).map(
        child => child.className
      )
      expect(foundFieldNames.sort()).toEqual(fieldNames.sort())
    })

    test('Object in array contains accurate values in nested object -- field level', () => {
      const objectInArray = findByClass(arrayField!.children, 'objectField')
      const nestedObject = findByClass(objectInArray!.children, 'objectAsField')
      const title = fieldLevelArticle.content.en.find(
        (block: Record<string, any>) => block._type === 'objectField'
      ).objectAsField.title
      const blockText = toPlainText(
        fieldLevelArticle.content.en.find(
          (block: Record<string, any>) => block._type === 'objectField'
        ).objectAsField.content
      ).trim()
      expect(nestedObject?.innerHTML).toContain(title)
      expect(nestedObject?.innerHTML).toContain(blockText)
    })
  })

  test('Nested locale fields make it to serialization, but only base lang', () => {
    const nestedLocales = { ...fieldLevelArticle, ...nestedLanguageFields }
    const serialized = getSerialized(nestedLocales, 'field')
    const docTree = getHTMLNode(serialized).body.children[0]
    const slices = findByClass(docTree.children, 'slices')
    const pageFields = findByClass(docTree.children, 'pageFields')
    expect(slices?.innerHTML).toContain(
      nestedLanguageFields.slices[0].en[0].children[0].text
    )
    expect(pageFields?.innerHTML).toContain(
      nestedLanguageFields.pageFields.name.en
    )
    expect(slices?.innerHTML).not.toContain(
      nestedLanguageFields.slices[0].fr_FR[0].children[0].text
    )
    expect(pageFields?.innerHTML).not.toContain(
      nestedLanguageFields.pageFields.name.fr_FR
    )
  })
})

test('Values in a field are not repeated, (indicating serializers are stateless)', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized).body.children[0]
  const HTMLList = findByClass(docTree.children, 'tags')
  const tags = documentLevelArticle.tags
  expect(HTMLList?.innerHTML).toContain(tags[0])
  expect(HTMLList?.innerHTML).toContain(tags[1])
  expect(HTMLList?.innerHTML).toContain(tags[2])
})

/*
 * CUSTOM SETTINGS
 */

test('Custom serialization should manifest at all levels', () => {
  const serialized = BaseDocumentSerializer.serializeDocument(
    documentLevelArticle,
    'document',
    'en',
    defaultStopTypes,
    addedCustomSerializers
  )
  const docTree = getHTMLNode(serialized).body.children[0]

  const topLevelCustomSerialized = findByClass(docTree.children, 'config')
  const requiredTopLevelTitle = documentLevelArticle.config.title
  expect(topLevelCustomSerialized?.innerHTML).toContain(
    createCustomInnerHTML(requiredTopLevelTitle)
  )

  const arrayField = findByClass(docTree.children, 'content')
  const nestedSerialized = findByClass(arrayField!.children, 'objectField')
  const requiredNestedTitle = documentLevelArticle.content.find(
    (b: Record<string, any>) => b._type === 'objectField'
  ).title
  expect(nestedSerialized?.innerHTML).toContain(
    createCustomInnerHTML(requiredNestedTitle)
  )
})

test('Fields marked "localize: false" should not be serialized', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized).body.children[0]
  //"meta" is localize: false field
  const meta = findByClass(docTree.children, 'meta')
  expect(documentLevelArticle.meta).toBeDefined()
  expect(meta).toBeUndefined()
})

test('Expect default stop types to be absent', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized).body.children[0]
  //"hidden" is boolean field
  const hidden = findByClass(docTree.children, 'hidden')
  expect(documentLevelArticle.hidden).toBeDefined()
  expect(hidden).toBeUndefined()
})

test('Expect custom stop types to be absent at all levels', () => {
  const customStopTypes = [...defaultStopTypes, 'objectField']
  const serialized = BaseDocumentSerializer.serializeDocument(
    documentLevelArticle,
    'document',
    'en',
    customStopTypes,
    customSerializers
  )

  const docTree = getHTMLNode(serialized).body.children[0]
  const config = findByClass(docTree.children, 'config')
  expect(documentLevelArticle.config).toBeDefined()
  expect(config).toBeUndefined()

  const arrayField = findByClass(docTree.children, 'content')
  const nestedSerialized = findByClass(arrayField!.children, 'objectField')
  const nestedObjField = documentLevelArticle.content.find(
    (b: Record<string, any>) => b._type === 'objectField'
  )
  expect(nestedObjField).toBeDefined()
  expect(nestedSerialized).toBeUndefined()
})

/*
 * ANNOTATION AND INLINE BLOCK CONTENT
 */

test('Unhandled inline objects and annotations should not hinder translation flows', () => {
  //unhandled will throw a warn -- ignore it in this case
  jest.spyOn(console, 'warn').mockImplementation(() => {})

  const inlineDocument = {
    ...documentLevelArticle,
    ...annotationAndInlineBlocks,
  }
  const serialized = getSerialized(inlineDocument, 'document')
  //expect annotations to be ignored
  expect(serialized.content).not.toContain('annotation')

  //expect unhandled inline objects to be present but empty
  const docTree = getHTMLNode(serialized).body.children[0]
  const arrayField = findByClass(docTree.children, 'content')
  const inlineObject = findByClass(arrayField!.children, 'childObjectField')
  expect(inlineObject?.innerHTML.length).toEqual(0)
})

test('Handled inline objects should be accurately represented per serializer', () => {
  const inlineDocument = {
    ...documentLevelArticle,
    ...annotationAndInlineBlocks,
  }

  const serialized = BaseDocumentSerializer.serializeDocument(
    inlineDocument,
    'document',
    'en',
    defaultStopTypes,
    addedCustomSerializers
  )
  const docTree = getHTMLNode(serialized).body.children[0]
  const arrayField = findByClass(docTree.children, 'content')
  let inlineObject: Element | null = null
  let inlineObjectBlock: Record<string, any> | null = null

  Array.from(arrayField!.children).forEach((block: any) => {
    if (!inlineObject) {
      inlineObject =
        findByClass(block.children, 'childObjectField') ?? inlineObject
    }
  })

  inlineDocument.content.forEach((block: Record<string, any>) => {
    if (block.children) {
      block.children.forEach((span: Record<string, any>) => {
        if (span._type === 'childObjectField') {
          inlineObjectBlock = span
        }
      })
    }
  })

  expect(inlineObject!.innerHTML).toContain(
    createCustomInnerHTML(inlineObjectBlock!.title)
  )
})

test('Handled annotations should be accurately represented per serializer', () => {
  const inlineDocument = {
    ...documentLevelArticle,
    ...annotationAndInlineBlocks,
  }

  const serialized = BaseDocumentSerializer.serializeDocument(
    inlineDocument,
    'document',
    'en',
    defaultStopTypes,
    addedCustomSerializers
  )
  const docTree = getHTMLNode(serialized).body.children[0]
  const arrayField = findByClass(docTree.children, 'content')
  let annotation: Element | null = null
  let annotationBlock: Record<string, any> | null = null

  Array.from(arrayField!.children).forEach((block: any) => {
    if (!annotation) {
      annotation = findByClass(block.children, 'annotation') ?? annotation
    }
  })

  inlineDocument.content.forEach((block: Block) => {
    if (block.children) {
      block.children.forEach((span: Record<string, any>) => {
        if (span.marks && span.marks.length) {
          annotationBlock = span
        }
      })
    }
  })

  expect(annotation!.innerHTML).toEqual(annotationBlock!.text)
})

/*
 * STYLE TAGS
 */
test('Serialized content should preserve style tags from Portable Text', () => {
  const serialized = getSerialized(documentLevelArticle, 'document')
  const docTree = getHTMLNode(serialized).body.children[0]
  const arrayField = findByClass(docTree.children, 'content')
  const blockH1 = documentLevelArticle.content.find(
    (block: Block) => block.style === 'h1'
  )
  const serializedH1 = arrayField?.querySelector('h1')
  const blockH2 = documentLevelArticle.content.find(
    (block: Block) => block.style === 'h2'
  )
  const serializedH2 = arrayField?.querySelector('h2')
  //TODO: test blockquote
  expect(serializedH1).toBeDefined()
  expect(serializedH2).toBeDefined()
  expect(serializedH1?.innerHTML).toEqual(blockH1.children[0].text)
  expect(serializedH2?.innerHTML).toEqual(blockH2.children[0].text)
})
