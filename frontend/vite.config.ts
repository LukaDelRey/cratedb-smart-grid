import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'

export default defineConfig({
  plugins: [
    vue({
      template: {
        transformAssetUrls
      }
    }),
    quasar()
  ],
  build:{
    rolldownOptions:{
      output:{
        codeSplitting:{
          groups:[
            {
              name:'maps',
              test:/node_modules[\\/](mapbox-gl|@deck\.gl|leaflet|@vue-leaflet)/,
              priority:30,
              maxSize:450000
            },
            {
              name:'charts',
              test:/node_modules[\\/](echarts|vue-echarts)/,
              priority:20
            },
            {
              name:'ui',
              test:/node_modules[\\/](quasar|@quasar)/,
              priority:10
            }
          ]
        }
      }
    }
  }
})
