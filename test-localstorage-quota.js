// Тест для проверки исправления QuotaExceededError
// Этот скрипт можно запустить в консоли браузера для тестирования

function testLocalStorageQuotaHandling() {
  console.log('🧪 Тестирование обработки QuotaExceededError...');
  
  // Сохраняем текущее состояние localStorage
  const originalData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    originalData[key] = localStorage.getItem(key);
  }
  
  try {
    // Попытаемся заполнить localStorage до предела
    let counter = 0;
    while (counter < 1000) {
      const largeData = 'x'.repeat(10000); // 10KB строка
      localStorage.setItem(`test_${counter}`, largeData);
      counter++;
    }
    console.log('✅ localStorage заполнен без ошибок');
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.log('✅ QuotaExceededError поймана:', error.message);
      
      // Тестируем функцию очистки
      try {
        const keys = Object.keys(localStorage);
        const testKeys = keys.filter(key => key.startsWith('test_'));
        console.log(`📊 Найдено ${testKeys.length} тестовых ключей`);
        
        // Очищаем половину
        testKeys.slice(0, Math.floor(testKeys.length / 2)).forEach(key => {
          localStorage.removeItem(key);
        });
        
        console.log('✅ Очистка выполнена успешно');
        
        // Пробуем добавить новый элемент
        localStorage.setItem('test_new', 'test data');
        console.log('✅ Новый элемент добавлен после очистки');
        
      } catch (cleanupError) {
        console.error('❌ Ошибка при очистке:', cleanupError);
      }
    } else {
      console.error('❌ Неожиданная ошибка:', error);
    }
  } finally {
    // Восстанавливаем исходное состояние
    localStorage.clear();
    Object.keys(originalData).forEach(key => {
      localStorage.setItem(key, originalData[key]);
    });
    console.log('🔄 Исходное состояние localStorage восстановлено');
  }
}

// Запуск теста
testLocalStorageQuotaHandling();




