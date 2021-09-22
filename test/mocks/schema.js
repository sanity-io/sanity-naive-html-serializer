const types = {
  arrayField: arrayField(),
  objectField: objectField(),
  childObjectField: childObjectField(),
  documentLevelArticle: documentLevelArticle(),
}

const arrayField = () => {
  return {
    name: 'arrayField',
    title: 'Array Field',
    type: 'array',
    of: [{ type: 'block' }, { type: 'objectField' }],
  }
}

const childObjectField = () => {
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

const objectField = () => {
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

const documentLevelArticle = () => {
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
