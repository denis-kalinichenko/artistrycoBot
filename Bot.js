const TelegramBot = require('node-telegram-bot-api');
const validUrl = require("valid-url");
const parseDomain = require("parse-domain");

const config = require("./config");
const product = require("./src/product");

const bot = new TelegramBot(config.token, {polling: true});

bot.on("message", msg => {
    bot.sendChatAction(msg.chat.id, "typing");

    const AKS_LINK_MESSAGE = "Send me link to the product which I should add to the cart.";

    if (msg.text === "/start") {
        return;
    }

    if (!validUrl.isWebUri(msg.text)) {
        return bot.sendMessage(msg.chat.id, AKS_LINK_MESSAGE);
    }

    const parsedDomain = `${parseDomain(msg.text).domain}.${parseDomain(msg.text).tld}`;

    if (parsedDomain !== "theartistryco.com") {
        return bot.sendMessage(msg.chat.id, "Please send a link to a product from www.theartistryco.com website only.");
    }
    product.get(msg.text, (error, $) => {
        if (error) {
            return bot.sendMessage(msg.chat.id, error);
        }
        bot.sendMessage(msg.chat.id, product.isSoldOut($));
    });
});

bot.onText(/\/start/, msg => {
    let message_body = `Hi, ${msg.chat.first_name}. Send me link to the product which I should add to the cart.`;

    bot.sendMessage(msg.chat.id, message_body);
});