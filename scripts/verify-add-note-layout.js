const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'src', 'screens', 'AddTransactionScreen.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  !source.includes('marginBottom: keyboardHeight'),
  'Add note layout must not add keyboardHeight margin; Android adjustResize already resizes the viewport.'
);

assert(
  !source.includes('keyboardBottomOffset') && !source.includes('setKeyboardBottomOffset'),
  'Add note layout should not track keyboard overlap manually; the bottom panel must stay in normal layout to avoid jumping.'
);

assert(
  !source.includes('styles.bottomSectionFloating') && !source.includes('bottomSectionFloating'),
  'Bottom note panel should not switch to absolute positioning while focused.'
);

assert(
  source.includes('noteInputRef.current?.blur()') && source.includes('onSubmitEditing={dismissNote}'),
  'Dismissing notes should explicitly blur the TextInput, including the keyboard done action.'
);

assert(
  source.includes('calculator-outline') && source.includes('styles.noteDoneBtn'),
  'Focused note mode should provide a visible button to return to the numeric keyboard.'
);
