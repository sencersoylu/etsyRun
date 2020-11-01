const express = require("express"),
  app = express(),
  cheerio = require("cheerio"),
  async = require("async");
const axios = require("axios");
const { parse } = require("json2csv");
const cors = require('cors');
const moment = require('moment'); // require
const https = require('https');
const fs = require('fs');
const http = require('http');
var bodyParser = require('body-parser');

var puppeteer = require('puppeteer');

// docker push soylu/etsyrun
// docker build -t soylu/etsyrun .

app.use(cors({
  origin: '*'
}));

app.use( bodyParser.json() ); 


app.get("/query/:query/:page", async (req, res) => {
  try {
    const query = req.params.query;
    const page = req.params.page;
    console.log(`${query} Start Searching Query`);

    const items = await getQueryItemsByPageAxios(query,page,req.query);
    if(items.length > 0) {

    const itemTemp = new Set(items);

    const list = await getListingApi([...itemTemp].join('%2c'));

    res.json(list);

    } else {

      res.status(404).json({
        query,page,error :"Items Not Found."
      })
    }



  } catch (error) {
    console.log(error);
  }
});

app.get("/shop/:shop/:offset/:limit", async (req, res) => {
  try {
    const shopName = req.params.shop;

    let items = await getShopsProductsApi(shopName,req.params.limit,req.params.offset);

    res.json(items);

  } catch (error) {
    console.log(error);
  }
  finally{

    console.log(`Finished Searching Shop`);

  }
});

app.get("/product/:id", async (req, response) => {
  try {

    let product = await getProductAxios(req.params.id);

    console.log(product);
    //await browser.close();
    //response.set("Content-Type", "image/png");
    response.json(product);
  } catch (error) {
    console.log(error);
  }
});

app.post("/products", async (req, res) => {
  try {
    const productIds = req.body.products;

    let products = await async.mapLimit(productIds, 5, async (item, callback) => {
      let title = await getProductAxios(item);
      callback(null,title);
    },(err,items) => {
      if(!err) {
        res.json(items);
      }
      else {
        res.json(err);
      }
  
    });




  } catch (error) {
    console.log(error);
  }
});


const getShopPageCountAxios = async (shopName) => {
  return new Promise(async (resolve, reject) => {
    axios
      .get(`https://www.etsy.com/shop/${shopName}`, { withCredentials: true })
      .then(
        async (response) => {
          if (response.status === 200) {
            const html = response.data;
            let $ = await cheerio.load(html);

            const list = $(".text-center > div.wt-show-xl ")
              .find("li span")
              .toArray()
              .map((element) => $(element).text().trim());

            resolve(list[list.length - 3] || 1);
          }
        },
        (error) => {
          console.log(error);
          reject(error);
        }
      ); // Read url query parameter.
  });
};



const getQueryPageCountAxios = async (query) => {
  return new Promise(async (resolve, reject) => {
    axios
      .get(`https://www.etsy.com/search?q=${query}&ref=pagination&page=1`, { withCredentials: true })
      .then(
        async (response) => {
          if (response.status === 200) {
            const html = response.data;
            let $ = await cheerio.load(html);

            const list = $(".wt-action-group.wt-list-inline")
              .find("li span")
              .toArray()
              .map((element) => $(element).text().trim());

            resolve(list[list.length - 3] || 1);
          }
        },
        (error) => {
          console.log(error);
          reject(error);
        }
      ); // Read url query parameter.
  });
};

