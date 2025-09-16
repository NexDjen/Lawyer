const config = require('../config/config');
const logger = require('../utils/logger');

class TextPricingService {
  // Calculate cost for a text chat session given duration in seconds
  calculateCost(durationInSeconds) {
    const minutes = durationInSeconds / 60;
    const rate = config.pricing.textChat.minuteRate;
    const cost = Math.ceil(minutes * rate * 100) / 100; // округление до копеек
    logger.info('Calculated text chat cost', { durationInSeconds, cost });
    return cost;
  }

  // Retrieve pricing information for text chat
  getPricingInfo() {
    const info = config.pricing.textChat;
    return {
      hourlyRate: info.hourlyRate,
      discountedRate: info.discountedRate,
      minuteRate: info.minuteRate,
      discountedMinuteRate: info.discountedMinuteRate
    };
  }
}

module.exports = new TextPricingService();
