import { Router } from 'express';
import * as contactsController from '../controllers/contacts.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { body, query, validationResult } from 'express-validator';

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
  }
  next();
}

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Search for users to add as contacts
router.get(
  '/search',
  [
    query('query').trim().isLength({ min: 2 }).withMessage('Search query must be at least 2 characters.'),
    handleValidation,
  ],
  contactsController.searchUsers
);

// Get all contacts
router.get('/', contactsController.getContacts);

// Add a new contact
router.post(
  '/',
  [
    body('contactId').trim().notEmpty().withMessage('Contact ID is required.'),
    body('nickname').optional().trim().isLength({ max: 50 }).withMessage('Nickname must be 50 characters or less.'),
    handleValidation,
  ],
  contactsController.addContact
);

// Update a contact (nickname, block/unblock)
router.patch(
  '/:contactId',
  [
    body('nickname').optional().trim().isLength({ max: 50 }).withMessage('Nickname must be 50 characters or less.'),
    body('isBlocked').optional().isBoolean().withMessage('isBlocked must be a boolean.'),
    handleValidation,
  ],
  contactsController.updateContact
);

// Remove a contact
router.delete('/:contactId', contactsController.removeContact);

export default router;
