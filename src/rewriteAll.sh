#!/bin/bash
mkdir -p trans
cd contracts
for i in *.sol
do
  echo "Rewriting $i..."
  node ../src/rewriter.js < "$i" > "../trans/$i"
done
