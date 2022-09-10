#!/bin/bash
mkdir -p trans
cd contracts
FILES=$(find -type f -name '*.sol')
for i in $FILES
do
  echo "Rewriting $i..."
  filename=$(basename -- "$i")
  node ../src/rewriter.js < "$i" > "../trans/${filename}"
done
