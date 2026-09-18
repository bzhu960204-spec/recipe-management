# Ingredient quick import (flat text)

Paste one ingredient per line into the recipe editor's Ingredients tab. Parsed rows are
appended to the current list.

## Lines

- `# Section name` — a section header. It applies to every line below it until the next header.
- Blank lines are ignored.
- Anything else is one ingredient.

## An ingredient line

    <amount><unit> <name> (note) ?

Both orders parse, and may be mixed:

- Amount first: `1/2 cup flour`
- Name first:   `flour 1/2 cup`

The amount always starts with a digit or a fraction, so the split is unambiguous.

### Amount

- Whole `500`, decimal `0.5`, fraction `1/2`, glyph `½`, mixed `1 1/2`.
- Ranges: `1-2`, `1~2`.
- No number at all → "to taste" (the amount is left empty), e.g. `salt`.

### Unit

The token glued to or spaced after the amount: `g`, `cup`, `tbsp`, `杯`, `小勺`.
`1/2杯` and `1/2 cup` both work.

### Note and flags

- `(...)` or `（...）` → the note.
- A trailing `?` → mark the ingredient optional.

## Example

    # Fish
    500g frozen fish fillet (thawed, cut into strips)
    salt

    # Coating
    1/2 cup wheat starch
    1/2 cup corn starch
    1 tsp baking powder
    1/4 tsp baking soda
    1~2 tsp chili powder ?
