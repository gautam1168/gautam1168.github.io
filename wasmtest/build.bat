clang++ -g --target=wasm32 -nostartfiles --no-standard-libraries -Wl,--import-memory -Wl,--export-all -Wl,--no-entry -o recursive.wasm recursive.cpp
