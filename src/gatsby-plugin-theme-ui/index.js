import baseTheme from "@lekoarts/gatsby-theme-minimal-blog/src/gatsby-plugin-theme-ui/index"
import { merge } from "theme-ui"

export default merge(baseTheme, {
  section_hero: {
    display: 'none'
  },
  styles: {
    table: {
      th: {
        textAlign: null,
      },
      td: {
        textAlign: null,
      },
    },
  }
})
