[private]
default:
  @just --list

generate-ast-ts-types:
	bunx json-schema-to-typescript -i ast/schemas/program.json -o ast/ts/types.d.ts --cwd=ast/schemas --additionalProperties=false

test:
	bun test

run AST:
	@./interpreter/main.ts {{AST}}
