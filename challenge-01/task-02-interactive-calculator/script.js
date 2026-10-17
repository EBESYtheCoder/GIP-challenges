const expressionText = document.querySelector('#expression');
const resultText = document.querySelector('#result');
const buttons = document.querySelector('.buttons');

let expression = '';
let answer = '0';

function isOperator(value) {
  return ['+', '-', '×', '÷'].includes(value);
}

function showDisplay() {
  expressionText.textContent = expression || '0';
  resultText.textContent = answer;
}

function addValue(value) {
  const lastCharacter = expression.at(-1);

  if (isOperator(value)) {
    if (!expression && value !== '-') return;
    if (isOperator(lastCharacter)) {
      expression = expression.slice(0, -1) + value;
      showDisplay();
      return;
    }
  }

  if (value === '.') {
    const currentNumber = expression.split(/[+\-×÷]/).at(-1);
    if (currentNumber.includes('.')) return;
    if (!currentNumber) expression += '0';
  }

  expression += value;
  showDisplay();
}

function calculate() {
  if (!expression || isOperator(expression.at(-1))) return;

  const numbers = expression.split(/[+\-×÷]/).map(Number);
  const operators = expression.match(/[+\-×÷]/g) || [];

  // Multiplication and division are calculated first.
  for (let index = 0; index < operators.length;) {
    if (operators[index] === '×' || operators[index] === '÷') {
      const value = operators[index] === '×'
        ? numbers[index] * numbers[index + 1]
        : numbers[index] / numbers[index + 1];
      numbers.splice(index, 2, value);
      operators.splice(index, 1);
    } else {
      index += 1;
    }
  }

  // Only addition and subtraction remain.
  let total = numbers[0];
  operators.forEach((operator, index) => {
    total = operator === '+' ? total + numbers[index + 1] : total - numbers[index + 1];
  });

  answer = Number.isFinite(total) ? String(Number(total.toFixed(10))) : 'Error';
  expression = answer === 'Error' ? '' : answer;
  showDisplay();
}

function runAction(action) {
  if (action === 'clear') {
    expression = '';
    answer = '0';
    showDisplay();
  } else if (action === 'delete') {
    expression = expression.slice(0, -1);
    showDisplay();
  } else if (action === 'equals') {
    calculate();
  }
}

buttons.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.value) addValue(button.dataset.value);
  if (button.dataset.action) runAction(button.dataset.action);
});

document.addEventListener('keydown', event => {
  const keyValues = { '*': '×', '/': '÷' };
  const value = keyValues[event.key] || event.key;

  if (/^[0-9.]$/.test(value) || isOperator(value)) {
    event.preventDefault();
    addValue(value);
  } else if (event.key === 'Enter' || event.key === '=') {
    event.preventDefault();
    calculate();
  } else if (event.key === 'Backspace') {
    event.preventDefault();
    runAction('delete');
  } else if (event.key === 'Escape') {
    event.preventDefault();
    runAction('clear');
  }
});

showDisplay();
