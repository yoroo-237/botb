import { Router } from 'express';
import { adminSupportController as c } from '../../controllers/admin/support.controller.js';

const r = Router();

r.get('/',              c.list);
r.get('/:id',           c.getOne);
r.post('/:id/messages', c.reply);
r.patch('/:id/status',  c.updateStatus);

export default r;
