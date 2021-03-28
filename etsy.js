const rp = require('request-promise');
const express = require("express");
const app = express();
const axios = require("axios");
const cheerio = require("cheerio");
const fakeUa = require("fake-useragent");

app.set("port", process.env.PORT || 8400);

app.get("/id/:id/related", async (req, res) => {
    console.log(req.params.id)
    console.log('related called')
    let pathname = req.path.substring(1).split("/");
    let id = pathname[1];

    axios
        .get(`https://www.etsy.com/listing/${id}/similar`, {
            headers: {
                "User-Agent": fakeUa(),
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
            },
            withCredentials: true,
        }).then(function (response) {

            const $ = cheerio.load(response.data);
            let data = {};
            //let results = $('#content > div:nth-child(2) > div > div > div.block-grid-xs-5.pb-xs-1-5.show-lg.show-xl.show-tv > li')
            //let results = $('#content > div.recs-appears-logger > div > div > ul > li');
            let results = $('#content > div.recs-appears-logger > div > div > ul > li')
            
            data.products = results.toArray().map(elem => {
                let tr = $(elem).find('a > div.v2-listing-card__info > div > div.v2-listing-card__shop > span > span.text-body-smaller.text-gray-lighter.display-inline-block.icon-b-1 ').text().replace(',', '').match(/(\d+)/g)
                let promotionData = $(elem).find('a > div.v2-listing-card__info > div > div.n-listing-card__price.wt-display-block.wt-text-title-01 > p.wt-text-caption.wt-text-slime.wt-no-wrap.wt-text-truncate').text().replace(',', '')
                                                //a > div.v2-listing-card__info > div > div.n-listing-card__price.wt-display-block.wt-text-title-01 > p.wt-text-caption.wt-text-slime.wt-no-wrap.wt-text-truncate > span.wt-text-strikethrough
                let percent;
                let oldPriceValue;
                if (promotionData.length != 0) {
                    let regex = /\d+(\.\d+)?/g
                    let values = promotionData.match(regex)
                    oldPriceValue = parseFloat(values[0])
                    percent = parseFloat(values.pop())

                }
                let img = $(elem).find(' a > div.v2-listing-card__img.wt-position-relative.listing-card-image-no-shadow > div > div > div > div > div > img').attr('src');
                img = img ? img : $(elem).find(' a > div.v2-listing-card__img.wt-position-relative.listing-card-image-no-shadow > div > div > div > div > div > img').attr('data-src');
                return { //#content > div.recs-appears-logger > div > div > ul > li:nth-child(1) > div > a > div.v2-listing-card__img.wt-position-relative.listing-card-image-no-shadow > div > div > div > div > div > img
                    imageURL: img,
                    title: $(elem).find(' a > div.v2-listing-card__info > div > h3').text().replace(/\s+/g, " "),
                    description: '',
                    shipingFrom: '',
                    totaleRating: tr == null || tr.length < 0 ? 0 : tr[0],
                    productId: $(elem).find('a').attr('data-listing-id'),
                    priceRange: false,
                    promotion: promotionData.length == 0 ? false : true,
                    oldPrice: promotionData.length == 0 ? 0 : oldPriceValue,
                    promotionValue: promotionData.length == 0 ? 0 : percent,
                    price: {
                        amount: parseFloat($(elem).find('a > div.v2-listing-card__info > div > div.n-listing-card__price.wt-display-block.wt-text-title-01 > p span.currency-value').first().text()),
                        currency: $(elem).find('a > div.v2-listing-card__info > div > div.n-listing-card__price.wt-display-block.wt-text-title-01 > p span.currency-symbol').first().text(),
                                              //a > div.v2-listing-card__info > div > div.n-listing-card__price.wt-display-block.wt-text-title-01 > p > span.currency-symbol
                    },

                    averageRating: parseFloat($(elem).find('a > div.v2-listing-card__info > div > div.v2-listing-card__shop > span > span.stars-svg.stars-smaller > input[type=hidden]:nth-child(2)').attr('value'))
                }
            })
            res.set({
                "content-type": "application/json; charset=utf-8",
            });

            res.end(JSON.stringify(data));
        }).catch((errr) => {
            console.log(errr)
            res.end('problem')
        })

})

