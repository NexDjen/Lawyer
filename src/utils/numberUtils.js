// Утилиты форматирования чисел и валют

export const formatNumberRu = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('ru-RU').format(num);
};

export const formatCurrencyUSD = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(num);
};

