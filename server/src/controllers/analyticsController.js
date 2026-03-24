const analyticsService = require('../services/analyticsService');

async function getMonthlyReport(req, res, next) {
  try {
    const report = await analyticsService.getMonthlyReport(req.user.userId, req.query.monthYear);
    res.json({ report });
  } catch (error) {
    next(error);
  }
}

async function generateReport(req, res, next) {
  try {
    const { monthYear } = req.body || {};
    const report = await analyticsService.generateReport(req.user.userId, monthYear);
    res.json({ report, message: 'Analytics report generated successfully' });
  } catch (error) {
    next(error);
  }
}

async function askAssistant(req, res, next) {
  try {
    const { history, monthYear } = req.body;

    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ message: 'Chat history is required' });
    }

    const result = await analyticsService.askAssistant(req.user.userId, monthYear, history);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function runSimulation(req, res, next) {
  try {
    const { monthYear, categoryName, reductionPercent, months } = req.body;

    if (!categoryName || !String(categoryName).trim()) {
      return res.status(400).json({ message: 'Category is required' });
    }

    const reduction = Number(reductionPercent);
    const duration = Number(months);
    if (!Number.isFinite(reduction) || !Number.isFinite(duration) || reduction <= 0 || duration <= 0) {
      return res.status(400).json({ message: 'Valid reduction percent and months are required' });
    }

    const result = await analyticsService.runSimulation(
      req.user.userId,
      monthYear,
      String(categoryName).trim(),
      reduction,
      duration
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { getMonthlyReport, generateReport, askAssistant, runSimulation };
