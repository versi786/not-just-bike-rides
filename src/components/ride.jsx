import * as React from "react"
import { InstagramEmbed } from 'react-social-media-embed';
import { jsx, Heading } from "theme-ui"
import { Paragraph, Text } from 'theme-ui'

function Ride({  instagramUrl, routeUrl, className}) {
    // TODO: why does a paragraph/link in jsx not match style of markdown paragraph?
  return (
  <>
    <h3>Route: <a href={routeUrl}>{routeUrl}</a></h3>

    <div style={{ display: 'flex', justifyContent: 'center' }}>
        <InstagramEmbed url={instagramUrl} caption width={500} />
    </div>
  </>
  )
}

export default Ride
