/**
 * Safe, deterministic expression evaluator for quiz calculation verification.
 *
 * Supports only: non-negative integers/decimals, +, -, *, /, parentheses, and
 * unary minus. Everything else (function calls, variables, exponentiation,
 * bitwise ops, etc.) is rejected and returns null. No eval(), no Function
 * constructor, no regex-based execution — a small recursive-descent parser
 * with a strict allowlist of characters.
 *
 * Returns { ok: true, value: number } on success, or { ok: false } on any
 * invalid/unsafe input. Division by zero returns { ok: false }.
 */
export interface EvalResult {
  ok: true;
  value: number;
}
export interface EvalError {
  ok: false;
}

type Token =
  | { type: 'NUMBER'; value: number }
  | { type: 'PLUS' }
  | { type: 'MINUS' }
  | { type: 'STAR' }
  | { type: 'SLASH' }
  | { type: 'LPAREN' }
  | { type: 'RPAREN' }
  | { type: 'EOF' };

const ALLOWED_CHARS = new Set('0123456789.+-*/() ');

/** Tokenize the input string. Returns null if any disallowed character is present. */
function tokenize(input: string): Token[] | null {
  for (let i = 0; i < input.length; i++) {
    if (!ALLOWED_CHARS.has(input[i])) {
      return null;
    }
  }

  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === ' ') { i++; continue; }
    if (ch === '+') { tokens.push({ type: 'PLUS' }); i++; continue; }
    if (ch === '-') { tokens.push({ type: 'MINUS' }); i++; continue; }
    if (ch === '*') { tokens.push({ type: 'STAR' }); i++; continue; }
    if (ch === '/') { tokens.push({ type: 'SLASH' }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }
    if (ch >= '0' && ch <= '9') {
      let num = '';
      let dotSeen = false;
      while (i < input.length && (input[i] >= '0' && input[i] <= '9' || (input[i] === '.' && !dotSeen))) {
        if (input[i] === '.') dotSeen = true;
        num += input[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(num) });
      continue;
    }
    // Should not reach here given the allowed-chars check, but be safe.
    return null;
  }
  tokens.push({ type: 'EOF' });
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const tok = this.tokens[this.pos];
    if (this.pos < this.tokens.length - 1) this.pos++;
    return tok;
  }

  private expect(type: Token['type']): boolean {
    return this.peek().type === type;
  }

  parse(): number | null {
    const value = this.expression();
    if (value === null) return null;
    if (!this.expect('EOF')) return null;
    return value;
  }

  private expression(): number | null {
    let left = this.term();
    if (left === null) return null;
    while (this.expect('PLUS') || this.expect('MINUS')) {
      const op = this.advance().type;
      const right = this.term();
      if (right === null) return null;
      left = op === 'PLUS' ? left + right : left - right;
    }
    return left;
  }

  private term(): number | null {
    let left = this.factor();
    if (left === null) return null;
    while (this.expect('STAR') || this.expect('SLASH')) {
      const op = this.advance().type;
      const right = this.factor();
      if (right === null) return null;
      if (op === 'SLASH') {
        if (right === 0) return null; // division by zero
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  private factor(): number | null {
    const tok = this.peek();
    if (tok.type === 'NUMBER') {
      this.advance();
      return tok.value;
    }
    if (tok.type === 'LPAREN') {
      this.advance();
      const value = this.expression();
      if (value === null) return null;
      if (!this.expect('RPAREN')) return null;
      this.advance();
      return value;
    }
    if (tok.type === 'MINUS') {
      // Unary minus: -( expression )
      this.advance();
      const value = this.factor();
      if (value === null) return null;
      return -value;
    }
    return null;
  }
}

/**
 * Evaluate a simple arithmetic expression safely and deterministically.
 *
 * @param input - The expression string (e.g. "2 + 3 * (4 - 1)").
 * @returns { ok: true, value } if the expression is valid and evaluable,
 *          { ok: false } otherwise (invalid chars, division by zero,
 *          malformed syntax, empty input).
 */
export function safeEval(input: string): EvalResult | EvalError {
  if (input == null || input.trim().length === 0) {
    return { ok: false };
  }
  const tokens = tokenize(input);
  if (tokens === null) return { ok: false };
  const parser = new Parser(tokens);
  const value = parser.parse();
  if (value === null || !Number.isFinite(value)) return { ok: false };
  return { ok: true, value };
}
