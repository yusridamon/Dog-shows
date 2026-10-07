const express = require('express');
const router = express.Router();
const publicCtrl = require('../controllers/public.controller');
const entryCtrl = require('../controllers/entry.controller');
const { uploadEntryFiles } = require('../middleware/upload');

// Grading chart
router.get('/grades', publicCtrl.listGrades);

// Shows
router.get('/shows', publicCtrl.listShows);
router.get('/shows/:id', publicCtrl.getShow);

// Dog lookup (step 2/3 of the entry flow)
router.get('/dogs/lookup', publicCtrl.lookupDog);

// Catalogue
router.get('/shows/:showId/catalogue', publicCtrl.getCatalogue);

// Entry submission (multipart to allow optional pedigree upload)
router.post('/entries', uploadEntryFiles, entryCtrl.createEntry);

// Contact
router.post('/contact', publicCtrl.createContactMessage);

module.exports = router;
