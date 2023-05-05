bits 16

mov bp, 64*4
mov ax, 1
mov bx, 2
;push bx
;push ax
call my_function
;result
pop ax
;ignore restored values
pop bx
pop bx

my_function:
add ax, bx
mov cx, ax
ret

; Initialize
;add bp, 1300*4    ;x = 20, y = 20 -> (64 * y + x) = 1300
;mov word [bp + 0], 0
;mov word [bp + 1], 0
;mov word [bp + 2], 0
;mov word [bp + 3], 255
;add bp, 4
;
;mov word [bp + 0], 0
;mov word [bp + 1], 0
;mov word [bp + 2], 0
;mov word [bp + 3], 255
;add bp, 4
;
;mov word [bp + 0], 0
;mov word [bp + 1], 0
;mov word [bp + 2], 0
;mov word [bp + 3], 255
;add bp, 4
;
;mov dx, 0
;y_loop_start:
;	
;	mov cx, 0
;	x_loop_start:
;    jmp calc_numneighbours
;    pop dx ;number of neighbours
;
;    cmp dx, 0
;		; Fill pixel
;		mov word [bp + 0], 0 ; Red
;		mov word [bp + 1], 0 ; Red
;		mov word [bp + 2], 0 ; Blue
;		mov byte [bp + 3], 0 ; Alpha
;    jmp continue_loop
;
;    cmp dx, 1
;    mov word [bp + 0], 0 ; Red
;		mov word [bp + 1], 0 ; Red
;		mov word [bp + 2], 0 ; Blue
;		mov byte [bp + 3], 0 ; Alpha
;    jmp continue_loop
;
;    cmp dx, 2
;		; Fill pixel
;		mov word [bp + 0], 0 ; Red
;		mov word [bp + 1], 0 ; Red
;		mov word [bp + 2], 0 ; Blue
;		mov byte [bp + 3], 0 ; Alpha
;    jmp continue_loop
;
;    cmp dx, 3
;    mov word [bp + 0], 0 ; Red
;		mov word [bp + 1], 0 ; Red
;		mov word [bp + 2], 0 ; Blue
;		mov byte [bp + 3], 0 ; Alpha
;    jmp continue_loop
;			
;    continue_loop:
;		; Advance pixel location
;		add bp, 4
;			
;		; Advance X coordinate and loop
;		add cx, 1
;		cmp cx, 64
;		jnz x_loop_start
;	
;	; Advance Y coordinate and loop
;	add dx, 1
;	cmp dx, 64
;	jnz y_loop_start
;
;calc_numneighbours: ; will read x, y from stack
;  mov ax, 0
;  mov bx, [sp]
;  mov cx, [sp]
;  
;  push <currentaddress>
;  push cx - 1
;  push sp
;  jmp calc_linearoffset
;  pop bx ; get number of neighbours
;  add ax, bx
;
;  push <currentaddress>
;  push cx - 1
;  push bx - 1
;  jmp calc_linearoffset
;  pop bx
;  add ax, bx
;
;  push <currentaddress>
;  push cx - 1
;  push sp
;  jmp calc_linearoffset
;  pop bx ; get number of neighbours
;  add ax, bx
;
;  push <currentaddress>
;  push cx - 1
;  push bx - 1
;  jmp calc_linearoffset
;  pop bx
;  add ax, bxush <currentaddress>
;  push cx - 1
;  push sp
;  jmp calc_linearoffset
;  pop bx ; get number of neighbours
;  add ax, bx
;
;  push <currentaddress>
;  push cx - 1
;  push bx - 1
;  jmp calc_linearoffset
;  pop bx
;  add ax, bx
;
;  pop dx ; address of caller
;  push ax ; number of neighbours
;  jmp [dx]
;
;
;calc_linearoffset: ; will read x, y from stack 
;  mov bx, [sp] ; read x from stack
;  mov ax, bx
;  mul word 4
;  mov bx, ax
;
;  mov cx, [sp] ; read y from stack
;  mov ax, cx
;  mul word 64 * 4  ; calc index of 1st right neighbour
;  
;  add ax, bx   ; assume that result is always 16bit, not checking flag my god
;  
;  pop cx
;  push ax
;  jmp [cx]
;