const getProductAxios = async (item) => {
  return new Promise(async (resolve, reject) => {
    axios
      .get(`https://www.etsy.com/listing/${item}`, { withCredentials: true })
      .then(
        async (response) => {
          if (response.status === 200) {
            const html = response.data.replace(/&quot;/gm,"'");
            const $ = await cheerio.load(html , {xmlMode: true});

            let itemDescription = $(
              "#wt-content-toggle-product-details-read-more > p"
            )
              .text()
              .trim();

              let review = $(
                "#same-listing-reviews-tab>span"
              )
                .text()
                .trim();

              let date = $(
                  "#content > div.content-wrap.listing-page-content > div.wt-body-max-width.wt-mb-xs-6.wt-pl-md-4.wt-pr-md-4.wt-pl-lg-5.wt-pr-lg-5 > div.wt-display-flex-xs.wt-justify-content-space-between.wt-align-items-baseline.wt-flex-direction-row-xs.wt-mb-md-4 > div.wt-display-flex-xs.wt-align-items-baseline.wt-flex-direction-row-xs > div.wt-pr-xs-2"
                )
                  .text()
                  .replace("Listed on", "")
                  .trim();
              let listedDate = moment(date).format("DD/MM/YYYY")


            let itemTitle = $(
              "#listing-page-cart > div.wt-mb-lg-0.wt-mb-xs-6 > div.wt-mb-xs-2 > div > h1"
            )
              .text()
              .trim();

             
            let items = $('script');
            
            const itemObj = items.toArray().filter(x=> x.attribs.type == "application/ld+json").map(x=>{
              return JSON.parse(x.children[0].data.trim())
            })

            const category = itemObj[0].category.split("<").map(s => s.trim());

           
            let image = $("img.carousel-image").first().attr('src').replace("794xN","85x85");

            let itemFavorite = $(
              "#content > div.content-wrap.listing-page-content > div.wt-body-max-width.wt-mb-xs-6.wt-pl-md-4.wt-pr-md-4.wt-pl-lg-5.wt-pr-lg-5 > div.wt-display-flex-xs.wt-justify-content-space-between.wt-align-items-baseline.wt-flex-direction-row-xs.wt-mb-md-4 > div.wt-display-flex-xs.wt-align-items-baseline.wt-flex-direction-row-xs > div:nth-child(2) > a"
            )
              .text()
              .trim();

            const tags_1 = $("#wt-content-toggle-tags-read-more li a[href*='seller'],#wt-content-toggle-tags-read-more li a")
              .toArray()
              .map((element) => $(element).text().trim()).filter(x => !category.includes(x))

            const tags_2 = $(
              "#content > div.content-wrap.listing-page-content > div.wt-body-max-width.wt-mb-xs-6.wt-pl-md-4.wt-pr-md-4.wt-pl-lg-5.wt-pr-lg-5 > div> div > div.tags-section-container.tag-cards-section-container-with-images > ul > li > a"
            )
              .toArray()
              .map((element) => $(element).text().trim()).filter(x => !category.includes(x));

            let price = $("[data-buy-box-region='price'] p:first-child")
              .text()
              .replace("Price:", "")
              .replace("Low in stock", "")
              .trim();

            let shippingPrice = $('[data-estimated-shipping] p').first()
            .text()
              .trim();

            const tags = new Set(tags_2.concat(tags_1));

            const url = response.config.url;

            let product = {
              itemID :item,
              title: itemTitle,
              tags: [...tags],
              price: price,
              shippingPrice:shippingPrice,
              itemFavorite: itemFavorite,
              itemDescription: itemDescription,
              review:review,
              listedDate:listedDate,
              link: url,
              categories: category,
              image:image
              
            };


            resolve(product);
          }
        },
        (error) => {console.log(error)}
      ); // Read url query parameter.
  });
};

const getItemsByPageAxios = async (shopName, pageID) => {
  return new Promise(async (resolve, reject) => {
    axios
      .get(`https://www.etsy.com/shop/${shopName}?page=${pageID}#items`, {
        withCredentials: true,
      })
      .then(
        async (response) => {
          if (response.status === 200) {
            const html = response.data;
            let $ = await cheerio.load(html);

            let items = $(".listing-link")
              .toArray()
              .map((element) => $(element).attr("data-listing-id"));

            resolve(items);
          }
        },
        (error) => console.log(err)
      ); // Read url query parameter.
  });
};

const getQueryItemsByPageAxios = async (query, pageID, reqQuery) => {
  return new Promise(async (resolve, reject) => {

    try {
    axios
    .get(`https://p7vlfxaizf.execute-api.us-east-1.amazonaws.com/dev/getQuery/${query}/${pageID}`, {
      withCredentials: true,
    }) .then(
        async (response) => {

          if (response.status === 200) {
            const items = response.data.items;
            resolve(items);
          }
        })

           
          } catch (error) {

            console.log(error);

          }
        
        
  });
};


const getShopsProductsApi = async (shop, limit,offset) => {
  return new Promise(async (resolve, reject) => {
    axios
      .get(`https://openapi.etsy.com/v2/shops/${shop}/listings/active?limit=${limit}&offset=${offset}&includes=Images,ShippingInfo,Section&api_key=nzhq948351d7qj8ywy1oqrsj`, {
        withCredentials: true,
      })
      .then(
        async (response) => {
          if (response.status === 200) {
            resolve(response.data);
          }
        },
        (error) => reject(error)
      ); // Read url query parameter.
  });
};

const getListingApi = async (listing) => {
  return new Promise(async (resolve, reject) => {
    axios
      .get(`https://openapi.etsy.com/v2/listings/${listing}?includes=Images,ShippingInfo,Section,Shop&api_key=nzhq948351d7qj8ywy1oqrsj`, {
        withCredentials: true,
      })
      .then(
        async (response) => {
          if (response.status === 200) {
            resolve(response.data);
          }
        },
        (error) => reject(error)
      ); // Read url query parameter.
  });
};


const privateKey = fs.readFileSync('/etc/letsencrypt/live/api.soylubilgisayar.net/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/api.soylubilgisayar.net/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/api.soylubilgisayar.net/chain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(4001, () => {
	console.log('HTTP Server running on port 4001');
});

httpsServer.listen(4000, () => {
	console.log('HTTPS Server running on port 4000');
});