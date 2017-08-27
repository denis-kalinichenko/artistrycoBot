const http = require("http");
const querystring = require("querystring");
const cheerio = require("cheerio");
const cookieparser = require("cookieparser");

class Product {
    constructor() {
        this.$ = null;
        this.soldOut = null;
        this.name = null;
        this.price = null;
        this.image = null;
        this.session = null;
        this.url = null;
    }

    load(url, callback) {
        this.url = url;
        return http.get(url, response => {
            const { statusCode } = response;

            if (statusCode !== 200) {
                return callback("Can't load page. Status code: " + statusCode);
            }

            response.setEncoding('utf8');
            let body = "";
            response.on("data", chunk => { body += chunk; });
            response.on("end", () => {
                this.$ = cheerio.load(body);
                this._parse();
                callback(null);
            });
        }).on('error', error => {
            callback(`Got error: ${error.message}`);
        });
    }

    addToCart(callback) {
        if (this.soldOut) {
            return;
        }

        const id = this.$("#option").attr("value");

        const post_data = querystring.stringify({
            utf8: "✓",
            "cart[add][id]": id,
            submit: "",
        });

        const post_options = {
            host: "www.theartistryco.com",
            port: "80",
            path: "/cart",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(post_data),
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36",
            }
        };

        let data = "";

        const request = http.request(post_options, res => {
            res.setEncoding('utf8');

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                const cookies = cookieparser.parse(res.headers["set-cookie"][0]);
                this.session = cookies._big_cartel_session;
                callback();
            });
        });

        request.write(post_data);
        request.end();
    }

    _parse() {
        this.soldOut = this.$("h4.button.disabled").text() === "Sold Out";
        this.name = this.$("h1").text();
        this.price = this.$("header.product_header h3").text();
        this.image = this.$("#image_1 img").attr("src");
    }
}

module.exports = Product;