const http = require("http");
const cheerio = require("cheerio");

function get(url, callback) {
    return http.get(url, response => {
        const { statusCode } = response;

        if (statusCode !== 200) {
            return callback("Can't load page. Status code: " + statusCode);
        }

        response.setEncoding('utf8');
        let body = "";
        response.on("data", chunk => { body += chunk; });
        response.on("end", () => {
            const $ = cheerio.load(body);
            callback(null, $);
        });
    }).on('error', error => {
        callback(`Got error: ${error.message}`);
    });
}

function isSoldOut($) {
    return $("h4.button.disabled").text() === "Sold Out";
}

module.exports = {
    get,
    isSoldOut,
};