import Schema from "@sanity/schema"

const types =  [
  {
    name: 'arrayField',
    title: 'Array Field',
    type: 'array',
    of: [{ type: 'block' }, { type: 'objectField' }],
  },
  objectField(),
  childObjectField(),
  documentLevelArticle(),
  fieldLevelArticle(),
]

module.exports = Schema.compile({
  name: 'test',
  types
})

function childObjectField() {
  return {
    name: 'childObjectField',
    title: 'Child Object Field',
    type: 'object',
    fields: [
      {
        name: 'title',
        title: 'Title',
        type: 'string',
      },
      {
        name: 'content',
        title: 'Content',
        type: 'array',
        of: [{ type: 'block' }],
      },
    ],
  }
}

function objectField() {
  return {
    name: 'objectField',
    title: 'Object Field',
    type: 'object',
    fields: [
      {
        name: 'title',
        title: 'Title',
        type: 'string',
      },
      {
        name: 'objectAsField',
        title: 'Object As Field',
        type: 'childObjectField',
      },
      {
        name: 'nestedArrayField',
        title: 'Nested Array Field',
        type: 'array',
        of: [{ type: 'block' }, { type: 'childObjectField' }],
      },
    ],
  }
}

function documentLevelArticle() {
  return {
    name: 'documentLevelArticle',
    title: 'Document Level Article',
    type: 'document',
    fields: [
      {
        name: 'title',
        title: 'Title',
        type: 'string',
      },
      {
        name: 'meta',
        title: 'Meta',
        type: 'string',
        localize: false
      },
      {
        name: 'snippet',
        title: 'Snippet',
        type: 'text',
      },
      {
        name: 'tags',
        title: 'Tags',
        type: 'array',
        of: [{ type: 'string' }],
      },
      {
        name: 'hidden',
        title: 'Hidden',
        type: 'boolean',
      },
      {
        name: 'config',
        title: 'Config',
        type: 'objectField',
      },
      {
        name: 'content',
        title: 'Content',
        type: 'arrayField',
      },
    ],
  }
}

type FieldDefinition = Record<string,any>

function createLocaleFields(locales: string[], fieldType:FieldDefinition) {
  return locales.map(locale => ({
    ...{name: locale},
    ...fieldType
  }))
}

function fieldLevelArticle() {
  return {
    name: 'fieldLevelArticle',
    title: 'Field Level Article',
    type: 'document',
    fields: [
      {
        name: 'title',
        title: 'Title',
        type: 'object',
        fields: createLocaleFields(['en', 'fr', 'de'], {type: 'string'})
      },
      {
        name: 'meta',
        title: 'Meta',
        type: 'string',
        localize: false
      },
      {
        name: 'snippet',
        title: 'Snippet',
        type: 'object',
        fields: createLocaleFields(['en', 'fr', 'de'], {type: 'text'})
      },
      {
        name: 'tags',
        title: 'Tags',
        type: 'object',
        fields: createLocaleFields(['en', 'fr', 'de'], {type: 'array', of: [{type: 'string'}]})
      },
      {
        name: 'hidden',
        title: 'Hidden',
        type: 'boolean',
      },
      {
        name: 'config',
        title: 'Config',
        type: 'object',
        fields: createLocaleFields(['en', 'fr', 'de'], {type: 'objectField'})
      },
      {
        name: 'content',
        title: 'Content',
        type: 'object',
        fields: createLocaleFields(['en', 'fr', 'de'], {type: 'arrayField'})
      },
    ],
  }
}
