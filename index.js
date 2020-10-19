const express = require("express"),
  app = express(),
  cheerio = require("cheerio"),
  async = require("async");
const axios = require("axios");
const { parse } = require("json2csv");
const cors = require('cors');
const moment = require('moment'); // require


// docker push soylu/etsyrun
// docker build -t soylu/etsyrun .

app.use(cors({
  origin: '*'
}));

app.get("/query/:query/:page", async (req, res) => {
  try {
    const query = req.params.query;
    console.log(`${query} Start Searching Query`);

    let getPageCount = await getQueryPageCountAxios(query);

    console.log(getPageCount);

    const shopPageCount = getPageCount > 5 ? 5 : getPageCount;

    async.timesLimit(
      shopPageCount,
      1,
      async function (n, x) {
        const items = await getQueryItemsByPageAxios(query, n + 1);
        return items;
      },
      async function (err, items) {
        let arr = await items.flat();

        let products = await async.mapLimit(arr, 5, async (item, callback) => {
          let title = await getProductAxios(item);
          return title;
        });


        res.json(products);

        // var fields = [
        //   "title",
        //   "tags",
        //   "price",
        //   "itemFavorite",
        //   "itemDescription",
        //   "link",
        // ];

        // const opts = {
        //   fields,
        // };

        // try {
        //   const csv = parse(products, opts);
        //   console.log(query , " Finished");
        //   res.attachment("data.csv");
        //   res.end(csv);
        // } catch (err) {
        //   console.error(err);
        //   res.statusCode = 500;

        //   return res.end(err.message);
        // }

        //await browser.close();
        //response.set("Content-Type", "image/png");
      }
    );
  } catch (error) {
    console.log(error);
  }
});

app.get("/shop/:shop/:page", async (req, res) => {
  try {
    const shopName = req.params.shop;

    console.log(`${shopName} Start Searching Shop`);


    let getPageCount = await getShopPageCountAxios(shopName);

    console.log(getPageCount);

    const shopPageCount = getPageCount > 5 ? 5 : getPageCount;

    async.timesLimit(
      shopPageCount,
      1,
      async function (n, x) {
        const items = await getItemsByPageAxios(shopName, n + 1);
        return items;
      },
      async function (err, items) {
        let arr = await items.flat();


        let products = await async.mapLimit(arr, 10, async (item, callback) => {
          let title = await getProductAxios(item);
          return title;
        });


        res.json(products);

      }
    );
  } catch (error) {
    console.log(error);
  }
  finally{

    console.log(`Finished Searching Shop`);



  }
});

app.get("/product/:id", async (req, response) => {
  try {

    let product = await getProductAxios(req.params.id, browser);

    console.log(product);
    //await browser.close();
    //response.set("Content-Type", "image/png");
    response.json(product);
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
            console.log(html)
            const html = response.data;
            const $ = await cheerio.load(html);

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

           
            let image = $("img.carousel-image").first().attr('src');

            let itemFavorite = $(
              "#content > div.content-wrap.listing-page-content > div.wt-body-max-width.wt-mb-xs-6.wt-pl-md-4.wt-pr-md-4.wt-pl-lg-5.wt-pr-lg-5 > div.wt-display-flex-xs.wt-justify-content-space-between.wt-align-items-baseline.wt-flex-direction-row-xs.wt-mb-md-4 > div.wt-display-flex-xs.wt-align-items-baseline.wt-flex-direction-row-xs > div:nth-child(2) > a"
            )
              .text()
              .trim();

            const tags_1 = $("#wt-content-toggle-tags-read-more li a")
              .toArray()
              .map((element) => $(element).text().trim());

            const tags_2 = $(
              "#content > div.content-wrap.listing-page-content > div.wt-body-max-width.wt-mb-xs-6.wt-pl-md-4.wt-pr-md-4.wt-pl-lg-5.wt-pr-lg-5 > div> div > div.tags-section-container.tag-cards-section-container-with-images > ul > li > a"
            )
              .toArray()
              .map((element) => $(element).text().trim());

            let price = $("[data-buy-box-region='price'] p:first-child")
              .text()
              .replace("Price:", "")
              .replace("Low in stock", "")
              .trim();

            let shippingPrice = $('[data-estimated-shipping] p').first()
            .text()
            .trim();

            const tags = new Set(tags_1.concat(tags_2));

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

const getQueryItemsByPageAxios = async (query, pageID) => {
  return new Promise(async (resolve, reject) => {
    axios
      .get(`https://www.etsy.com/search?q=${query}&ref=pagination&page=${pageID}`, {
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

var listener = app.listen(400, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
