import { Router } from 'express';
import { adminDepositsController as c } from '../../controllers/admin/deposits.controller.js';

const r = Router();

r.get('/',               c.list);
r.patch('/:id/confirm',  c.confirm);
r.patch('/:id/expire',   c.expire);

export default r;
