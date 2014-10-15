var request = require('request');

function getDeck(callback) {
  defaultCardsPath = "https://raw.githubusercontent.com/phorque/nodejs-against-humanity/master/cards.json";
  request(process.env.CARDS_PATH || defaultCardsPath, function(error, response, body) {
    callback(JSON.parse(body));
  });
}

exports.getDeck = getDeck;
