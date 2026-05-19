type ParsedExpression =
  | {
      error: null;
      value: number;
    }
  | {
      error: string;
      value: null;
    };

function precedence(operator: string) {
  return operator === '+' || operator === '-' ? 1 : 2;
}

function applyOperator(left: number, right: number, operator: string): ParsedExpression {
  if (operator === '+') {
    return { error: null, value: left + right };
  }

  if (operator === '-') {
    return { error: null, value: left - right };
  }

  if (operator === '*') {
    return { error: null, value: left * right };
  }

  if (operator === '/') {
    if (right === 0) {
      return { error: 'Cannot divide by zero.', value: null };
    }

    return { error: null, value: left / right };
  }

  return { error: 'Unsupported operator.', value: null };
}

export function evaluateExpression(input: string): ParsedExpression {
  const trimmed = input.replace(/\s+/g, '');

  if (!trimmed) {
    return { error: null, value: 0 };
  }

  if (!/^[-+*/.\d]+$/.test(trimmed)) {
    return { error: 'Use only numbers and + - * /.', value: null };
  }

  const values: number[] = [];
  const operators: string[] = [];
  let index = 0;

  const collapse = (): ParsedExpression => {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();

    if (!operator || right === undefined || left === undefined) {
      return { error: 'Invalid expression.', value: null };
    }

    const result = applyOperator(left, right, operator);
    if (result.error) {
      return result;
    }

    const numericValue = result.value;
    if (numericValue === null) {
      return { error: 'Invalid expression.', value: null };
    }

    values.push(numericValue);
    return { error: null, value: numericValue };
  };

  while (index < trimmed.length) {
    const character = trimmed[index];
    const isUnaryMinus =
      character === '-' &&
      (index === 0 || ['+', '-', '*', '/'].includes(trimmed[index - 1] ?? ''));

    if (/\d|\./.test(character) || isUnaryMinus) {
      let token = character;
      index += 1;

      while (index < trimmed.length && /[\d.]/.test(trimmed[index])) {
        token += trimmed[index];
        index += 1;
      }

      if (token === '-' || token === '.' || token === '-.') {
        return { error: 'Invalid number.', value: null };
      }

      const parsed = Number(token);
      if (!Number.isFinite(parsed)) {
        return { error: 'Invalid number.', value: null };
      }

      values.push(parsed);
      continue;
    }

    if (!['+', '-', '*', '/'].includes(character)) {
      return { error: 'Unsupported expression.', value: null };
    }

    while (
      operators.length > 0 &&
      precedence(operators[operators.length - 1]) >= precedence(character)
    ) {
      const result = collapse();
      if (result.error) {
        return result;
      }
    }

    operators.push(character);
    index += 1;
  }

  while (operators.length > 0) {
    const result = collapse();
    if (result.error) {
      return result;
    }
  }

  if (values.length !== 1 || !Number.isFinite(values[0])) {
    return { error: 'Invalid expression.', value: null };
  }

  return { error: null, value: values[0] };
}
