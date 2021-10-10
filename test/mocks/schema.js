const types = {
  arrayField: arrayField(),
  objectField: objectField(),
  childObjectField: childObjectField(),
  documentLevelArticle: documentLevelArticle(),
  fieldLevelArticle: fieldLevelArticle(),
}

module.exports = {
  name: 'blog',
  get: (typeName) => types[typeName],
  _original: {
    types: types
  }
}

const LANGUAGES = ['en', 'fr', 'de']

function arrayField() {
  return {
    name: 'arrayField',
    title: 'Array Field',
    type: 'array',
    of: [{ type: 'block' }, { type: 'objectField' }],
  }
}

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
    name: 'article',
    title: 'Article',
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
        socalize: false
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

function createLocaleFields(locales, fieldType) {
  return locales.map(locale => ({
    ...{name: locale},
    ...fieldType
  }))
}

function fieldLevelArticle() {
  return {
    name: 'article',
    title: 'Article',
    type: 'document',
    fields: [
      {
        name: 'title',
        title: 'Title',
        type: 'object',
        fields: [
          createLocaleFields(LANGUAGES, {type: 'string'})
        ]
      },
      {
        name: 'meta',
        title: 'Meta',
        type: 'string',
      },
      {
        name: 'snippet',
        title: 'Snippet',
        type: 'object',
        fields: [
          createLocaleFields(LANGUAGES, {type: 'text'})
        ]
      },
      {
        name: 'tags',
        title: 'Tags',
        type: 'object',
        fields: [
          createLocaleFields(LANGUAGES, {type: 'array', of: [{type: 'string'}]})
        ]
      },
      {
        name: 'hidden',
        title: 'Hidden',
        type: 'boolean',
      },
      {
        name: 'config',
        title: 'Config',
        createLocaleFields(LANGUAGES, {type: 'objectField'})
      },
      {
        name: 'content',
        title: 'Content',
        createLocaleFields(LANGUAGES, {type: 'arrayField'})
      },
    ],
  }
}
