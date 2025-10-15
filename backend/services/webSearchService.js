/**
 * Сервис для поиска информации в интернете
 * Использует Google Custom Search API или альтернативные источники
 */

const https = require('https');
const http = require('http');
const { HttpsProxyAgent } = require('https-proxy-agent');
const logger = require('../utils/logger');
const config = require('../config/config');

class WebSearchService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    // Настройка прокси, если доступен
    this.proxyAgent = null;
    if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      this.proxyAgent = new HttpsProxyAgent(proxyUrl);
      logger.info('WebSearchService: Proxy configured', { proxyUrl });
    }
  }

  /**
   * Поиск судебной практики по запросу
   * @param {string} query - Поисковый запрос
   * @param {number} maxResults - Максимальное количество результатов
   * @returns {Promise<Array>} - Массив результатов поиска
   */
  async searchCourtPractice(query, maxResults = 5) {
    try {
      logger.info('🔍 Searching court practice', { query, maxResults });

      // Формируем поисковый запрос для судебной практики
      const searchQuery = `${query} судебная практика Верховный Суд РФ`;
      
      // Используем несколько источников
      const results = await Promise.allSettled([
        this.searchSudActRu(query),
        this.searchConsultantRu(query),
        this.searchGarantRu(query)
      ]);

      const allResults = [];
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          allResults.push(...result.value);
        }
      });

      // Ограничиваем количество результатов
      const limitedResults = allResults.slice(0, maxResults);

      logger.info('✅ Court practice search completed', { 
        foundResults: allResults.length, 
        returnedResults: limitedResults.length 
      });

      return limitedResults;
    } catch (error) {
      logger.error('❌ Error searching court practice', { error: error.message });
      return [];
    }
  }

  /**
   * Поиск на сайте sudact.ru (база судебных актов)
   */
  async searchSudActRu(query) {
    try {
      // В реальной реализации здесь будет API запрос к sudact.ru
      // Пока возвращаем заглушку
      logger.info('Searching sudact.ru', { query });
      return [];
    } catch (error) {
      logger.error('Error searching sudact.ru', { error: error.message });
      return [];
    }
  }

  /**
   * Поиск на сайте consultant.ru
   */
  async searchConsultantRu(query) {
    try {
      logger.info('Searching consultant.ru', { query });
      return [];
    } catch (error) {
      logger.error('Error searching consultant.ru', { error: error.message });
      return [];
    }
  }

  /**
   * Поиск на сайте garant.ru
   */
  async searchGarantRu(query) {
    try {
      logger.info('Searching garant.ru', { query });
      return [];
    } catch (error) {
      logger.error('Error searching garant.ru', { error: error.message });
      return [];
    }
  }

  /**
   * Универсальный веб-поиск через DuckDuckGo (не требует API ключа)
   */
  async searchWeb(query, maxResults = 5) {
    try {
      logger.info('🔍 Web search started', { query, maxResults });

      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

      const results = await this.makeHttpRequest(searchUrl);
      
      if (results && results.RelatedTopics) {
        const formattedResults = results.RelatedTopics
          .filter(topic => topic.Text && topic.FirstURL)
          .slice(0, maxResults)
          .map(topic => ({
            title: topic.Text.substring(0, 100),
            url: topic.FirstURL,
            snippet: topic.Text
          }));

        logger.info('✅ Web search completed', { foundResults: formattedResults.length });
        return formattedResults;
      }

      return [];
    } catch (error) {
      logger.error('❌ Error in web search', { error: error.message });
      return [];
    }
  }

  /**
   * Поиск актуальной судебной практики с контекстом
   */
  async searchWithContext(userMessage, maxResults = 3) {
    try {
      // Извлекаем ключевые слова из сообщения пользователя
      const keywords = this.extractKeywords(userMessage);
      
      if (keywords.length === 0) {
        return null;
      }

      // Формируем поисковый запрос
      const searchQuery = `${keywords.join(' ')} судебная практика ВС РФ`;
      
      // Выполняем поиск
      const courtResults = await this.searchCourtPractice(searchQuery, maxResults);
      
      if (courtResults.length === 0) {
        // Если не нашли судебную практику, делаем общий веб-поиск
        const webResults = await this.searchWeb(searchQuery, maxResults);
        return this.formatSearchResults(webResults, 'general');
      }

      return this.formatSearchResults(courtResults, 'court');
    } catch (error) {
      logger.error('Error in searchWithContext', { error: error.message });
      return null;
    }
  }

  /**
   * Извлечение ключевых слов из сообщения
   */
  extractKeywords(message) {
    // Простое извлечение ключевых слов
    const stopWords = ['я', 'мне', 'мой', 'в', 'на', 'с', 'по', 'для', 'как', 'что', 'это', 'был', 'быть', 'есть'];
    const words = message.toLowerCase()
      .replace(/[^\wа-яё\s]/gi, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));
    
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Форматирование результатов поиска для промпта
   */
  formatSearchResults(results, type = 'general') {
    if (!results || results.length === 0) {
      return null;
    }

    const header = type === 'court' 
      ? '\n\n📚 АКТУАЛЬНАЯ СУДЕБНАЯ ПРАКТИКА:\n'
      : '\n\n🌐 АКТУАЛЬНАЯ ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА:\n';

    const formattedResults = results.map((result, index) => {
      return `${index + 1}. ${result.title || 'Без названия'}
Источник: ${result.url || 'Нет URL'}
${result.snippet || result.description || 'Описание отсутствует'}`;
    }).join('\n\n');

    return header + formattedResults;
  }

  /**
   * HTTP запрос с поддержкой прокси
   */
  makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      };

      if (this.proxyAgent) {
        options.agent = this.proxyAgent;
      }

      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const req = protocol.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            resolve(data);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }
}

module.exports = new WebSearchService();

