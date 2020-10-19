const express = require("express"),
  app = express(),
  puppeteer = require("puppeteer"),
  cheerio = require("cheerio"),
  async = require("async");

const {
  parse
} = require("json2csv");

app.get("/shop/:shop/:page", async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });


    const shopName = req.params.shop;

    const page = req.params.page;

    let getPageCount = await getShopPageCount(shopName, browser);

    console.log(shopName, getPageCount);

    const shopPageCount = getPageCount > 5 ? 5 : getPageCount;

    async.timesLimit(
      shopPageCount,
      1,
      async function (n, x) {
          console.log(n)
          const items = await getItemsByPage(shopName, n + 1, browser);
          x(null, items);
          return items;
        },
        async function (err, items) {
          let arr = await items.flat();

          console.log(arr);

          let products = await async.mapLimit(arr, 5, async (item, callback) => {
            let title = await getProduct(item, browser);
            callback(null, title);
          });

          console.log(products);

          //res.json(products);

          var fields = [
            "title",
            "tags",
            "price",
            "itemFavorite",
            "itemDescription",
            "freeShipping",
            "bestSeller",
            "star",
            "sales",
            "url"
          ];

          const opts = {
            fields,
          };

          try {
            const csv = parse(products, opts);
            console.log(fields.length);
            console.log(csv);
            await browser.close();
            res.attachment("data.csv");
            res.end(csv);
          } catch (err) {
            console.error(err);
            res.statusCode = 500;
            await browser.close();

            return res.end(err.message);
          }

          //await browser.close();
          //response.set("Content-Type", "image/png");
        }
    );
  } catch (error) {
    console.log(error);
  }
});




app.get("/query/:query/:page", async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });


    const query = req.params.query;

    let getPageCount = await getShopPageCount(shopName, browser);

    console.log(shopName, getPageCount);



    const shopPageCount = getPageCount > 5 ? 5 : getPageCount;

    async.timesLimit(
      shopPageCount,
      1,
      async function (n, x) {
          console.log(n)
          const items = await getItemsByPage(shopName, n + 1, browser);
          x(null, items);
          return items;
        },
        async function (err, items) {
          let arr = await items.flat();

          console.log(arr);

          let products = await async.mapLimit(arr, 5, async (item, callback) => {
            let title = await getProduct(item, browser);
            callback(null, title);
          });

          console.log(products);

          //res.json(products);

          var fields = [
            "title",
            "tags",
            "price",
            "itemFavorite",
            "itemDescription",
            "freeShipping",
            "bestSeller",
            "star",
            "sales",
            "url"
          ];

          const opts = {
            fields,
          };

          try {
            const csv = parse(products, opts);
            console.log(fields.length);
            console.log(csv);
            await browser.close();
            res.attachment("data.csv");
            res.end(csv);
          } catch (err) {
            console.error(err);
            res.statusCode = 500;
            await browser.close();

            return res.end(err.message);
          }

          //await browser.close();
          //response.set("Content-Type", "image/png");
        }
    );
  } catch (error) {
    console.log(error);
  }
});

app.get("/product/:id", async (req, response) => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    let product = await getProduct(req.params.id, browser);

    //console.log(product);
    await browser.close();

    //await browser.close();
    //response.set("Content-Type", "image/png");
    response.json(product);
  } catch (error) {
    console.log(error);
  }
});

