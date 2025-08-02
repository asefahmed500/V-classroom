#!/bin/bash

echo "🔍 TypeScript Type Check"
echo "======================="

# Run TypeScript compiler check
echo "Running tsc --noEmit..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ No TypeScript errors found!"
else
    echo "❌ TypeScript errors detected. Please fix them before building."
    exit 1
fi

# Run ESLint
echo ""
echo "Running ESLint..."
npx next lint

if [ $? -eq 0 ]; then
    echo "✅ No linting errors found!"
else
    echo "⚠️ Linting warnings/errors detected."
fi

echo ""
echo "🎯 Type check complete!"
