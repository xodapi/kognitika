const NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

function tokenize(expression: string) {
  const compact = expression.replace(/\s+/g, '');
  if (!compact || !/^[\d.+\-*/]+$/.test(compact)) throw new Error('Invalid expression');

  const tokens = compact.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+\-*/]/g);
  if (!tokens || tokens.join('') !== compact) throw new Error('Invalid expression');
  return tokens;
}

export function evaluateArithmetic(expression: string) {
  const tokens = tokenize(expression);
  const values: number[] = [];
  const operators: string[] = [];
  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

  const apply = () => {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();
    if (!operator || left === undefined || right === undefined) throw new Error('Invalid expression');

    const result = operator === '+' ? left + right
      : operator === '-' ? left - right
      : operator === '*' ? left * right
      : left / right;
    if (!Number.isFinite(result)) throw new Error('Invalid result');
    values.push(result);
  };

  let expectNumber = true;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (expectNumber) {
      if ((token === '+' || token === '-') && NUMBER.test(tokens[index + 1] || '')) {
        values.push(Number(`${token}${tokens[index + 1]}`));
        index += 1;
      } else if (NUMBER.test(token)) {
        values.push(Number(token));
      } else {
        throw new Error('Invalid expression');
      }
      expectNumber = false;
      continue;
    }

    if (!(token in precedence)) throw new Error('Invalid expression');
    while (operators.length && precedence[operators.at(-1)!] >= precedence[token]) apply();
    operators.push(token);
    expectNumber = true;
  }

  if (expectNumber) throw new Error('Invalid expression');
  while (operators.length) apply();
  if (values.length !== 1 || !Number.isFinite(values[0])) throw new Error('Invalid expression');
  return Math.round((values[0] + Number.EPSILON) * 100) / 100;
}
