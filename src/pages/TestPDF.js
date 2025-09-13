import React, { useState } from 'react';
import './TestPDF.css';

const TestPDF = () => {
  const [results, setResults] = useState({});

  const generatePDF = async (documentType, content, userData, testId) => {
    setResults(prev => ({ ...prev, [testId]: { status: 'loading', message: '⏳ Генерирую PDF...' } }));
    
    try {
      const response = await fetch('http://localhost:3006/chat/generate-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentType,
          content,
          userData
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${documentType.toLowerCase()}_test.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setResults(prev => ({ 
          ...prev, 
          [testId]: { status: 'success', message: '✅ DOCX успешно создан и скачан!' } 
        }));
      } else {
        const errorText = await response.text();
        setResults(prev => ({ 
          ...prev, 
          [testId]: { status: 'error', message: `❌ Ошибка: ${errorText}` } 
        }));
      }
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        [testId]: { status: 'error', message: `❌ Ошибка: ${error.message}` } 
      }));
    }
  };

  const testContractWithEmoji = () => {
    const content = `ДОГОВОР КУПЛИ-ПРОДАЖИ КВАРТИРЫ 📄🔍⚠️✅❌🏠💼

Конечно, давайте создадим договор купли-продажи дома! Для этого мне понадобятся некоторые данные, но если их нет, я оставлю поля для заполнения. Вот примерный шаблон:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Продавец обязуется передать в собственность Покупателя квартиру.

📄 Хотите скачать PDF версию? Нажмите кнопку 'Скачать PDF' ниже!
Документ готов для печати и подачи в официальные инстанции.`;

    const userData = {
      sellerName: "Иванов Иван Иванович",
      buyerName: "Петров Петр Петрович",
      sellerPassport: "1234 567890",
      buyerPassport: "5678 123456",
      sellerAddress: "г. Москва, ул. Продавца, д. 1",
      buyerAddress: "г. Москва, ул. Покупателя, д. 2"
    };

    generatePDF("Договор", content, userData, "test1");
  };

  const testComplaintWithBrackets = () => {
    const content = `ЖАЛОБА на постановление по делу об административном правонарушении

{Незакрытая скобка в тексте
**Жирный текст** с форматированием

📄 Хотите скачать PDF версию? Нажмите кнопку "Скачать PDF" ниже!
Документ готов для печати и подачи в официальные инстанции.`;

    const userData = {
      fullName: "Сидоров Сидор Сидорович",
      passport: "4321 098765",
      address: "г. Москва, ул. Жалобщика, д. 3",
      phone: "+7 (999) 987-65-43"
    };

    generatePDF("Жалоба", content, userData, "test2");
  };

  const testApplicationWithExtraText = () => {
    const content = `ЗАЯВЛЕНИЕ в суд

Конечно, давайте создадим заявление! Для этого мне понадобятся некоторые данные, но если их нет, я оставлю поля для заполнения. Вот примерный шаблон:

1. Вводная часть
2. Основная часть
3. Заключение

Если нужны какие-то уточнения или дополнительные пункты, дайте знать! 🏠💼`;

    const userData = {
      fullName: "Козлов Козел Козлович",
      passport: "5555 111111",
      address: "г. Москва, ул. Заявителя, д. 4",
      phone: "+7 (999) 555-55-55"
    };

    generatePDF("Заявление", content, userData, "test3");
  };

  const testSimpleContract = () => {
    const content = `ДОГОВОР КУПЛИ-ПРОДАЖИ КВАРТИРЫ

1. ПРЕДМЕТ ДОГОВОРА
1.1. Продавец обязуется передать в собственность Покупателя квартиру.

2. ЦЕНА ДОГОВОРА
2.1. Цена квартиры составляет 5 000 000 (пять миллионов) рублей.

3. ПРАВА И ОБЯЗАННОСТИ СТОРОН
3.1. Продавец обязуется передать квартиру в состоянии, пригодном для проживания.
3.2. Покупатель обязуется оплатить стоимость квартиры в полном размере.`;

    const userData = {
      sellerName: "Чистый Продавец",
      buyerName: "Чистый Покупатель",
      sellerPassport: "1111 222222",
      buyerPassport: "3333 444444",
      sellerAddress: "г. Москва, ул. Чистая, д. 1",
      buyerAddress: "г. Москва, ул. Чистая, д. 2"
    };

    generatePDF("Договор", content, userData, "test4");
  };

  const getResultClass = (testId) => {
    const result = results[testId];
    if (!result) return '';
    switch (result.status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'loading': return 'loading';
      default: return '';
    }
  };

  const getResultMessage = (testId) => {
    return results[testId]?.message || '';
  };

  return (
    <div className="test-pdf-container">
      <div className="test-pdf-content">
        <h1>🧪 Тест генерации DOCX документов</h1>
        
        <div className="test-section">
          <h3>Тест 1: Договор с эмодзи и специальными символами</h3>
          <p>Содержимое с эмодзи: 📄🔍⚠️✅❌🏠💼 и специальными символами</p>
          <button onClick={testContractWithEmoji}>Создать договор с эмодзи</button>
          <div className={`result ${getResultClass('test1')}`}>
            {getResultMessage('test1')}
          </div>
        </div>

        <div className="test-section">
          <h3>Тест 2: Жалоба с несбалансированными скобками</h3>
          <p>Содержимое с проблемными символами: {'{незакрытая скобка'}</p>
          <button onClick={testComplaintWithBrackets}>Создать жалобу с скобками</button>
          <div className={`result ${getResultClass('test2')}`}>
            {getResultMessage('test2')}
          </div>
        </div>

        <div className="test-section">
          <h3>Тест 3: Заявление с лишним текстом</h3>
          <p>Содержимое с лишним текстом о скачивании PDF</p>
          <button onClick={testApplicationWithExtraText}>Создать заявление с лишним текстом</button>
          <div className={`result ${getResultClass('test3')}`}>
            {getResultMessage('test3')}
          </div>
        </div>

        <div className="test-section">
          <h3>Тест 4: Простой договор</h3>
          <p>Чистое содержимое без проблемных символов</p>
          <button onClick={testSimpleContract}>Создать простой договор</button>
          <div className={`result ${getResultClass('test4')}`}>
            {getResultMessage('test4')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPDF; 