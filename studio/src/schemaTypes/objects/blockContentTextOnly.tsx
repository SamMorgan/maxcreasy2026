import {defineArrayMember, defineType, defineField} from 'sanity'

export const blockContentTextOnly = defineType({
  title: 'Block Content (Simple - Text Only)',
  name: 'blockContentTextOnly',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [],
      lists: [], 
      marks: {
        decorators: [],
        annotations: [
          {
            name: 'link',
            type: 'object',
            title: 'Link',
            fields: [
              defineField({
                name: 'href',
                title: 'URL',
                type: 'string',
                validation: (Rule) => Rule.required(),
              }),
              defineField({
                name: 'openInNewTab',
                title: 'Open in new tab',
                type: 'boolean',
                initialValue: false,
              }),
            ],
          },
        ],
      },
    }),
  ],
})
