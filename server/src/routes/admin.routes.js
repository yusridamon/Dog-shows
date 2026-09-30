const express = require('express');
const router = express.Router();
const admin = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

// Dashboard
router.get('/dashboard', admin.dashboard);

// Shows
router.get('/shows', admin.listShows);
router.post('/shows', admin.createShow);
router.get('/shows/:id', admin.getShow);
router.put('/shows/:id', admin.updateShow);
router.delete('/shows/:id', admin.deleteShow);

// Classes (per show)
router.post('/shows/:showId/classes', admin.createClass);
router.put('/classes/:id', admin.updateClass);
router.delete('/classes/:id', admin.deleteClass);

// Grades
router.get('/grades', admin.listGrades);
router.post('/grades', admin.createGrade);
router.put('/grades/:id', admin.updateGrade);
router.delete('/grades/:id', admin.deleteGrade);

// Entries
router.get('/entries', admin.listEntries);
router.get('/entries/:id', admin.getEntry);
router.put('/entries/:id', admin.updateEntry);
router.post('/entries/:id/approve', admin.approveEntry);
router.post('/entries/:id/reject', admin.rejectEntry);
router.post('/entries/:id/request-correction', admin.requestCorrection);
router.post('/entries/:id/withdraw', admin.withdrawEntry);
router.post('/entries/:id/grade', admin.setGrade);
router.put('/entries/:id/critique', admin.upsertCritique);

// Bulk-publish all critiques for a show (end-of-show release)
router.post('/shows/:showId/publish-critiques', admin.publishShowCritiques);

// Dog registry
router.get('/dogs', admin.searchDogs);

// Messages
router.get('/messages', admin.listMessages);
router.put('/messages/:id/read', admin.markMessageRead);

module.exports = router;
