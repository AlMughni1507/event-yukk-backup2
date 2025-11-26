const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken, requireUser } = require('../middleware/auth');
const ApiResponse = require('../middleware/response');

// Get approved reviews for a specific event (public)
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const [reviews] = await query(
      `SELECT er.*, u.full_name, u.username
       FROM event_reviews er
       LEFT JOIN users u ON er.user_id = u.id
       WHERE er.event_id = ? AND er.is_approved = TRUE
       ORDER BY er.created_at DESC`,
      [eventId]
    );

    return ApiResponse.success(res, { reviews }, 'Event reviews retrieved successfully');
  } catch (error) {
    console.error('Get event reviews error:', error);
    return ApiResponse.error(res, 'Failed to get event reviews');
  }
});

// Create or update review for an event (user must be registered for the event)
router.post('/:eventId', authenticateToken, requireUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating || !comment) {
      return ApiResponse.badRequest(res, 'Rating dan komentar wajib diisi');
    }

    if (rating < 1 || rating > 5) {
      return ApiResponse.badRequest(res, 'Rating harus antara 1 sampai 5');
    }

    if (comment.length < 5) {
      return ApiResponse.badRequest(res, 'Komentar minimal 5 karakter');
    }

    // Pastikan user memang terdaftar di event ini
    const [regs] = await query(
      'SELECT id FROM event_registrations WHERE user_id = ? AND event_id = ? AND status IN ("approved", "confirmed", "attended")',
      [userId, eventId]
    );

    if (regs.length === 0) {
      return ApiResponse.forbidden(res, 'Anda hanya bisa mengulas event yang pernah diikuti');
    }

    // Cek apakah review sudah ada
    const [existing] = await query(
      'SELECT id FROM event_reviews WHERE event_id = ? AND user_id = ? LIMIT 1',
      [eventId, userId]
    );

    if (existing.length > 0) {
      // Update
      await query(
        `UPDATE event_reviews
         SET rating = ?, comment = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [rating, comment, existing[0].id]
      );
    } else {
      // Insert baru
      await query(
        `INSERT INTO event_reviews (event_id, user_id, rating, comment, is_approved)
         VALUES (?, ?, ?, ?, TRUE)`,
        [eventId, userId, rating, comment]
      );
    }

    const [reviews] = await query(
      `SELECT er.*, u.full_name, u.username
       FROM event_reviews er
       LEFT JOIN users u ON er.user_id = u.id
       WHERE er.event_id = ? AND er.user_id = ?`,
      [eventId, userId]
    );

    return ApiResponse.success(res, reviews[0], 'Ulasan event tersimpan');
  } catch (error) {
    console.error('Create/update event review error:', error);
    console.error('SQL Message:', error.sqlMessage || error.message);
    console.error('SQL Code   :', error.code);
    return ApiResponse.error(
      res,
      `Gagal menyimpan ulasan event: ${error.sqlMessage || error.message || 'Unknown error'}`
    );
  }
});

module.exports = router;
