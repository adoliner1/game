var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('game', { title: 'Game' });
});

router.get('/*', function(req, res, next) {
  res.render('game', { title: 'Game' });
});


module.exports = router;
