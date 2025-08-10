import * as React from "react"
import { InstagramEmbed } from 'react-social-media-embed';
import { jsx, Heading } from "theme-ui"
import { Paragraph, Text } from 'theme-ui'
import { Themed } from '@theme-ui/mdx'

function Ride({  instagramUrl, routeUrl, routeGpx,className}) {
  return (
  <>
    <Themed.p>
        GPX: <Themed.a href={`/gpx/${routeGpx}`}>download</Themed.a>
        <br />
        Route: <Themed.a href={routeUrl}>Strava</Themed.a>
    </Themed.p>

    <Themed.p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
          <InstagramEmbed url={instagramUrl} caption width={500} />
      </div>
    </Themed.p>

  </>
  )
}

export default Ride