const getProduct = async (item, browser) => {
  return new Promise(async (resolve, reject) => {
    let page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', (request) => {
      if (request.resourceType() == 'image' || request.resourceType() == 'font') request.abort();
      else request.continue();
    });


    await page.goto(`https://www.etsy.com/listing/${item}`); // Read url query parameter.


    const html = await page.content();
    const $ = await cheerio.load(html);

    let itemDescription = await page.evaluate((data) => {
      return $("#wt-content-toggle-product-details-read-more > p")
        .text()
        .trim();
    });

    let itemTitle = await page.evaluate((data) => {
      return $("#listing-page-cart h1").text().trim();
    });

    let itemFavorite = await page.evaluate((data) => {
      return $(
          "#content > div.content-wrap.listing-page-content > div.wt-body-max-width.wt-mb-xs-6.wt-pl-md-4.wt-pr-md-4.wt-pl-lg-5.wt-pr-lg-5 > div.wt-display-flex-xs.wt-justify-content-space-between.wt-align-items-baseline.wt-flex-direction-row-xs.wt-mb-md-4 > div.wt-display-flex-xs.wt-align-items-baseline.wt-flex-direction-row-xs > div:nth-child(2) > a"
        )
        .text()
        .trim();
    });

    const tags = $("#wt-content-toggle-tags-read-more li a")
      .toArray()
      .map((element) => $(element).text().trim());

    let price = await page.evaluate((data) => {
      return $("[data-buy-box-region='price'] p:first-child")
        .text()
        .replace("Price:", "")
        .replace("Low in stock", "")
        .trim();
    });

    const freeShipping = await page.evaluate((data) => {
      return $(".wt-text-body-03:contains('Free')").length ? 'Free Shiping' : ""
    });

    const bestSeller = await page.evaluate((data) => {
      return $(".wt-display-inline-block:contains('Bestseller')").length ? 'Bestseller' : ""
    });

    const star = await page.evaluate((data) => {
      return $("input[name*='initial-rating']").val().trim();
    });

    const sales = await page.evaluate((data) => {
      return $(".wt-text-caption-01:contains('sales')").text().replace(" sales", "");
    });

    const url = await page.url();


    let product = {
      title: itemTitle,
      tags: tags,
      price: price,
      itemFavorite: itemFavorite,
      itemDescription: itemDescription,
      freeShipping: freeShipping,
      bestSeller: bestSeller,
      star: star,
      sales: sales,
      url: url,

    };

    await page.close();

    resolve(product);
  });
};

const getItemsByPage = async (shopName, pageID, browser) => {
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.resourceType() === 'image') request.abort();
    else request.continue();
  });

  await page.goto(
    `https://www.etsy.com/shop/${shopName}?page=${pageID}#items`, {
      waitUntil: "networkidle2",
    }
  ); // Read url query parameter.

  await page.waitForSelector(".listing-link");

  let html = await page.content();
  let $ = await cheerio.load(html);

  let items = $(".listing-link")
    .toArray()
    .map((element) => $(element).attr("data-listing-id"));

  await page.close();

  return items;
};

const getShopPageCount = async (shopName, browser) => {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.resourceType() === 'image') request.abort();
    else request.continue();
  });
  await page.goto(`https://www.etsy.com/shop/${shopName}`); // Read url query parameter.

  //await page.waitFor(1000);

  let html = await page.content();
  let $ = await cheerio.load(html);

  //console.log("sencer");
  //await page.waitForSelector(".listing-cards");
  //console.log("sencer");
  //let x = await $(".text-center > div.wt-show-xl li a span");

  const list = $(".text-center > div.wt-show-xl ")
    .find("li span")
    .toArray()
    .map((element) => $(element).text().trim());

  //console.log(list[list.length - 3]);

  return list[list.length - 3] || 1;
};

const getQueryPageCount = async (query, browser) => {
  const page = await browser.newPage();
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    if (request.resourceType() === 'image') request.abort();
    else request.continue();
  });
  await page.goto(`https://www.etsy.com/search?q=${query}`); // Read url query parameter.

  //await page.waitFor(1000);

  let html = await page.content();
  let $ = await cheerio.load(html);

  //console.log("sencer");
  //await page.waitForSelector(".listing-cards");
  //console.log("sencer");
  //let x = await $(".text-center > div.wt-show-xl li a span");

  const list = $(".text-center > div.wt-show-xl ")
    .find("li span")
    .toArray()
    .map((element) => $(element).text().trim());

  //console.log(list[list.length - 3]);

  return list[list.length - 3] || 1;
};

var listener = app.listen(3000, function () {
  console.log("Your app is listening on port " + listener.address().port);
});

listener.timeout = 1000 * 60 * 30; // 10 minutes