// src/modules/content/content.routes.ts
import { Router } from 'express';
import { contentController } from './content.controller.js';

const router = Router();

router.get('/banners', (req, res) => contentController.getBanners(req, res));
router.get('/promotions', (req, res) => contentController.getPromotions(req, res));
router.get('/ecosystem', (req, res) => contentController.getEcosystemStatus(req, res));
router.get('/status', (req, res) => contentController.getEcosystemStatus(req, res));
router.get('/categories', (req, res) => contentController.getCategories(req, res));
router.get('/grocery', (req, res) => contentController.getGroceryCatalog(req, res));
router.get('/partners', (req, res) => contentController.getPartners(req, res));
router.get('/stores', (req, res) => contentController.getStores(req, res));
router.get('/stores/nearby', (req, res) => contentController.getNearbyStores(req, res));
router.get('/restaurants/nearby', (req, res) => contentController.getNearbyRestaurants(req, res));
router.get('/stores/:id', (req, res) => contentController.getStoreById(req, res));
router.get('/stores/:id/products', (req, res) => contentController.getStoreProducts(req, res));
router.get('/hotels', (req, res) => contentController.getHotels(req, res));
router.get('/doctors', (req, res) => contentController.getDoctors(req, res));

export default router;
