@REM clang++ -g --target=wasm32 -mbulk-memory -nostartfiles --no-standard-libraries -Wl,--import-memory -Wl,--export-all -Wl,--no-entry -o sim8086.wasm sim8086.cpp

REM clang++ -g --target=wasm32 -mbulk-memory -nostartfiles --no-standard-libraries -Wl,--import-memory -Wl,--export-all -Wl,--no-entry -Wl,--allow-undefined -o generate.wasm generate.cpp

REM clang++ -g parse.cpp -o parse.exe

REM clang++ -g --target=wasm32 -mbulk-memory -nostartfiles --no-standard-libraries -Wl,--import-memory -Wl,--export-all -Wl,--no-entry -Wl,--allow-undefined -o generate.wasm generate.cpp

clang++ -g native_haversine.cpp -o prog.exe
