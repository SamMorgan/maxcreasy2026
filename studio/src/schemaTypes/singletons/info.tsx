import {DocumentTextIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const info = defineType({
  name: 'info',
  title: 'Info',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {name: 'english', title: 'English', default: true},
    {name: 'norwegian', title: 'Norwegian'},
  ],
  fields: [
    defineField({
      name: 'contact',
      title: 'Contact (EN)',
      type: 'blockContentTextOnly',
      group: 'english',
    }),
    defineField({
      name: 'bio',
      title: 'Bio (EN)',
      type: 'blockContentTextOnly',
      group: 'english',
    }),
    defineField({
      name: 'contactNO',
      title: 'Contact (NO)',
      type: 'blockContentTextOnly',
      group: 'norwegian',
    }),
    defineField({
      name: 'bioNO',
      title: 'Bio (NO)',
      type: 'blockContentTextOnly',
      group: 'norwegian',
    }),
    defineField({
      name: 'clientList',
      title: 'Client List',
      type: 'blockContentTextOnly',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Info',
      }
    },
  },
})
