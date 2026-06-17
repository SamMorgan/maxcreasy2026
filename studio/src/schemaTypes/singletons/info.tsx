import {DocumentTextIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
//import type {Link, Settings} from '../../../sanity.types'

//import * as demo from '../../lib/initialValues'

/**
 * Settings schema Singleton.  Singletons are single documents that are displayed not in a collection, handy for things like site settings and other global configurations.
 * Learn more: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
 */

export const info = defineType({
  name: 'info',
  title: 'Info',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
        name: 'contact',
        title: 'Contact',
        type: 'blockContentTextOnly',
    }),
    defineField({
        name: 'bio',
        title: 'Bio',
        type: 'blockContentTextOnly',
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
