const db = require('../db');
const { setFlashcardStats, getFlashcardStats } = require('./memoria.utils');
const moment = require('moment'); // For date manipulation

const CONSECUTIVE_ACTIVE_DAYS_WINDOW = 15;

/**
 * Helper function to calculate evolution of a metric.
 * @param {number} current Current value
 * @param {number} previous Previous value
 * @returns {{value: number, trend: 'increase'|'decrease'|'same'}}
 */
function calculateEvolution(current, previous) {
    if (previous === undefined || previous === null || isNaN(previous) || previous === 0) {
        return { value: current, trend: 'initial' };
    }
    const diff = current - previous;
    if (diff > 0) return { value: current, trend: 'increase' };
    if (diff < 0) return { value: current, trend: 'decrease' };
    return { value: current, trend: 'same' };
}

/**
 * Calculates global flashcard statistics for a given date range.
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<object>}
 */
async function getFlashcardStatsForPeriod(startDate, endDate) {
    const startIso = moment(startDate).toISOString();
    const endIso = moment(endDate).toISOString();

    // Total Flashcards Created
    const totalFlashcardsResult = await db.query(
        `SELECT COUNT(id) FROM flashcards WHERE created_at BETWEEN $1 AND $2`,
        [startIso, endIso]
    );
    const totalFlashcards = parseInt(totalFlashcardsResult.rows[0].count, 10) || 0;

    // Total Reviews, Average Rating, Success Rate (assuming rating >= 3 is success)
    const reviewStatsResult = await db.query(
        `SELECT 
            COUNT(id) AS total_reviews,
            AVG(rating) AS average_rating,
            COUNT(CASE WHEN rating >= 3 THEN 1 END) AS successful_reviews
         FROM flashcard_review_log 
         WHERE review_date BETWEEN $1 AND $2`,
        [startIso, endIso]
    );
    const totalReviews = parseInt(reviewStatsResult.rows[0].total_reviews, 10) || 0;
    const averageRating = parseFloat(reviewStatsResult.rows[0].average_rating) || 0;
    const successfulReviews = parseInt(reviewStatsResult.rows[0].successful_reviews, 10) || 0;
    const successRate = totalReviews > 0 ? (successfulReviews / totalReviews) * 100 : 0;

    // Unique Disciplines Involved
    const uniqueDisciplinesResult = await db.query(
        `SELECT COUNT(DISTINCT f.discipline_id) 
         FROM flashcards f
         WHERE f.created_at BETWEEN $1 AND $2`,
        [startIso, endIso]
    );
    const uniqueDisciplines = parseInt(uniqueDisciplinesResult.rows[0].count, 10) || 0;

    // Unique Assuntos Treated
    const uniqueAssuntosResult = await db.query(
        `SELECT COUNT(DISTINCT f.assunto_id) 
         FROM flashcards f
         WHERE f.created_at BETWEEN $1 AND $2 AND f.assunto_id IS NOT NULL`,
        [startIso, endIso]
    );
    const uniqueAssuntos = parseInt(uniqueAssuntosResult.rows[0].count, 10) || 0;

    // Average Difficulty Level
    // Difficulty is stored in flashcard_memory_state, which is student-specific and updated on review.
    // For a global metric, we could average all current difficulties across all students for flashcards reviewed/created in the period.
    // Or, average the 'difficulty' field from flashcards if it exists and represents a base difficulty.
    // Assuming 'difficulty' is in 'flashcard_memory_state' per student. Let's average the last known difficulty for flashcards involved in reviews within the period.
    const avgDifficultyResult = await db.query(
        `SELECT AVG(fms.difficulty)
         FROM flashcard_review_log frl
         JOIN flashcard_memory_state fms ON fms.flashcard_id = frl.flashcard_id AND fms.student_id = frl.student_id
         WHERE frl.review_date BETWEEN $1 AND $2`,
        [startIso, endIso]
    );
    const avgDifficulty = parseFloat(avgDifficultyResult.rows[0].avg) || 0;

    return {
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
        totalFlashcards,
        totalReviews,
        averageRating,
        successRate,
        uniqueDisciplines,
        uniqueAssuntos,
        avgDifficulty,
    };
}


/**
 * Calculates and provides global flashcard statistics and their evolution.
 */
