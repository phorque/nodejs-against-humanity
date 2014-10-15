var _ = require('underscore');
var cards = require('./cards.js');

var config = {
  maxPlayers: parseInt(process.env.MAX_PLAYERS || 10),
  minPlayers: parseInt(process.env.MIN_PLAYERS || 3),
  handSize: parseInt(process.env.HAND_SIZE || 10),
  pointsToWin: parseInt(process.env.POINTS_TO_WIN || 5),
};

var gameList = [];

function getDeck(callback) {
  return cards.getDeck(callback);
}

function removeFromArray(array, item) {
  var index = array.indexOf(item);
  if(index !== -1) {
    array.splice(index, 1);
  }
}

function list() {
  return toInfo(_.filter(gameList, function(x) {
    return x.players.length < config.maxPlayers && !x.isStarted
  }));
}

function listAll() {
  return toInfo(gameList);
}

function toInfo(fullGameList) {
  return _.map(fullGameList, function(game) {
    return { id: game.id, name: game.name, players: game.players.length };
  });
}

function addGame(game, callback) {
  getDeck(function(deck) {
    game.players = [];
    game.maxPlayers = config.maxPlayers;
    game.minPlayers = config.minPlayers;
    game.handSize = config.handSize;
    game.history = [];
    game.isOver = false;
    game.winnerId = null;
    game.winningCardId = null;
    game.isStarted = false;
    game.deck = deck;
    game.currentBlackCard = "";
    game.isReadyForScoring = false;
    game.isReadyForReview = false;
    game.pointsToWin = config.pointsToWin;
    gameList.push(game);
    callback(game);
  });
}

function getGame(gameId) {
    return _.find(gameList, function(x) { return x.id === gameId; }) || undefined;
}

function joinGame(game, player) {
    var joiningPlayer = {
    id: player.id,
    name: player.name,
    isReady: false,
    cards : [],
    selectedWhiteCardId: null,
    awesomePoints: 0,
    isCzar: false
    };

    for(var i = 0; i < game.handSize; i++) {
        drawWhiteCard(game, joiningPlayer);
    }

    game.players.push(joiningPlayer);

    if(game.players.length === game.minPlayers) {
        if(!game.isStarted){
            startGame(game);
        } else {
            //someone may have dropped and rejoined. If it was the Czar, we need to re-elect the re-joining player
            var currentCzar = _.find(game.players, function(p) {
                return p.isCzar == true;
            });
            if(!currentCzar){
                game.players[game.players.length - 1].isCzar = true;
            }
        }
    }

    return game;
}

function departGame(gameId, playerId) {
    var game = getGame(gameId);
    if(game){
        console.info('depart game: ' + game.name);
        var departingPlayer = _.find(game.players, function(p){
            return p.id === playerId;
        });
        removeFromArray(game.players, departingPlayer);
        if(game.players.length === 0){
            //kill the game
            removeFromArray(gameList, game);
        }
    }
}

function startGame(game) {
  game.isStarted = true;
  setCurrentBlackCard(game);
  game.players[0].isCzar = true;
}

function roundEnded(game) {
  game.winnerId = null;
  game.winningCardId = null;
  game.isReadyForScoring = false;
  game.isReadyForReview = false;

  setCurrentBlackCard(game);

  _.each(game.players, function(player) {
    if(!player.isCzar) {
      removeFromArray(player.cards, player.selectedWhiteCardId);
      drawWhiteCard(game, player);
    }

    player.isReady = false;
    player.selectedWhiteCardId = null;
  });

  for(i = 0; i < game.maxPlayers; i++) {
    if(game.players[i].isCzar === true) {
      if(i === game.maxPlayers - 1) {
        game.players[i].isCzar = false;
        game.players[0].isCzar = true;
        game.players[0].isReady = false;
      } else {
        game.players[i].isCzar = false;
        game.players[i+1].isCzar = true;
        game.players[i+1].isReady = false;
      }
      break;
    }
  }

  if(game.isOver){
    _.map(game.players, function(p) {
      p.awesomePoints = 0;
    });
    game.isOver = false;
  }
}

function drawWhiteCard(game, player) {
  var whiteIndex = Math.floor(Math.random() * game.deck.white.length);
  player.cards.push(game.deck.white[whiteIndex]);
  game.deck.white.splice(whiteIndex, 1);
}

function setCurrentBlackCard(game) {
  var index = Math.floor(Math.random() * game.deck.black.length);
  game.currentBlackCard = game.deck.black[index];
  game.deck.black.splice(index, 1);
}

function getPlayer(gameId, playerId) {
  var game = getGame(gameId);
  return _.find(game.players, function(x) { return x.id === playerId; });
}

function getPlayerByCardId(gameId, cardId) {
  var game = getGame(gameId);
  return _.findWhere(game.players, { selectedWhiteCardId: cardId });
}

function readyForNextRound(gameId, playerId) {
  var player = getPlayer(gameId, playerId);
  player.isReady = true;

  var game = getGame(gameId);
  var allReady = _.every(game.players, function(x) {
    return x.isReady;
  });

  if(allReady) {
    roundEnded(game);
  }
}

function selectCard(gameId, playerId, whiteCardId) {
  var player = getPlayer(gameId, playerId);
  player.selectedWhiteCardId = whiteCardId;
  player.isReady = false;

  var game = getGame(gameId);

  var readyPlayers = _.filter(game.players, function (x) {
    return x.selectedWhiteCardId;
  });

  if(readyPlayers.length === (game.maxPlayers -1)) {
    game.isReadyForScoring = true;
  }
}

function selectWinner(gameId, cardId) {
  var player = getPlayerByCardId(gameId, cardId);
  var game = getGame(gameId);
  game.winningCardId = cardId;
  game.isReadyForReview = true;
  player.awesomePoints = player.awesomePoints + 1;
  game.history.push({ black: game.currentBlackCard, white: cardId, winner: player.name });
  if(player.awesomePoints === game.pointsToWin) {
    game = getGame(gameId);
    game.isOver = true;
    game.winnerId = player.id;
  }
}

function reset(){
  gameList = [];
}

exports.list = list;
exports.listAll = listAll;
exports.addGame = addGame;
exports.getGame = getGame;
exports.getPlayer = getPlayer;
exports.joinGame = joinGame;
exports.departGame = departGame;
exports.readyForNextRound = readyForNextRound;
exports.reset = reset;
exports.roundEnded = roundEnded;
exports.selectCard = selectCard;
exports.selectWinner = selectWinner;
exports.removeFromArray = removeFromArray;
exports.getDeck = getDeck;
exports.config = config;
