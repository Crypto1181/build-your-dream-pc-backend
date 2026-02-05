import { Router } from 'express';
import { getSettings, updateSetting, getCatalogFile } from '../controllers/settingsController';

const router = Router();

router.get('/', getSettings);
router.post('/', updateSetting);
router.get('/catalog-file', getCatalogFile);

export default router;
