#include "platforms.h"
#include "stdincludes.h"
#include "..\constants.h"
#include <Windows.h>
#include <WinSock2.h>

int windows() {
    
    // Initializing listener socket
    ADDRINFOA addr, *aux;
    SOCKET listener = INVALID_SOCKET;

    ZeroMemory(&addr, sizeof(addr));
    addr.ai_family = AF_INET;
    addr.ai_socktype = SOCK_STREAM;
    addr.ai_protocol = IPPROTO_TCP;
    addr.ai_flags = AI_PASSIVE;
    int r = getaddrinfo(NULL, PORT, &addr, &aux);
    if (r != 0) {
        printf("Port not available on any address! Exiting...\n");
        WSACleanup();
        return 1;
    }

    listener = socket(aux->ai_family, aux->ai_socktype, aux->ai_protocol);
    if (listener = INVALID_SOCKET) {
        printf("Socket creation failed! Exiting...\n");
        freeaddrinfo(aux);
        WSACleanup();
        return 2;
    }

    r = bind(, );

}