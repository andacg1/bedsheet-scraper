const axios = require( 'axios' )

async function scrape(...urls) {
    
    const results = await Promise.all(
        urls.map( async url => await axios.get( url )
                                          .then( resp => {
                                              console.log( resp.data )
            
                                              resp.data.variants.forEach( variant => {
                                                  const price = new Intl.NumberFormat( 'en-US', { style: 'currency', currency: 'USD' } ).format( variant.price / 100 )
                                                  console.log( `${variant.name}: ${price}` )
                                              } )
            
                                              return resp.data
                                          } ) ),
    )
    
}

(async () => {
    
    await scrape(
        'https://www.brooklinen.com/products/classic-hardcore-sheet-bundle.js',
        'https://www.brooklinen.com/products/classic-core-sheet-set.js',
        'https://buffy-zero.myshopify.com/products/eucalyptus-sheets.js',
        'https://sheetsgiggles.com/products/eucalyptus-lyocell-sheet-sets.js',
        'https://www.ettitude.com/products/bamboo-lyocell-sheet-set.js',
        'https://sijohome.com/products/eucalyptus-sheets.js',
    )
    
})()
