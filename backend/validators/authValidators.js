const { body } = require('express-validator');

exports.registerRules = [
  body('name').isString().isLength({ min: 2, max: 60 }).withMessage('Ime mora imati 2-60 znakova.'),
  body('email').isEmail().withMessage('Neispravan email.'),
  body('password').isLength({ min: 6 }).withMessage('Lozinka minimalno 6 znakova.')
];

exports.loginRules = [
  body('email').isEmail().withMessage('Neispravan email.'),
  body('password').isLength({ min: 6 }).withMessage('Lozinka minimalno 6 znakova.')
];