async function calculateGlobalFlashcardStatistics() {
    const today = moment().startOf('day');

    // 1. Get all unique activity dates (creation or review)
    const activityDatesResult = await db.query(`
        SELECT DISTINCT DATE(created_at) AS activity_date FROM flashcards
        UNION
        SELECT DISTINCT DATE(review_date) AS activity_date FROM flashcard_review_log
        ORDER BY activity_date ASC
    `);
    let activeDates = activityDatesResult.rows.map(row => moment(row.activity_date));
    activeDates = activeDates.filter(date => date.isSameOrBefore(today)); // Only consider dates up to today

    if (activeDates.length === 0) {
        return {
            currentPeriodStats: {},
            previousPeriodStats: {},
            evolution: {},
            message: "No flashcard activity found."
        };
    }

    // 2. Identify the latest 15 consecutive active days
    let currentPeriodActiveDates = [];
    if (activeDates.length >= CONSECUTIVE_ACTIVE_DAYS_WINDOW) {
        currentPeriodActiveDates = activeDates.slice(-CONSECUTIVE_ACTIVE_DAYS_WINDOW);
    } else {
        currentPeriodActiveDates = activeDates;
    }

    const currentPeriodStartDate = currentPeriodActiveDates[0].startOf('day').toDate();
    const currentPeriodEndDate = currentPeriodActiveDates[currentPeriodActiveDates.length - 1].endOf('day').toDate();
    const currentPeriodId = `${moment(currentPeriodStartDate).format('YYYYMMDD')}_${moment(currentPeriodEndDate).format('YYYYMMDD')}`;

    // Try to get current stats from Redis first
    let currentPeriodStats = await getFlashcardStats('global', currentPeriodId);

    if (!currentPeriodStats) {
        console.log(`[Analytics] Calculating current period stats for ${currentPeriodId}`);
        currentPeriodStats = await getFlashcardStatsForPeriod(currentPeriodStartDate, currentPeriodEndDate);
        await setFlashcardStats('global', currentPeriodId, currentPeriodStats);
    } else {
        console.log(`[Analytics] Retrieved current period stats from Redis for ${currentPeriodId}`);
    }

    // 3. Identify the previous 15 consecutive active days
    let previousPeriodStats = {};
    let evolution = {};

    if (activeDates.length >= CONSECUTIVE_ACTIVE_DAYS_WINDOW * 2) {
        const previousPeriodActiveDates = activeDates.slice(-(CONSECUTIVE_ACTIVE_DAYS_WINDOW * 2), -CONSECUTIVE_ACTIVE_DAYS_WINDOW);
        const previousPeriodStartDate = previousPeriodActiveDates[0].startOf('day').toDate();
        const previousPeriodEndDate = previousPeriodActiveDates[previousPeriodActiveDates.length - 1].endOf('day').toDate();
        const previousPeriodId = `${moment(previousPeriodStartDate).format('YYYYMMDD')}_${moment(previousPeriodEndDate).format('YYYYMMDD')}`;

        previousPeriodStats = await getFlashcardStats('global', previousPeriodId);
        if (!previousPeriodStats) {
            console.log(`[Analytics] Calculating previous period stats for ${previousPeriodId}`);
            previousPeriodStats = await getFlashcardStatsForPeriod(previousPeriodStartDate, previousPeriodEndDate);
            await setFlashcardStats('global', previousPeriodId, previousPeriodStats);
        } else {
            console.log(`[Analytics] Retrieved previous period stats from Redis for ${previousPeriodId}`);
        }

        // Calculate evolution
        evolution = {
            totalFlashcards: calculateEvolution(currentPeriodStats.totalFlashcards, previousPeriodStats.totalFlashcards),
            totalReviews: calculateEvolution(currentPeriodStats.totalReviews, previousPeriodStats.totalReviews),
            averageRating: calculateEvolution(currentPeriodStats.averageRating, previousPeriodStats.averageRating),
            successRate: calculateEvolution(currentPeriodStats.successRate, previousPeriodStats.successRate),
            uniqueDisciplines: calculateEvolution(currentPeriodStats.uniqueDisciplines, previousPeriodStats.uniqueDisciplines),
            uniqueAssuntos: calculateEvolution(currentPeriodStats.uniqueAssuntos, previousPeriodStats.uniqueAssuntos),
            avgDifficulty: calculateEvolution(currentPeriodStats.avgDifficulty, previousPeriodStats.avgDifficulty),
        };
    } else {
        console.log("[Analytics] Not enough data for previous period comparison.");
        // Initialize evolution with 'initial' trend if no previous data
        evolution = {
            totalFlashcards: calculateEvolution(currentPeriodStats.totalFlashcards, undefined),
            totalReviews: calculateEvolution(currentPeriodStats.totalReviews, undefined),
            averageRating: calculateEvolution(currentPeriodStats.averageRating, undefined),
            successRate: calculateEvolution(currentPeriodStats.successRate, undefined),
            uniqueDisciplines: calculateEvolution(currentPeriodStats.uniqueDisciplines, undefined),
            uniqueAssuntos: calculateEvolution(currentPeriodStats.uniqueAssuntos, undefined),
            avgDifficulty: calculateEvolution(currentPeriodStats.avgDifficulty, undefined),
        };
    }

    return {
        currentPeriodStats,
        previousPeriodStats, // Include for full context, though evolution is derived from it
        evolution,
        message: "Flashcard global statistics calculated successfully."
    };
}

module.exports = {
    calculateGlobalFlashcardStatistics,
};
