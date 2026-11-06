const { z } = require('zod');
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({
      message: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    });
  req.body = result.data;
  next();
};
const id = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid identifier');
module.exports = { validate, id, z };
