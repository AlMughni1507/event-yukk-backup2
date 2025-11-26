const express = require('express');
const { query } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const ApiResponse = require('../middleware/response');

const router = express.Router();

// Get analytics overview (admin only)
router.get('/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    
    // Get basic stats
    const [stats] = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as new_users,
        (SELECT COUNT(*) FROM events WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as new_events,
        (SELECT COUNT(*) FROM registrations WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as new_registrations,
        (SELECT COUNT(*) FROM analytics WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as total_actions
    `, [period, period, period, period]);

    // Get daily analytics for chart
    const dailyAnalytics = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_actions,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN action_type = 'view' THEN 1 END) as views,
        COUNT(CASE WHEN action_type = 'register' THEN 1 END) as registrations
      FROM analytics 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, [period]);

    // Get top events by views
    const topEvents = await query(`
      SELECT 
        e.id, e.title, e.status,
        COUNT(a.id) as total_views,
        COUNT(DISTINCT a.user_id) as unique_viewers
      FROM events e
      LEFT JOIN analytics a ON e.id = a.event_id AND a.action_type = 'view'
      WHERE e.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY e.id, e.title, e.status
      ORDER BY total_views DESC
      LIMIT 10
    `, [period]);

    // Get user activity
    const userActivity = await query(`
      SELECT 
        u.id, u.username, u.full_name,
        COUNT(a.id) as total_actions,
        MAX(a.created_at) as last_activity
      FROM users u
      LEFT JOIN analytics a ON u.id = a.user_id
      WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY u.id, u.username, u.full_name
      ORDER BY total_actions DESC
      LIMIT 10
    `, [period]);

    return ApiResponse.success(res, {
      stats: stats[0],
      dailyAnalytics,
      topEvents,
      userActivity
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    return ApiResponse.error(res, 'Failed to fetch analytics data');
  }
});

// Track user action
router.post('/track', authenticateToken, async (req, res) => {
  try {
    const { event_id, action_type } = req.body;
    const user_id = req.user.userId;
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('User-Agent');

    await query(
      'INSERT INTO analytics (event_id, user_id, action_type, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [event_id, user_id, action_type, ip_address, user_agent]
    );

    return ApiResponse.success(res, null, 'Action tracked successfully');

  } catch (error) {
    console.error('Track action error:', error);
    return ApiResponse.error(res, 'Failed to track action');
  }
});

// Get event analytics
router.get('/events/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30' } = req.query;

    // Get event analytics
    const analytics = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_actions,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN action_type = 'view' THEN 1 END) as views,
        COUNT(CASE WHEN action_type = 'register' THEN 1 END) as registrations
      FROM analytics 
      WHERE event_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [id, period]);

    // Get registration conversion
    const [conversion] = await query(`
      SELECT 
        COUNT(CASE WHEN action_type = 'view' THEN 1 END) as total_views,
        COUNT(CASE WHEN action_type = 'register' THEN 1 END) as total_registrations,
        ROUND(
          (COUNT(CASE WHEN action_type = 'register' THEN 1 END) / 
           NULLIF(COUNT(CASE WHEN action_type = 'view' THEN 1 END), 0)) * 100, 2
        ) as conversion_rate
      FROM analytics 
      WHERE event_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [id, period]);

    return ApiResponse.success(res, {
      analytics,
      conversion: conversion[0]
    });

  } catch (error) {
    console.error('Event analytics error:', error);
    return ApiResponse.error(res, 'Failed to fetch event analytics');
  }
});

// Get monthly events statistics
router.get('/monthly-events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const [monthlyEvents] = await query(`
      SELECT 
        MONTH(event_date) as month,
        MONTHNAME(event_date) as month_name,
        COUNT(*) as total_events
      FROM events 
      WHERE YEAR(event_date) = ? AND status = 'published'
      GROUP BY MONTH(event_date), MONTHNAME(event_date)
      ORDER BY MONTH(event_date)
    `, [year]);

    // Fill missing months with 0
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const result = months.map((monthName, index) => {
      const found = monthlyEvents.find(item => item.month === index + 1);
      return {
        month: index + 1,
        month_name: monthName,
        total_events: found ? parseInt(found.total_events) || 0 : 0
      };
    });

    return ApiResponse.success(res, { monthlyEvents: result });

  } catch (error) {
    console.error('Monthly events error:', error);
    return ApiResponse.error(res, 'Failed to fetch monthly events data');
  }
});

// Get monthly participants statistics (from event_registrations)
router.get('/monthly-participants', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const [monthlyParticipants] = await query(`
      SELECT 
        MONTH(e.event_date) as month,
        MONTHNAME(e.event_date) as month_name,
        COUNT(er.id) as total_participants
      FROM events e
      LEFT JOIN event_registrations er ON e.id = er.event_id
      WHERE YEAR(e.event_date) = ? 
        AND er.status NOT IN ('rejected', 'cancelled') 
        AND e.status = 'published'
      GROUP BY MONTH(e.event_date), MONTHNAME(e.event_date)
      ORDER BY MONTH(e.event_date)
    `, [year]);

    // Fill missing months with 0
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const result = months.map((monthName, index) => {
      const found = monthlyParticipants.find(item => item.month === index + 1);
      return {
        month: index + 1,
        month_name: monthName,
        total_participants: found ? parseInt(found.total_participants) || 0 : 0
      };
    });

    return ApiResponse.success(res, { monthlyParticipants: result });

  } catch (error) {
    console.error('Monthly participants error:', error);
    return ApiResponse.error(res, 'Failed to fetch monthly participants data');
  }
});

// Get top 10 events by participant count
router.get('/top-events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [topEvents] = await query(`
      SELECT 
        e.id,
        e.title,
        e.event_date,
        c.name as category_name,
        COUNT(er.id) as participant_count
      FROM events e
      LEFT JOIN event_registrations er ON e.id = er.event_id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.status = 'published' AND er.status NOT IN ('rejected', 'cancelled')
      GROUP BY e.id, e.title, e.event_date, c.name
      ORDER BY participant_count DESC
      LIMIT 10
    `);

    // Ensure participant_count is integer
    const formattedTopEvents = topEvents.map(event => ({
      ...event,
      participant_count: parseInt(event.participant_count) || 0
    }));

    return ApiResponse.success(res, { topEvents: formattedTopEvents });

  } catch (error) {
    console.error('Top events error:', error);
    return ApiResponse.error(res, 'Failed to fetch top events data');
  }
});

module.exports = router;
