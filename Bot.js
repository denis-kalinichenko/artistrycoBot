const TelegramBot = require('node-telegram-bot-api');
const validUrl = require("valid-url");
const parseDomain = require("parse-domain");

const config = require("./config");
const Product = require("./src/product");

const bot = new TelegramBot(config.token, {polling: true});

let product = null;
let watcher;

bot.on("message", msg => {
    bot.sendChatAction(msg.chat.id, "typing");

    if (msg.entities && msg.entities[0].type === "bot_command") {
        return;
    }

    const AKS_LINK_MESSAGE = "Send me link to the product which I should add to the cart.";

    if (!validUrl.isWebUri(msg.text)) {
        return bot.sendMessage(msg.chat.id, AKS_LINK_MESSAGE);
    }

    const parsedDomain = `${parseDomain(msg.text).domain}.${parseDomain(msg.text).tld}`;

    if (parsedDomain !== "theartistryco.com") {
        return bot.sendMessage(msg.chat.id, "Please send a link to a product from www.theartistryco.com website only.");
    }

    product = new Product();

    product.load(msg.text, error => {
        if (error) {
            return bot.sendMessage(msg.chat.id, error);
        }

        const response = `${product.name}\n\nPrice: ${product.price}\n\n${(product.soldOut) ? "❌ Sold Out" : "✅ In Stock"}`;
        let reply_markup;

        if (!product.soldOut)  {
            reply_markup = {
                keyboard: [["/add"]],
            };
        } else {
            reply_markup = {
                keyboard: [["/watch"]],
            };
        }

        bot.sendPhoto(msg.chat.id, product.image, {
            caption: response,
            reply_markup: reply_markup,
        });
    });
});

bot.onText(/\/start/, msg => {
    let message_body = `Hi, ${msg.chat.first_name}. Send me link to the product which I should add to the cart.`;

    product = null;

    bot.sendMessage(msg.chat.id, message_body);
});

bot.onText(/\/add/, msg => {
    if (!product) {
        return;
    }

    product.addToCart(() => {
        let message_body = `Product has been successfully added to Cart! Copy the session code:\n\n<pre>${product.session}</pre>` +
        `\n\nAnd then open www.theartistryco.com/cart in your browser, change the cookie value of <b>_big_cartel_session</b> `+
        `and refresh the page. Send /help command for more information about browser cookies.`;
        bot.sendMessage(msg.chat.id, message_body, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: {hide_keyboard: true},
        });
    });
});

bot.onText(/\/watch/, msg => {
    if (!product) {
        return;
    }

    if (!product.soldOut) {
        bot.sendMessage(msg.chat.id, "Product is already in stock. Send /add command to add product to the Cart.", {
            reply_markup: {hide_keyboard: true},
        });
        return;
    }

    bot.sendMessage(msg.chat.id, `⌛ Starting watching product... Update each 3s.`, {
        reply_markup: {
            keyboard: [["/stop"]],
        },
    });

    watcher = setInterval(() => {
        bot.sendChatAction(msg.chat.id, "typing");

        product.load(product.url, error => {
            if (error) {
                console.error(error);
                return;
            }

            console.log(!product.soldOut);

            if (!product.soldOut) {
                bot.sendMessage(msg.chat.id, "Product became available! Adding to Cart...", {
                    reply_markup: {hide_keyboard: true},
                });

                clearInterval(watcher);

                product.addToCart(() => {
                    let message_body = `<b>Yeah.</b> Product has been successfully added to Cart! Copy the session code:\n\n<pre>${product.session}</pre>` +
                        `\n\nAnd then open www.theartistryco.com/cart in your browser, change the cookie value of <b>_big_cartel_session</b> `+
                        `and refresh the page. Send /help command for more information about browser cookies.`;
                    bot.sendMessage(msg.chat.id, message_body, {
                        parse_mode: "HTML",
                        disable_web_page_preview: true,
                        reply_markup: {hide_keyboard: true},
                    });
                });
            }
        });

    }, 3000);
});

bot.onText(/\/stop/, msg => {
    if (!product) {
        return;
    }

    if (!watcher) {
        return;
    }

    clearInterval(watcher);

    bot.sendMessage(msg.chat.id, "Watcher has been stopped.", {
        reply_markup: {hide_keyboard: true},
    });
});

bot.onText(/\/help/, msg => {
    bot.sendDocument(msg.chat.id, "http://i.imgur.com/zBNmPRX.gif", {
        caption: `To edit cookies go to www.editthiscookie.com and install extension for Google Chrome, ` +
        `use it to change the value of '_big_cartel_session' cookie. Refresh the page.`,
        reply_markup: { hide_keyboard: true },
    });
});