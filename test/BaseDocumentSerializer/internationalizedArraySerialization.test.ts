import {getSerialized} from '../helpers'
import {internationalizedArrayArticle} from './utils'

const serialized = getSerialized(internationalizedArrayArticle, 'internationalizedArray')

test('Global test of working internationalized array-level functionality and snapshot match', () => {
  expect(serialized).toMatchSnapshot()
})
