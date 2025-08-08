const { body, param, query } = require('express-validator');

exports.createChallengeRules = [
  body('title').isString().isLength({ min: 3, max: 120 }),
  body('type').isIn(['running', 'yoga', 'hiit', 'steps', 'weightloss', 'custom']),
  body('privacy').optional().isIn(['public', 'private']),
  body('entryFee').optional().isFloat({ min: 0 }),
  body('startDate').isISO8601().toDate(),
  body('endDate').isISO8601().toDate(),
  body('description').optional().isString().isLength({ max: 2000 }),
  body('rules').optional().isString().isLength({ max: 4000 })
];

exports.updateChallengeRules = [
  param('id').isMongoId(),
  body('title').optional().isString().isLength({ min: 3, max: 120 }),
  body('type').optional().isIn(['running', 'yoga', 'hiit', 'steps', 'weightloss', 'custom']),
  body('privacy').optional().isIn(['public', 'private']),
  body('entryFee').optional().isFloat({ min: 0 }),
  body('startDate').optional().isISO8601().toDate(),
  body('endDate').optional().isISO8601().toDate(),
  body('description').optional().isString().isLength({ max: 2000 }),
  body('rules').optional().isString().isLength({ max: 4000 })
];

exports.idRule = [ param('id').isMongoId() ];

exports.listRules = [
  query('q').optional({ checkFalsy: true }).isString(),
  query('type').optional({ checkFalsy: true }).isIn(['running', 'yoga', 'hiit', 'steps', 'weightloss', 'custom']),
  query('mine').optional({ checkFalsy: true }).isIn(['1','true','0','false']),
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
  query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 }),
];

