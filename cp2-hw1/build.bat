@REM clang++ -g --target=wasm32 -mbulk-memory -nostartfiles --no-standard-libraries -Wl,--import-memory -Wl,--export-all -Wl,--no-entry -o sim8086.wasm sim8086.cpp

clang++ -g --target=wasm32 -mbulk-memory -nostartfiles --no-standard-libraries -Wl,--import-memory -Wl,--export-all -Wl,--no-entry -Wl,--allow-undefined -o generate.wasm generate.cpp

