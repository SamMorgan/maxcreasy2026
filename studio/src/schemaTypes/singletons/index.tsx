import {ImagesIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
//import type {Link, Settings} from '../../../sanity.types'

//import * as demo from '../../lib/initialValues'

/**
 * Settings schema Singleton.  Singletons are single documents that are displayed not in a collection, handy for things like site settings and other global configurations.
 * Learn more: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
 */

export const index = defineType({
  name: 'index',
  title: 'Index',
  type: 'document',
  icon: ImagesIcon,
  fields: [
    defineField({
        name: 'images',
        title: 'Images',
        type: 'array',
        options: {
          layout: 'grid',
        },
        of: [
          defineArrayMember({
            type: 'image',
            fields: [
              defineField({ name: 'alt', type: 'string' }),
              defineField({ 
                name: 'caption', 
                title: 'Caption', 
                type: 'blockContentTextOnly',
                description: 'caption for the grid view',
              }),
              defineField({ 
                name: 'carouselCaption', 
                title: 'Enlarged view caption', 
                type: 'blockContentTextOnly',
                description: 'caption for the enlarged image view. Will fallback to the caption field above if empty', 
              }),
            ],
          }),
        ],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Index',
      }
    },
  },
})