app.get("/id/*", (req, res) => {
    let pathname = req.path.substring(1).split("/");
    let id = pathname[1];
    console.log(id)
    console.log('id route get called')
    rp(`https://www.etsy.com/listing/${id}`, {
            withCredentials: true
        })
        .then(function (htmlString) {
            // console.log(htmlString)
            const $ = cheerio.load(htmlString);
            let itemData = {};

            let productData = JSON.parse($("script[type='application/ld+json']").html())
            //itemData.icon = $("#listing-right-column > div > div.body-wrap.wt-body-max-width.wt-display-flex-md.wt-flex-direction-column-xs > div.image-col.wt-order-xs-1.wt-mb-lg-6 > div > div > div > div.listing-page-image-carousel-component.display-flex-xs > div.image-carousel-container.wt-position-relative.flex-xs-6.order-xs-2.show-scrollable-thumbnails > ul > li:nth-child(1) > img").attr("src");
            //console.log(productData)
            itemData.title = productData.name
            itemData.icon = productData.image;
            itemData.category = productData.category.split(" < ").pop();
            let categoryUrl = new URL($('#wt-content-toggle-tags-read-more > ul > li:nth-child(1) > a').attr('href'))
            itemData.categoryId = categoryUrl.pathname
            itemData.totaleRating = productData.aggregateRating ? productData.aggregateRating.ratingCount : 0;
            itemData.rating = productData.aggregateRating ? productData.aggregateRating.ratingValue : 0;
            itemData.images = $('#listing-right-column > div > div.body-wrap.wt-body-max-width.wt-display-flex-md.wt-flex-direction-column-xs > div.image-col.wt-order-xs-1.wt-mb-lg-6 > div > div > div > div > div > div.wt-position-absolute.wt-overflow-scroll.wt-position-top.wt-position-bottom.wt-position-left.scroll-container-no-scrollbar > ul > li img').toArray().map((elem, index) => $(elem).attr('data-src-delay').replace('il_75x75', 'il_700xN').replace('/d/', '/r/'))
            //itemData.images = $('#listing-right-column > div > div.body-wrap.wt-body-max-width.wt-display-flex-md.wt-flex-direction-column-xs > div.image-col.wt-order-xs-1.wt-mb-lg-6 > div > div > div > div.listing-page-image-carousel-component.display-flex-xs > div:nth-child(2) > div.wt-position-absolute.wt-overflow-scroll.wt-position-top.wt-position-bottom.wt-position-left.scroll-container-no-scrollbar > ul > li img').toArray().map((elem, index) => $(elem).attr('data-src-delay').replace('il_75x75', 'il_700xN').replace('/d/', '/r/'))
                               //#listing-right-column > div > div.body-wrap.wt-body-max-width.wt-display-flex-md.wt-flex-direction-column-xs > div.image-col.wt-order-xs-1.wt-mb-lg-6 > div > div > div > div > div > div.wt-position-absolute.wt-overflow-scroll.wt-position-top.wt-position-bottom.wt-position-left.scroll-container-no-scrollbar > ul > li img
            itemData.description = productData.description
            if (productData.offers.lowPrice != productData.offers.lowPrice) {
                itemData.priceRange = true;
                itemData.price = [];
                itemData.price.push({
                    amount: productData.offers.lowPrice,
                    currency: productData.offers.priceCurrency
                })
                itemData.price.push({
                    amount: productData.offers.hightPrice,
                    currency: productData.offers.priceCurrency
                })
            } else {
                itemData.priceRange = false;
                itemData.price = {
                    amount: productData.offers.lowPrice,
                    currency: productData.offers.priceCurrency
                }

            }
            let delivaryText = $('#shipping-variant-div > div > div.wt-grid.wt-mb-xs-6 > div.js-estimated-delivery.wt-grid__item-xs-6.wt-mb-xs-3.wt-pr-xs-2 > p').text()
            if (delivaryText.length != 0) {
                delivaryText = "Estimated delivary " + delivaryText;
            } else {
                delivaryText = $('#shipping-variant-div > div > div.wt-grid.wt-mb-xs-6 > div:nth-child(1)').text().replace(/\s+/g, " ");
            }
            itemData.srs = {
                location: $('#shipping-variant-div > div > div.wt-grid.wt-mb-xs-6 > div.js-ships-from.wt-grid__item-xs-6.wt-mb-xs-3.wt-pr-xs-2 > p').text(),
                delivery: delivaryText,
                //shipping: $('#shippingshipping-variant-div > div > div.wt-grid.wt-mb-xs-6 > div[data-estimated-shipping]').text().replace(/\s+/g, " ")
                //shipping: $('#shipping-variant-div > div > div.wt-grid.wt-mb-xs-6 > div:nth-child(4)').text().replace(/\s+/g, " ")
                shipping: ''
            }
            let comments = $("p[id^='review-preview-toggle']").toArray().map(e => $(e).text().replace(/\s+/g, " "));
            //#reviews > div.wt-flex-xl-5.wt-flex-wrap > div.wt-grid.wt-grid--block.wt-mb-xs-0 > div
            let reviews = $("#same-listing-reviews-panel > div > div").toArray();
            if (reviews.length == 0) {
                reviews = $("#reviews > div.wt-flex-xl-5.wt-flex-wrap > div.wt-grid.wt-grid--block.wt-mb-xs-0 > div").toArray()
            }

            itemData.reviews = reviews.map((elem, index) => {
                //console.log($(elem).find('div.wt-display-flex-xs.wt-align-items-center.wt-mb-xs-1 > p > a').text())
                let titleConstruct = "";
                /*if (comments[index] == undefined) {
                    titleConstruct = ""
                } else {
                    titleConstruct = comments[index].includes('.') ? comments[index].substring(0, comments[index].indexOf('.') + 1) : comments[index]
                }*/
                return {
                    rate: $(elem).find('div.wt-pl-xs-8 > div.wt-mb-xs-3.wt-mb-md-1.wt-display-flex-md > div.wt-flex-md-3.wt-max-width-full.wt-mr-md-8.wt-flex-md-auto > div.wt-mb-xs-1 > span > input[type=hidden]:nth-child(2)').attr("value"),
                    user: $(elem).find('div.wt-display-flex-xs.wt-align-items-center.wt-mb-xs-1 > p > a').text(),
                    date: $(elem).find('div.wt-display-flex-xs.wt-align-items-center.wt-mb-xs-1 > p').contents()
                        .filter(function () {
                            return this.nodeType == 3;
                        })
                        .text()
                        .trim(),
                    comment: {
                        //title: titleConstruct,
                        content: $(elem).find("p[id^='review-preview-toggle']").text().trim()
                    }
                }
            })
                            //   #listing-page-cart > div > div.wt-mb-xs-1 > div > div > span:nth-child(3) > a > span > input[type=hidden]:nth-child(2)
            let sellerScore = $('#listing-page-cart > div > div.wt-mb-xs-1 > div > div > span.wt-text-caption').text()
            if (sellerScore.length == 0) {
                sellerScore = $('#listing-page-cart > div > div:nth-child(2) > div > a > span.wt-text-caption-01').text()
            }
            itemData.seller = {
                sellerName: $('#listing-page-cart > div > div:nth-child(1) > p > a > span').text().replace(/\s+/g, " "),
                score: parseInt(sellerScore.split(' ')[0].replace(',', ''))
            }
            itemData.itemSpecifics = {}
            res.set({
                "content-type": "application/json; charset=utf-8",
            });
            res.end(JSON.stringify(itemData));
            // res.end($("script[type='application/ld+json']").html());
        })
        .catch(function (err) {
            console.error(err)
            res.set({
                "content-type": "application/json; charset=utf-8",
            });
            res.end("error");
        });
})


app.listen(app.get("port"), () => {
    console.log(app.get("port"));
});