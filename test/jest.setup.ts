import {PortableTextBlock, PortableTextChild} from 'sanity'

let mockTestKey = 0

jest.mock('@sanity/block-tools', () => {
  const originalModule = jest.requireActual('@sanity/block-tools')
  return {
    ...originalModule,
    //not ideal but jest.mock('@sanity/block-tools/src/util/randomKey.ts' is not working
    htmlToBlocks: (html: string, blockContentType: any, options: any) => {
      const blocks = originalModule.htmlToBlocks(html, blockContentType, options)
      const newBlocks = blocks.map((block: PortableTextBlock) => {
        const newChildren = (block.children as PortableTextChild[]).map((child) => {
          return {...child, _key: `randomKey-${mockTestKey++}`}
        })
        return {...block, children: newChildren, _key: `randomKey-${mockTestKey++}`}
      })
      return newBlocks
    },
  }
})
