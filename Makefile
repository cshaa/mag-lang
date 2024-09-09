.PHONY: ast-ts run test

ast-ts:
	bunx json-schema-to-typescript -i ast/schemas/program.json -o ast/ts/types.d.ts --cwd=ast/schemas --additionalProperties=false

test:
	bun test

run:
	@./interpreter/main.ts $(ast)
