
import {Router} from 'express'
import { healthCheckup } from '../controllers/healthCheckup.controllers.js';

const router = Router();

router.route('/').get(healthCheckup)

export default router