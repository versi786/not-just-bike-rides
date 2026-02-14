import * as React from "react"
import { InstagramEmbed } from 'react-social-media-embed';
import { Themed } from '@theme-ui/mdx'
import loadable from '@loadable/component'

// Replace your standard import with this:
const GpxMap = loadable(() => import("./gpxmap"), {
  fallback: <div style={{ height: '400px', background: '#f9f9f9', borderRadius: '12px' }} />
})

function Ride({ instagramUrl, routeUrl, routeGpx, className }) {
  const gpxPath = `/gpx/${routeGpx}`;

  return (
    <div className={className}>
      <Themed.p>
        GPX: <Themed.a href={gpxPath}>download</Themed.a>
        <br />
        Route: <Themed.a href={routeUrl} target="_blank" rel="noreferrer">Strava</Themed.a>
      </Themed.p>

      <Themed.p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '500px' }}>
            <GpxMap src={gpxPath} height="400px" />
          </div>
        </div>
      </Themed.p>

      {instagramUrl && (
        <Themed.p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <InstagramEmbed url={instagramUrl} caption width={500} />
          </div>
        </Themed.p>
      )}
    </div>
  )
}

export default Ride
