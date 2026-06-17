import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './src/schemaTypes'
import {structure} from './src/structure'
import {unsplashImageAsset} from 'sanity-plugin-asset-source-unsplash'
import {presentationTool, defineDocuments, defineLocations} from 'sanity/presentation'
import {assist} from '@sanity/assist'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'your-projectID'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'
const previewUrl = process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:3000'

export default defineConfig({
  name: 'default',
  title: 'Max Creasy',
  projectId,
  dataset,
  plugins: [
    presentationTool({
      previewUrl: {
        origin: previewUrl,
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
      resolve: {
        mainDocuments: defineDocuments([
          {
            route: '/',
            filter: `_type == "index" && _id == "index"`,
          },
          {
            route: '/info',
            filter: `_type == "info" && _id == "Info"`,
          },
        ]),
        locations: {
          index: defineLocations({
            locations: [{title: 'Home', href: '/'}],
          }),
          info: defineLocations({
            locations: [{title: 'Info', href: '/info'}],
          }),
          settings: defineLocations({
            locations: [{title: 'Home', href: '/'}],
            message: 'Used for site metadata on all pages',
            tone: 'caution',
          }),
        },
      },
    }),
    structureTool({structure}),
    unsplashImageAsset(),
    assist(),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
  },
})
