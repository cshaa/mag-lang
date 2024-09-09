#!/usr/bin/env bun
import { assertNever, yeet } from "@typek/typek";
import { args } from "@typek/clap";
import type { Expression, Program } from "../ast/ts/types.d.ts";
const isKeyOf = <T extends object>(
  x: string | number | symbol,
  obj: T
): x is keyof T => x in obj;

const std = {
  println: (...values: any[]) => console.log(...values),
  String: {
    is_a: (x: unknown): x is string => typeof x === "string",
  },
  f64: {
    is_a: (x: unknown): x is number => typeof x === "number",
  },
};

export function evaluateExpression(
  scope: Map<string, any>,
  expr: Expression
): any {
  if ("string-literal" in expr) return expr["string-literal"];
  if ("numeric-literal" in expr) return Number(expr["numeric-literal"]);
  if ("identifier" in expr) {
    const id = expr.identifier;
    if (!scope.has(id)) yeet(`Identifier ${id} not found in the scope.`);
    return scope.get(id);
  }
  if ("call" in expr) {
    const fn = evaluateExpression(scope, expr.call.function);
    if (typeof fn !== "function") yeet(`Value not callable: ${fn}`);
    const args = expr.call.arguments.map((arg) =>
      evaluateExpression(scope, arg)
    );
    return fn(...args);
  }
  if ("binary-operation" in expr) {
    const { op } = expr["binary-operation"];
    const lhs = evaluateExpression(scope, expr["binary-operation"].lhs);
    const rhs = evaluateExpression(scope, expr["binary-operation"].rhs);
    if (!std.f64.is_a(lhs)) yeet(`Value is not a number: ${lhs}`);
    if (!std.f64.is_a(rhs)) yeet(`Value is not a number: ${rhs}`);
    switch (op) {
      case "+":
        return lhs + rhs;
      case "-":
        return lhs - rhs;
      case "*":
        return lhs * rhs;
      case "/":
        return lhs / rhs;
    }
  }
  assertNever(expr);
}

export async function interpretProgram(
  program: Program,
  lib: typeof std = std
) {
  const scope = new Map<string, any>();
  const parentScope = scope;

  for (const { path, symbols } of program.imports ?? []) {
    if (path !== "std") yeet(`Could not find library ${path}`);
    for (const symbol of symbols) {
      if (!isKeyOf(symbol, lib)) yeet(`Unknown import ${symbol} from std.`);
      scope.set(symbol, lib[symbol]);
    }
  }

  for (const { function: fn } of program.declarations) {
    parentScope.set(fn.name, (...args: any[]) => {
      const scope = new Map(parentScope);

      for (const arg of fn.arguments) {
        const value = args.shift();
        if (arg.type && !evaluateExpression(scope, arg.type).is_a(value))
          yeet(`Value ${value} is not an instance of the required type.`);
        scope.set(arg.identifier, value);
      }

      const returnType = fn.returnType
        ? evaluateExpression(scope, fn.returnType)
        : undefined;

      const checkReturnType: (x: any) => any = returnType
        ? (x) =>
            returnType.is_a(x)
              ? x
              : yeet(`Value ${x} is not an instance of the required type.`)
        : (x) => x;

      for (const stmt of fn.body) {
        if ("declaration" in stmt) {
          const { identifier } = stmt.declaration;
          const value = stmt.declaration.value
            ? evaluateExpression(scope, stmt.declaration.value)
            : undefined;

          if (
            stmt.declaration.type &&
            !evaluateExpression(scope, stmt.declaration.type).is_a(value)
          ) {
            yeet(`Value ${value} is not an instance of the required type.`);
          }

          scope.set(identifier, value);
          continue;
        }
        if ("expression" in stmt) {
          evaluateExpression(scope, stmt.expression);
          continue;
        }
        if ("return" in stmt) {
          return checkReturnType(evaluateExpression(scope, stmt.return));
        }
        assertNever(stmt);
      }
    });
  }

  return scope;
}

export async function interpretProgramFromFile(
  path: string,
  lib: typeof std = std
) {
  const program: Program = await Bun.file(path).json();
  return interpretProgram(program, lib);
}

if (import.meta.main) {
  const scope = await interpretProgramFromFile(args.raw[0]);
  scope.get("main")!();
}
