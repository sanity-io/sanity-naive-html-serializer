const types = {
  arrayField: arrayField(),
  // objectField: objectField(),
  document: document(),
}

const arrayField = () => {
  return {
    name: 'arrayField',
    title: 'Array Field',
    type: 'array',
    of: [{ type: 'block' }, { type: 'objectField' }],
  }
}
