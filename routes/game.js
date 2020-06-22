var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('game', { title: 'Game', boardLength: 15, boardWidth: 9 });
});

router.get('/*', function(req, res, next) {
  res.render('game', { title: 'Game', boardLength: 15, boardWidth: 9 });
});

module.exports = router;
