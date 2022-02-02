const { chromium, webkit, firefox } = require( 'playwright' )
const axios = require( 'axios' )

/**
 * Assuming that the site is a Shopify store
 * Store can either be Shopify-hosted or headless
 *
 * Listen for network requests matching regex to extract myshopify domain, storefront API key and/or API domain
 */
async function scrape(...urls) {
    
    return await Promise.all(
        urls.map( async url => {
            const browser = await chromium.launch()
            const page = await browser.newPage()
            const apiVersion = '2022-01'
            const failed = new Set()
            
            let targetUrl = url,
                storefrontToken,
                myshopifySubdomain,
                apiDomain,
                variants
            
            // Follows redirects in case product handle is deprecated
            await axios.get( url ).then( resp => {
                targetUrl = `https://${resp.request.host}${resp.request.path}`
            } )
            
            // Subscribe to 'request' and 'response' events.
            page.on( 'request', async request => {
                if ( variants ) {
                    return variants
                }
                
                const requestUrl = request.url()
                const headers = await request.allHeaders()
                myshopifySubdomain = myshopifySubdomain || requestUrl.match( /[-_~\[\]@!$&'()*%\w\d]*(?=\.myshopify\.com)/g )?.[0]
                storefrontToken = storefrontToken || headers?.['x-shopify-storefront-access-token']
                apiDomain = apiDomain || requestUrl.match( /(?<=https:\/\/)[.-_~\[\]@!$&'()*%\w\d]*(?=\/api\/\d{4}-\d{2}\/graphql)/g )?.[0]
            } )
            
            await page.goto( url )
            
            if ( myshopifySubdomain !== null && storefrontToken ) {
                apiDomain = apiDomain || (myshopifySubdomain ? `${myshopifySubdomain}.myshopify.com` : targetUrl.split( '/' )[2])
                
                const urlSegments = targetUrl.split( '/' )
                const productHandle = urlSegments[urlSegments.length - 1]
                
                await axios.post( `https://${apiDomain}/api/${apiVersion}/graphql.json`, {
                               'operationName': 'products',
                               'query': `
                                                query products($handle: String!) {
                                                  productByHandle(handle: $handle) {
                                                    variants (first: 100) {
                                                      edges {
                                                        node {
                                                          id
                                                          priceV2 {
                                                            amount
                                                            currencyCode
                                                          }
                                                          sku
                                                          title
                                                          quantityAvailable
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                            `,
                               'variables': {
                                   'handle': productHandle,
                               },
                           }, {
                                      headers: {
                                          'x-shopify-storefront-access-token': storefrontToken,
                                          'content-type': 'application/json; charset=utf-8',
                                      },
                                  } )
                           .then( ({ data }) => {
                               const edges = data?.data?.productByHandle?.variants?.edges
                               if ( edges ) {
                                   variants = edges
                               }
                           } )
                           .catch( err => {
                               console.log( err )
                           } )
                
            } else if ( !failed.has( `${targetUrl}.js` ) ) {
                
                await axios.get( `${targetUrl}.js` )
                           .then( resp => {
                               variants = resp?.data?.variants
                           } )
                           .catch( err => {
                               failed.add( `${targetUrl}.js` )
                               //console.log(err.message)
                           } )
                
            }
            
            console.log( `${targetUrl}: `, variants )
            
            await browser.close()
        } ),
    )
}

(async () => {
    await scrape(
        'https://peteandpedro.com/products/clean-and-condition-combo-pack',
        'https://livebearded.com/products/beard-oil',
        'https://thebeardclub.com/collections/all-products/products/starter-beard-growth-kit',
        'https://www.beardbrand.com/products/utility-balm',
        'https://www.thebeardstruggle.com/products/day-liquid-tonic-beard-oil',
        'https://sijohome.com/products/eucalyptus-sheets',
        'https://sheetsgiggles.com/products/eucalyptus-lyocell-sheet-sets-white',
        'https://buffy.co/products/eucalyptus-sheets',
        'https://www.brooklinen.com/products/classic-hardcore-sheet-bundle',
        'https://www.brooklinen.com/products/classic-core-sheet-set',
        'https://www.ettitude.com/products/bamboo-lyocell-sheet-set',
    )
})()
