#! /bin/bash

ProgramFolder="./lib"
CodeFolder="./src"

emcc -lembind $CodeFolder/Matcher.cpp -o $ProgramFolder/Matcher.js -O2 -s ALLOW_MEMORY_GROWTH -s EXPORT_ES6=1 -s MODULARIZE=1 --embind-emit-tsd Matcher.d.ts
